// ===================================
// History Page
// ===================================

function setupHistory() {
  elements.clearHistoryBtn.addEventListener('click', clearHistory);
}

function renderHistory() {
  const count = appData.history.length;
  elements.historyStats.innerHTML = `<span>${count} ${count === 1 ? 'entry' : 'entries'}</span>`;
  
  if (count === 0) {
    elements.historyList.innerHTML = '<p class="placeholder-text">No commands generated yet</p>';
    return;
  }
  
  elements.historyList.innerHTML = appData.history.map(entry => {
    const template = appData.templates.find(t => t.id === entry.templateId);
    const templateName = template ? template.name : '(Deleted template)';
    
    const streamers = entry.streamerIds
      .map(id => appData.streamers.find(s => s.id === id))
      .filter(Boolean);
    
    const commandText = template ? buildCommandFromHistory(entry) : '(Template deleted)';
    
    return `
      <div class="history-item" data-id="${entry.id}">
        <div class="history-item-header">
          <div class="history-item-meta">
            <span class="history-item-date">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              ${formatDateTime(entry.timestamp)}
            </span>
            <span class="history-item-template">${escapeHtml(templateName)}</span>
          </div>
          <div class="history-item-actions">
            <button class="reuse-btn" title="Load into generator">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 4v6h6"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
              Reuse
            </button>
            <button class="copy-history-btn" title="Copy command">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copy
            </button>
          </div>
        </div>
        <div class="history-item-command">${escapeHtml(commandText)}</div>
        <div class="history-item-streamers">
          ${streamers.map(s => `<span class="history-streamer-tag">${escapeHtml(s.name)}</span>`).join('')}
          ${entry.streamerIds.length > streamers.length ? `<span class="history-streamer-tag" style="opacity: 0.5">${entry.streamerIds.length - streamers.length} removed</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  // Add click handlers
  elements.historyList.querySelectorAll('.history-item').forEach(item => {
    const id = item.dataset.id;
    item.querySelector('.reuse-btn').addEventListener('click', () => reuseHistoryEntry(id));
    item.querySelector('.copy-history-btn').addEventListener('click', () => copyHistoryEntry(id));
  });
}

function buildCommandFromHistory(entry) {
  const template = appData.templates.find(t => t.id === entry.templateId);
  if (!template) return '';
  
  const langConfig = languages[entry.language] || languages.de;
  
  const streamerNames = entry.streamerIds
    .map(id => appData.streamers.find(s => s.id === id))
    .filter(Boolean)
    .map(s => `@${s.name}`);
  
  let streamerStr = '';
  if (streamerNames.length === 0) {
    streamerStr = '';
  } else if (streamerNames.length === 1) {
    streamerStr = streamerNames[0];
  } else if (streamerNames.length === 2) {
    streamerStr = `${streamerNames[0]} ${langConfig.conjunction} ${streamerNames[1]}`;
  } else {
    const last = streamerNames.pop();
    const comma = langConfig.oxfordComma ? ',' : '';
    streamerStr = `${streamerNames.join(', ')}${comma} ${langConfig.conjunction} ${last}`;
  }
  
  let cmd = `!${template.command}`;
  if (template.firstArg) cmd += ` ${template.firstArg}`;
  cmd += ` ${template.text.replace(/\{streamer\}/gi, streamerStr)}`;
  
  return cmd;
}

function reuseHistoryEntry(id) {
  const entry = appData.history.find(h => h.id === id);
  if (!entry) return;
  
  if (appData.templates.find(t => t.id === entry.templateId)) {
    elements.templateSelect.value = entry.templateId;
    updateTemplatePreview();
  }
  
  setLanguage(entry.language);
  
  selectedStreamers.clear();
  entry.streamerIds.forEach(id => {
    if (appData.streamers.find(s => s.id === id)) {
      selectedStreamers.add(id);
    }
  });
  
  updateStreamerSelectList();
  switchView('generator');
}

async function copyHistoryEntry(id) {
  const entry = appData.history.find(h => h.id === id);
  if (!entry) return;
  
  const command = buildCommandFromHistory(entry);
  await window.electronAPI.copyToClipboard(command);
  showToast('Command copied!');
}

async function clearHistory() {
  if (appData.history.length === 0) return;
  
  appData.history = [];
  await saveData();
  renderHistory();
  showToast('History cleared');
}

