// ===================================
// Generator Page
// ===================================

function setupGenerator() {
  elements.templateSelect.addEventListener('change', updateTemplatePreview);
  elements.copyCommandBtn.addEventListener('click', copyCommand);
  elements.copyTextBtn.addEventListener('click', copyText);
  elements.generateBtn.addEventListener('click', generateCommand);
  
  // Language toggle
  elements.languageToggle.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });
  
  // Clear selection button
  elements.clearSelectionBtn.addEventListener('click', clearStreamerSelection);
  
  // Date/time format changes
  elements.dateFormat.addEventListener('change', updateDateTimeFormat);
  elements.timeFormat.addEventListener('change', updateDateTimeFormat);
}

function clearStreamerSelection() {
  selectedStreamers.clear();
  updateStreamerSelectList();
  updateSelectionCount();
}

function updateSelectionCount() {
  const count = selectedStreamers.size;
  elements.selectionCount.textContent = `${count} selected`;
}

async function setLanguage(lang) {
  appData.language = lang;
  await saveData();
  updateLanguageToggle();
}

function updateLanguageToggle() {
  elements.languageToggle.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === appData.language);
  });
}

function updateTemplateSelect() {
  const currentValue = elements.templateSelect.value;
  elements.templateSelect.innerHTML = '<option value="">-- Choose a template --</option>';
  
  appData.templates.forEach(template => {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = template.name;
    elements.templateSelect.appendChild(option);
  });
  
  // Restore selection if still valid
  if (appData.templates.find(t => t.id === currentValue)) {
    elements.templateSelect.value = currentValue;
  }
  
  updateTemplatePreview();
}

function updateTemplatePreview() {
  const templateId = elements.templateSelect.value;
  const template = appData.templates.find(t => t.id === templateId);
  
  if (!template) {
    elements.templatePreview.innerHTML = '<p class="placeholder-text">Select a template to see preview</p>';
    return;
  }
  
  const preview = buildCommandPreview(template);
  elements.templatePreview.innerHTML = `
    <div class="preview-label">Command Structure</div>
    <div class="preview-command">${preview}</div>
  `;
}

function buildCommandPreview(template) {
  let html = `<span class="cmd">!${escapeHtml(template.command)}</span>`;
  
  if (template.firstArg) {
    html += ` <span class="arg">${escapeHtml(template.firstArg)}</span>`;
  }
  
  // Highlight placeholder in template text
  const textWithHighlight = escapeHtml(template.text).replace(
    /\{streamer\}/gi,
    '<span class="placeholder">{streamer}</span>'
  );
  html += ` ${textWithHighlight}`;
  
  return html;
}

function updateStreamerSelectList() {
  if (appData.streamers.length === 0) {
    elements.streamerSelectList.innerHTML = '<p class="placeholder-text">No streamers configured yet</p>';
    elements.groupQuickSelect.style.display = 'none';
    return;
  }
  
  elements.streamerSelectList.innerHTML = appData.streamers.map(streamer => `
    <div class="streamer-chip ${selectedStreamers.has(streamer.id) ? 'selected' : ''}" data-id="${streamer.id}">
      <div class="check">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <span class="name">@${escapeHtml(streamer.name)}</span>
    </div>
  `).join('');
  
  // Add click handlers
  elements.streamerSelectList.querySelectorAll('.streamer-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.id;
      if (selectedStreamers.has(id)) {
        selectedStreamers.delete(id);
        chip.classList.remove('selected');
      } else {
        selectedStreamers.add(id);
        chip.classList.add('selected');
      }
      updateSelectionCount();
    });
  });
  
  // Update group quick select
  updateGroupQuickSelect();
  updateSelectionCount();
}

function updateGroupQuickSelect() {
  if (appData.groups.length === 0) {
    elements.groupQuickSelect.style.display = 'none';
    return;
  }
  
  elements.groupQuickSelect.style.display = 'block';
  elements.groupButtons.innerHTML = appData.groups.map(group => {
    const memberCount = group.streamerIds.filter(id => 
      appData.streamers.some(s => s.id === id)
    ).length;
    
    return `
      <button class="group-btn" data-group-id="${group.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        ${escapeHtml(group.name)}
        <span class="group-count">${memberCount}</span>
      </button>
    `;
  }).join('');
  
  // Add click handlers
  elements.groupButtons.querySelectorAll('.group-btn').forEach(btn => {
    btn.addEventListener('click', () => selectGroup(btn.dataset.groupId));
  });
}

function selectGroup(groupId) {
  const group = appData.groups.find(g => g.id === groupId);
  if (!group) return;
  
  // Add all group members to selection
  group.streamerIds.forEach(streamerId => {
    if (appData.streamers.some(s => s.id === streamerId)) {
      selectedStreamers.add(streamerId);
    }
  });
  
  // Update UI
  updateStreamerSelectList();
  showToast(`Selected ${group.name}`);
}

async function generateCommand() {
  const templateId = elements.templateSelect.value;
  const template = appData.templates.find(t => t.id === templateId);
  
  if (!template) {
    showToast('Please select a template');
    return;
  }
  
  if (selectedStreamers.size === 0) {
    showToast('Please select at least one streamer');
    return;
  }
  
  const { command, textOnly } = buildCommand(template);
  elements.generatedCommand.textContent = command;
  elements.generatedText.textContent = textOnly;
  elements.copyCommandBtn.disabled = false;
  elements.copyTextBtn.disabled = false;
  
  // Add to history
  const historyEntry = {
    id: generateId(),
    timestamp: Date.now(),
    templateId: template.id,
    streamerIds: Array.from(selectedStreamers),
    language: appData.language
  };
  
  // Add to beginning of history (newest first)
  appData.history.unshift(historyEntry);
  
  // Keep only last 50 entries
  if (appData.history.length > 50) {
    appData.history = appData.history.slice(0, 50);
  }
  
  await saveData();
  renderHistory();
  showToast('Command generated!');
}

function buildCommand(template) {
  let cmd = `!${template.command}`;
  
  if (template.firstArg) {
    cmd += ` ${template.firstArg}`;
  }
  
  // Get selected streamer names
  const streamerNames = Array.from(selectedStreamers)
    .map(id => appData.streamers.find(s => s.id === id))
    .filter(Boolean)
    .map(s => `@${s.name}`);
  
  // Get language settings
  const langConfig = languages[appData.language] || languages.de;
  const conjunction = langConfig.conjunction;
  const useOxfordComma = langConfig.oxfordComma;
  
  // Build streamer string with proper formatting
  let streamerStr = '';
  if (streamerNames.length === 0) {
    streamerStr = '';
  } else if (streamerNames.length === 1) {
    streamerStr = streamerNames[0];
  } else if (streamerNames.length === 2) {
    streamerStr = `${streamerNames[0]} ${conjunction} ${streamerNames[1]}`;
  } else {
    const last = streamerNames.pop();
    const comma = useOxfordComma ? ',' : '';
    streamerStr = `${streamerNames.join(', ')}${comma} ${conjunction} ${last}`;
  }
  
  // Replace placeholder
  let textOnly = template.text.replace(/\{streamer\}/gi, streamerStr);
  
  cmd += ` ${textOnly}`;
  
  // Return both full command and text-only
  return { command: cmd, textOnly: textOnly };
}

async function copyCommand() {
  const command = elements.generatedCommand.textContent;
  await window.electronAPI.copyToClipboard(command);
  showToast('Command copied to clipboard!');
}

async function copyText() {
  const text = elements.generatedText.textContent;
  await window.electronAPI.copyToClipboard(text);
  showToast('Text copied to clipboard!');
}

