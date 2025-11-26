// ===================================
// Twitch Bot Command Manager
// Renderer Process
// ===================================

// App State
let appData = {
  templates: [],
  streamers: [],
  groups: [],
  language: 'de', // Default to German
  settings: {
    twitchClientId: '',
    twitchClientSecret: '',
    theme: 'twitch-dark'
  }
};

// Language configurations
const languages = {
  de: { name: 'Deutsch', conjunction: 'und', oxfordComma: false },
  en: { name: 'English', conjunction: 'and', oxfordComma: true }
};

let selectedStreamers = new Set();
let editingTemplateId = null;
let editingGroupId = null;
let selectedGroupStreamers = new Set();
let searchDebounceTimer = null;
let twitchAuthenticated = false;
let streamerValidationStatus = {}; // { streamerId: 'valid' | 'invalid' | 'unknown' }

// DOM Elements
const elements = {
  // Navigation
  navBtns: document.querySelectorAll('.nav-btn'),
  views: document.querySelectorAll('.view'),
  sidebar: document.getElementById('sidebar'),
  sidebarToggle: document.getElementById('sidebar-toggle'),
  
  // Window controls
  minimizeBtn: document.getElementById('minimize-btn'),
  maximizeBtn: document.getElementById('maximize-btn'),
  closeBtn: document.getElementById('close-btn'),
  
  // Generator
  templateSelect: document.getElementById('template-select'),
  templatePreview: document.getElementById('template-preview'),
  streamerSelectList: document.getElementById('streamer-select-list'),
  generatedCommand: document.getElementById('generated-command'),
  generatedText: document.getElementById('generated-text'),
  copyCommandBtn: document.getElementById('copy-command-btn'),
  copyTextBtn: document.getElementById('copy-text-btn'),
  languageToggle: document.getElementById('language-toggle'),
  
  // Templates
  templateForm: document.getElementById('template-form'),
  templateName: document.getElementById('template-name'),
  templateCommand: document.getElementById('template-command'),
  templateFirstArg: document.getElementById('template-firstarg'),
  templateText: document.getElementById('template-text'),
  clearFormBtn: document.getElementById('clear-form-btn'),
  templatesList: document.getElementById('templates-list'),
  
  // Streamers
  streamerForm: document.getElementById('streamer-form'),
  streamerName: document.getElementById('streamer-name'),
  streamersList: document.getElementById('streamers-list'),
  streamerSearch: document.getElementById('streamer-search'),
  searchResults: document.getElementById('search-results'),
  searchStatus: document.getElementById('search-status'),
  validateStreamersBtn: document.getElementById('validate-streamers-btn'),
  validationStatus: document.getElementById('validation-status'),
  
  // Groups
  groupForm: document.getElementById('group-form'),
  groupName: document.getElementById('group-name'),
  groupStreamerSelect: document.getElementById('group-streamer-select'),
  clearGroupFormBtn: document.getElementById('clear-group-form-btn'),
  groupsList: document.getElementById('groups-list'),
  groupQuickSelect: document.getElementById('group-quick-select'),
  groupButtons: document.getElementById('group-buttons'),
  clearSelectionBtn: document.getElementById('clear-selection-btn'),
  selectionCount: document.getElementById('selection-count'),
  
  // Settings
  twitchSettingsForm: document.getElementById('twitch-settings-form'),
  twitchClientId: document.getElementById('twitch-client-id'),
  twitchClientSecret: document.getElementById('twitch-client-secret'),
  toggleSecret: document.getElementById('toggle-secret'),
  testApiBtn: document.getElementById('test-api-btn'),
  apiStatus: document.getElementById('api-status'),
  twitchDevLink: document.getElementById('twitch-dev-link'),
  themeOptions: document.getElementById('theme-options'),
  customColorPicker: document.getElementById('custom-color-picker'),
  customColorHex: document.getElementById('custom-color-hex'),
  applyCustomColor: document.getElementById('apply-custom-color'),
  customPreview: document.getElementById('custom-preview'),
  
  // Toast
  toast: document.getElementById('toast')
};

// ===================================
// Initialization
// ===================================
async function init() {
  // Load saved data
  appData = await window.electronAPI.loadData();
  
  // Ensure settings object exists (for backwards compatibility)
  if (!appData.settings) {
    appData.settings = {
      twitchClientId: '',
      twitchClientSecret: '',
      theme: 'twitch-dark',
      sidebarCollapsed: false
    };
  }
  if (appData.settings.sidebarCollapsed === undefined) {
    appData.settings.sidebarCollapsed = false;
  }
  if (!appData.groups) {
    appData.groups = [];
  }
  
  // Setup event listeners
  setupNavigation();
  setupWindowControls();
  setupGenerator();
  setupTemplates();
  setupStreamers();
  setupGroups();
  setupSettings();
  
  // Initial render
  renderAll();
  
  // Initialize Twitch API if credentials exist
  if (appData.settings.twitchClientId && appData.settings.twitchClientSecret) {
    initTwitchApi();
  }
}

// ===================================
// Navigation
// ===================================
function setupNavigation() {
  elements.navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.dataset.view;
      switchView(viewId);
    });
  });
  
  // Sidebar toggle
  elements.sidebarToggle.addEventListener('click', toggleSidebar);
}

function toggleSidebar() {
  const isCollapsed = elements.sidebar.classList.toggle('collapsed');
  appData.settings.sidebarCollapsed = isCollapsed;
  saveData();
}

function applySidebarState() {
  if (appData.settings.sidebarCollapsed) {
    elements.sidebar.classList.add('collapsed');
  } else {
    elements.sidebar.classList.remove('collapsed');
  }
}

function switchView(viewId) {
  // Update nav buttons
  elements.navBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewId);
  });
  
  // Update views
  elements.views.forEach(view => {
    view.classList.toggle('active', view.id === `${viewId}-view`);
  });
}

// ===================================
// Window Controls
// ===================================
function setupWindowControls() {
  elements.minimizeBtn.addEventListener('click', () => window.electronAPI.minimize());
  elements.maximizeBtn.addEventListener('click', () => window.electronAPI.maximize());
  elements.closeBtn.addEventListener('click', () => window.electronAPI.close());
}

// ===================================
// Generator
// ===================================
function setupGenerator() {
  elements.templateSelect.addEventListener('change', updateGeneratedCommand);
  elements.copyCommandBtn.addEventListener('click', copyCommand);
  elements.copyTextBtn.addEventListener('click', copyText);
  
  // Language toggle
  elements.languageToggle.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });
  
  // Clear selection button
  elements.clearSelectionBtn.addEventListener('click', clearStreamerSelection);
}

function clearStreamerSelection() {
  selectedStreamers.clear();
  updateStreamerSelectList();
  updateGeneratedCommand();
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
  updateGeneratedCommand();
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
      updateGeneratedCommand();
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
  updateGeneratedCommand();
  showToast(`Selected ${group.name}`);
}

function updateGeneratedCommand() {
  updateTemplatePreview();
  
  const templateId = elements.templateSelect.value;
  const template = appData.templates.find(t => t.id === templateId);
  
  if (!template) {
    elements.generatedCommand.textContent = 'Select a template and streamers to generate command';
    elements.generatedText.textContent = 'Select a template and streamers to generate text';
    elements.copyCommandBtn.disabled = true;
    elements.copyTextBtn.disabled = true;
    return;
  }
  
  const { command, textOnly } = buildCommand(template);
  elements.generatedCommand.textContent = command;
  elements.generatedText.textContent = textOnly;
  elements.copyCommandBtn.disabled = false;
  elements.copyTextBtn.disabled = false;
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

// ===================================
// Templates
// ===================================
function setupTemplates() {
  elements.templateForm.addEventListener('submit', saveTemplate);
  elements.clearFormBtn.addEventListener('click', clearTemplateForm);
}

async function saveTemplate(e) {
  e.preventDefault();
  
  const template = {
    id: editingTemplateId || generateId(),
    name: elements.templateName.value.trim(),
    command: elements.templateCommand.value.trim(),
    firstArg: elements.templateFirstArg.value.trim(),
    text: elements.templateText.value.trim()
  };
  
  if (editingTemplateId) {
    // Update existing
    const index = appData.templates.findIndex(t => t.id === editingTemplateId);
    if (index !== -1) {
      appData.templates[index] = template;
    }
    editingTemplateId = null;
  } else {
    // Add new
    appData.templates.push(template);
  }
  
  await saveData();
  clearTemplateForm();
  renderTemplatesList();
  updateTemplateSelect();
  showToast('Template saved!');
}

function clearTemplateForm() {
  elements.templateForm.reset();
  editingTemplateId = null;
}

function editTemplate(id) {
  const template = appData.templates.find(t => t.id === id);
  if (!template) return;
  
  editingTemplateId = id;
  elements.templateName.value = template.name;
  elements.templateCommand.value = template.command;
  elements.templateFirstArg.value = template.firstArg;
  elements.templateText.value = template.text;
  
  elements.templateName.focus();
}

async function deleteTemplate(id) {
  appData.templates = appData.templates.filter(t => t.id !== id);
  await saveData();
  renderTemplatesList();
  updateTemplateSelect();
  showToast('Template deleted');
}

function renderTemplatesList() {
  if (appData.templates.length === 0) {
    elements.templatesList.innerHTML = '<p class="placeholder-text">No templates created yet</p>';
    return;
  }
  
  elements.templatesList.innerHTML = appData.templates.map(template => {
    const commandPreview = `!${escapeHtml(template.command)}${template.firstArg ? ' ' + escapeHtml(template.firstArg) : ''} ${escapeHtml(template.text)}`;
    return `
      <div class="template-item" data-id="${template.id}">
        <div class="template-item-info">
          <div class="template-item-name">${escapeHtml(template.name)}</div>
          <div class="template-item-command">${commandPreview}</div>
        </div>
        <div class="template-item-actions">
          <button class="edit-btn" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="delete-btn" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // Add click handlers
  elements.templatesList.querySelectorAll('.template-item').forEach(item => {
    const id = item.dataset.id;
    item.querySelector('.edit-btn').addEventListener('click', () => editTemplate(id));
    item.querySelector('.delete-btn').addEventListener('click', () => deleteTemplate(id));
  });
}

// ===================================
// Streamers
// ===================================
function setupStreamers() {
  elements.streamerForm.addEventListener('submit', addStreamer);
  elements.validateStreamersBtn.addEventListener('click', validateAllStreamers);
  
  // Twitch search with debounce
  elements.streamerSearch.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    clearTimeout(searchDebounceTimer);
    
    if (query.length < 2) {
      elements.searchResults.innerHTML = '';
      elements.searchStatus.textContent = '';
      return;
    }
    
    elements.searchStatus.innerHTML = '<span class="searching">Searching...</span>';
    
    searchDebounceTimer = setTimeout(() => {
      searchTwitchStreamers(query);
    }, 300);
  });
}

async function searchTwitchStreamers(query) {
  if (!twitchAuthenticated) {
    elements.searchStatus.innerHTML = '<span class="error">Configure Twitch API in Settings</span>';
    elements.searchResults.innerHTML = '';
    return;
  }
  
  const result = await window.electronAPI.twitchSearch(query, appData.settings.twitchClientId);
  
  if (!result.success) {
    if (result.needsReauth) {
      // Try to re-authenticate
      await initTwitchApi();
      if (twitchAuthenticated) {
        return searchTwitchStreamers(query);
      }
    }
    elements.searchStatus.innerHTML = '<span class="error">Search failed</span>';
    elements.searchResults.innerHTML = '';
    return;
  }
  
  const channels = result.data;
  
  if (channels.length === 0) {
    elements.searchStatus.innerHTML = '<span class="no-results">No streamers found</span>';
    elements.searchResults.innerHTML = '';
    return;
  }
  
  elements.searchStatus.textContent = `${channels.length} result${channels.length !== 1 ? 's' : ''}`;
  
  // Filter out already added streamers
  const existingNames = appData.streamers.map(s => s.name.toLowerCase());
  
  elements.searchResults.innerHTML = channels.map(channel => {
    const isAdded = existingNames.includes(channel.broadcaster_login.toLowerCase());
    const isLive = channel.is_live;
    const profileImg = channel.profile_image_url || '';
    
    return `
      <div class="search-result-item ${isAdded ? 'already-added' : ''}" data-name="${escapeHtml(channel.broadcaster_login)}" data-display="${escapeHtml(channel.display_name)}">
        <div class="result-avatar" style="${profileImg ? `background-image: url('${profileImg}')` : ''}">
          ${!profileImg ? `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M12 14c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z"/></svg>` : ''}
        </div>
        <div class="result-info">
          <span class="result-name">${escapeHtml(channel.display_name)}</span>
          ${isLive ? '<span class="live-badge">LIVE</span>' : ''}
        </div>
        ${isAdded 
          ? '<span class="added-badge">Added</span>'
          : `<button class="add-result-btn" title="Add streamer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>`
        }
      </div>
    `;
  }).join('');
  
  // Add click handlers for add buttons
  elements.searchResults.querySelectorAll('.add-result-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const item = btn.closest('.search-result-item');
      const displayName = item.dataset.display; // Use display name for proper casing
      await addStreamerByName(displayName);
      
      // Update the UI
      item.classList.add('already-added');
      btn.remove();
      item.insertAdjacentHTML('beforeend', '<span class="added-badge">Added</span>');
    });
  });
}

async function addStreamer(e) {
  e.preventDefault();
  
  const name = elements.streamerName.value.trim().replace(/^@/, '');
  await addStreamerByName(name);
  elements.streamerForm.reset();
}

async function addStreamerByName(name) {
  if (!name) return;
  
  // Check for duplicates
  if (appData.streamers.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    showToast('Streamer already exists!');
    return;
  }
  
  appData.streamers.push({
    id: generateId(),
    name: name
  });
  
  await saveData();
  renderStreamersList();
  updateStreamerSelectList();
  showToast('Streamer added!');
}

async function deleteStreamer(id) {
  appData.streamers = appData.streamers.filter(s => s.id !== id);
  selectedStreamers.delete(id);
  await saveData();
  renderStreamersList();
  updateStreamerSelectList();
  updateGeneratedCommand();
  showToast('Streamer removed');
}

function renderStreamersList() {
  if (appData.streamers.length === 0) {
    elements.streamersList.innerHTML = '<p class="placeholder-text">No streamers added yet</p>';
    renderGroupStreamerSelect();
    return;
  }
  
  elements.streamersList.innerHTML = appData.streamers.map(streamer => {
    const status = streamerValidationStatus[streamer.id] || 'unknown';
    const statusClass = status === 'valid' ? 'valid' : (status === 'invalid' ? 'invalid' : '');
    
    return `
      <div class="streamer-item ${statusClass}" data-id="${streamer.id}">
        <span class="streamer-item-name">${escapeHtml(streamer.name)}</span>
        <span class="valid-badge" title="Valid Twitch user">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </span>
        <span class="invalid-badge" title="Username not found on Twitch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Invalid
        </span>
        <button class="delete-btn" title="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');
  
  // Add click handlers
  elements.streamersList.querySelectorAll('.streamer-item').forEach(item => {
    const id = item.dataset.id;
    item.querySelector('.delete-btn').addEventListener('click', () => deleteStreamer(id));
  });
  
  // Also update group streamer select
  renderGroupStreamerSelect();
}

async function validateAllStreamers() {
  if (!twitchAuthenticated) {
    showToast('Configure Twitch API in Settings first');
    return;
  }
  
  if (appData.streamers.length === 0) {
    showToast('No streamers to validate');
    return;
  }
  
  // Show loading state
  elements.validateStreamersBtn.disabled = true;
  elements.validateStreamersBtn.classList.add('validating');
  elements.validationStatus.className = 'validation-status';
  elements.validationStatus.textContent = 'Validating...';
  elements.validationStatus.classList.add('show');
  
  try {
    // Get all streamer names
    const usernames = appData.streamers.map(s => s.name);
    
    // Call Twitch API
    const result = await window.electronAPI.twitchValidateUsers(usernames, appData.settings.twitchClientId);
    
    if (!result.success) {
      if (result.needsReauth) {
        await initTwitchApi();
        if (twitchAuthenticated) {
          // Retry
          return validateAllStreamers();
        }
      }
      throw new Error(result.error || 'Validation failed');
    }
    
    // Update validation status for each streamer
    const validUsers = result.data;
    let validCount = 0;
    let invalidCount = 0;
    
    appData.streamers.forEach(streamer => {
      const isValid = validUsers[streamer.name.toLowerCase()] !== undefined;
      streamerValidationStatus[streamer.id] = isValid ? 'valid' : 'invalid';
      if (isValid) validCount++;
      else invalidCount++;
    });
    
    // Update UI
    renderStreamersList();
    
    // Show results
    if (invalidCount === 0) {
      elements.validationStatus.className = 'validation-status show success';
      elements.validationStatus.textContent = `✓ All ${validCount} streamers are valid!`;
    } else {
      elements.validationStatus.className = 'validation-status show warning';
      elements.validationStatus.textContent = `⚠ ${invalidCount} invalid, ${validCount} valid`;
    }
    
    showToast(`Validation complete: ${validCount} valid, ${invalidCount} invalid`);
    
  } catch (error) {
    elements.validationStatus.className = 'validation-status show error';
    elements.validationStatus.textContent = `Error: ${error.message}`;
    showToast('Validation failed');
  } finally {
    elements.validateStreamersBtn.disabled = false;
    elements.validateStreamersBtn.classList.remove('validating');
  }
}

// ===================================
// Groups
// ===================================
function setupGroups() {
  elements.groupForm.addEventListener('submit', saveGroup);
  elements.clearGroupFormBtn.addEventListener('click', clearGroupForm);
}

function renderGroupStreamerSelect() {
  if (appData.streamers.length === 0) {
    elements.groupStreamerSelect.innerHTML = '<p class="placeholder-text">No streamers available</p>';
    return;
  }
  
  elements.groupStreamerSelect.innerHTML = appData.streamers.map(streamer => `
    <label class="group-streamer-checkbox">
      <input type="checkbox" value="${streamer.id}" ${selectedGroupStreamers.has(streamer.id) ? 'checked' : ''}>
      <span>@${escapeHtml(streamer.name)}</span>
    </label>
  `).join('');
  
  // Add change handlers
  elements.groupStreamerSelect.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedGroupStreamers.add(checkbox.value);
      } else {
        selectedGroupStreamers.delete(checkbox.value);
      }
    });
  });
}

async function saveGroup(e) {
  e.preventDefault();
  
  const name = elements.groupName.value.trim();
  if (!name) return;
  
  const streamerIds = Array.from(selectedGroupStreamers);
  if (streamerIds.length === 0) {
    showToast('Please select at least one streamer');
    return;
  }
  
  const group = {
    id: editingGroupId || generateId(),
    name: name,
    streamerIds: streamerIds
  };
  
  if (editingGroupId) {
    // Update existing
    const index = appData.groups.findIndex(g => g.id === editingGroupId);
    if (index !== -1) {
      appData.groups[index] = group;
    }
    editingGroupId = null;
  } else {
    // Add new
    appData.groups.push(group);
  }
  
  await saveData();
  clearGroupForm();
  renderGroupsList();
  updateGroupQuickSelect();
  showToast('Group saved!');
}

function clearGroupForm() {
  elements.groupForm.reset();
  editingGroupId = null;
  selectedGroupStreamers.clear();
  renderGroupStreamerSelect();
}

function editGroup(id) {
  const group = appData.groups.find(g => g.id === id);
  if (!group) return;
  
  editingGroupId = id;
  elements.groupName.value = group.name;
  selectedGroupStreamers = new Set(group.streamerIds);
  renderGroupStreamerSelect();
  
  // Scroll to form
  elements.groupName.focus();
}

async function deleteGroup(id) {
  appData.groups = appData.groups.filter(g => g.id !== id);
  await saveData();
  renderGroupsList();
  updateGroupQuickSelect();
  showToast('Group deleted');
}

function renderGroupsList() {
  if (appData.groups.length === 0) {
    elements.groupsList.innerHTML = '<p class="placeholder-text">No groups created yet</p>';
    return;
  }
  
  elements.groupsList.innerHTML = appData.groups.map(group => {
    // Get member names (filter out deleted streamers)
    const members = group.streamerIds
      .map(id => appData.streamers.find(s => s.id === id))
      .filter(Boolean);
    
    return `
      <div class="group-item" data-id="${group.id}">
        <div class="group-item-header">
          <div class="group-item-name">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            ${escapeHtml(group.name)}
          </div>
          <div class="group-item-actions">
            <button class="edit-btn" title="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="delete-btn" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="group-item-members">
          ${members.length > 0 
            ? members.map(m => `<span class="group-member-tag">${escapeHtml(m.name)}</span>`).join('')
            : '<span class="placeholder-text" style="padding: 0; font-size: 12px;">No members</span>'
          }
        </div>
      </div>
    `;
  }).join('');
  
  // Add click handlers
  elements.groupsList.querySelectorAll('.group-item').forEach(item => {
    const id = item.dataset.id;
    item.querySelector('.edit-btn').addEventListener('click', () => editGroup(id));
    item.querySelector('.delete-btn').addEventListener('click', () => deleteGroup(id));
  });
}

// ===================================
// Settings
// ===================================
function setupSettings() {
  // Twitch API form
  elements.twitchSettingsForm.addEventListener('submit', saveTwitchSettings);
  elements.testApiBtn.addEventListener('click', testTwitchApi);
  
  // Toggle password visibility
  elements.toggleSecret.addEventListener('click', () => {
    const input = elements.twitchClientSecret;
    const eyeIcon = elements.toggleSecret.querySelector('.eye-icon');
    const eyeOffIcon = elements.toggleSecret.querySelector('.eye-off-icon');
    
    if (input.type === 'password') {
      input.type = 'text';
      eyeIcon.style.display = 'none';
      eyeOffIcon.style.display = 'block';
    } else {
      input.type = 'password';
      eyeIcon.style.display = 'block';
      eyeOffIcon.style.display = 'none';
    }
  });
  
  // Open Twitch Dev Console
  elements.twitchDevLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.electronAPI.openExternal('https://dev.twitch.tv/console/apps');
  });
  
  // Theme selection
  elements.themeOptions.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', () => selectTheme(btn.dataset.theme));
  });
  
  // Custom color picker
  elements.customColorPicker.addEventListener('input', (e) => {
    elements.customColorHex.value = e.target.value;
    updateCustomPreview(e.target.value);
  });
  
  elements.customColorHex.addEventListener('input', (e) => {
    let value = e.target.value;
    if (!value.startsWith('#')) value = '#' + value;
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      elements.customColorPicker.value = value;
      updateCustomPreview(value);
    }
  });
  
  elements.applyCustomColor.addEventListener('click', applyCustomColor);
}

function renderSettings() {
  // Fill in saved values
  elements.twitchClientId.value = appData.settings.twitchClientId || '';
  elements.twitchClientSecret.value = appData.settings.twitchClientSecret || '';
  
  // Update API status indicator
  updateApiStatus();
  
  // Update theme selection
  elements.themeOptions.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === appData.settings.theme);
  });
  
  // Update custom color picker
  if (appData.settings.customColor) {
    elements.customColorPicker.value = appData.settings.customColor;
    elements.customColorHex.value = appData.settings.customColor;
    updateCustomPreview(appData.settings.customColor);
  }
}

async function saveTwitchSettings(e) {
  e.preventDefault();
  
  appData.settings.twitchClientId = elements.twitchClientId.value.trim();
  appData.settings.twitchClientSecret = elements.twitchClientSecret.value.trim();
  
  await saveData();
  showToast('Twitch settings saved!');
  
  // Initialize API with new credentials
  if (appData.settings.twitchClientId && appData.settings.twitchClientSecret) {
    await initTwitchApi();
  }
}

async function testTwitchApi() {
  const clientId = elements.twitchClientId.value.trim();
  const clientSecret = elements.twitchClientSecret.value.trim();
  
  if (!clientId || !clientSecret) {
    showToast('Please enter both Client ID and Secret');
    return;
  }
  
  setApiStatus('testing', 'Testing connection...');
  
  const result = await window.electronAPI.twitchValidate(clientId, clientSecret);
  
  if (result.success) {
    twitchAuthenticated = true;
    setApiStatus('success', 'Connected successfully!');
    showToast('Twitch API connected!');
  } else {
    twitchAuthenticated = false;
    setApiStatus('error', `Connection failed: ${result.error}`);
    showToast('Connection failed');
  }
}

async function initTwitchApi() {
  const result = await window.electronAPI.twitchGetToken(
    appData.settings.twitchClientId,
    appData.settings.twitchClientSecret
  );
  
  if (result.success) {
    twitchAuthenticated = true;
    setApiStatus('success', 'Connected');
  } else {
    twitchAuthenticated = false;
    setApiStatus('error', 'Authentication failed');
  }
}

function setApiStatus(status, text) {
  const indicator = elements.apiStatus.querySelector('.status-indicator');
  const textEl = elements.apiStatus.querySelector('.status-text');
  
  indicator.className = 'status-indicator ' + status;
  textEl.textContent = text;
}

function updateApiStatus() {
  if (!appData.settings.twitchClientId || !appData.settings.twitchClientSecret) {
    setApiStatus('', 'Not configured');
  } else if (twitchAuthenticated) {
    setApiStatus('success', 'Connected');
  } else {
    setApiStatus('warning', 'Credentials saved (not tested)');
  }
}

async function selectTheme(theme) {
  appData.settings.theme = theme;
  await saveData();
  
  // Update button states
  elements.themeOptions.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
  
  // Apply theme
  applyTheme(theme);
  showToast('Theme updated!');
}

function applyTheme(theme) {
  // Remove existing theme classes
  const themeClasses = ['theme-twitch-dark', 'theme-midnight', 'theme-cyber', 'theme-forest', 
                        'theme-crimson', 'theme-ocean', 'theme-sunset', 'theme-custom'];
  document.body.classList.remove(...themeClasses);
  
  // Add new theme class
  document.body.classList.add(`theme-${theme}`);
  
  // Apply custom color if it's the custom theme
  if (theme === 'custom' && appData.settings.customColor) {
    applyCustomColorToCSS(appData.settings.customColor);
  }
}

function updateCustomPreview(color) {
  document.documentElement.style.setProperty('--custom-preview-color', color);
}

async function applyCustomColor() {
  const color = elements.customColorPicker.value;
  appData.settings.customColor = color;
  appData.settings.theme = 'custom';
  await saveData();
  
  applyCustomColorToCSS(color);
  
  // Update button states
  elements.themeOptions.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === 'custom');
  });
  
  // Apply custom theme class
  const themeClasses = ['theme-twitch-dark', 'theme-midnight', 'theme-cyber', 'theme-forest', 
                        'theme-crimson', 'theme-ocean', 'theme-sunset', 'theme-custom'];
  document.body.classList.remove(...themeClasses);
  document.body.classList.add('theme-custom');
  
  showToast('Custom theme applied!');
}

function applyCustomColorToCSS(hexColor) {
  const hsl = hexToHSL(hexColor);
  const root = document.documentElement;
  
  // Generate colors based on the accent color
  // Main accent
  root.style.setProperty('--custom-accent', hexColor);
  root.style.setProperty('--custom-accent-dim', hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 10, 20)));
  root.style.setProperty('--custom-accent-glow', `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.3)`);
  root.style.setProperty('--custom-accent-light', hslToHex(hsl.h, Math.min(hsl.s + 10, 100), Math.min(hsl.l + 25, 85)));
  
  // Generate dark backgrounds with a hint of the accent color
  const bgHue = hsl.h;
  const bgSat = Math.min(hsl.s * 0.3, 20); // Low saturation for backgrounds
  
  root.style.setProperty('--custom-bg-darkest', hslToHex(bgHue, bgSat, 4));
  root.style.setProperty('--custom-bg-dark', hslToHex(bgHue, bgSat, 6));
  root.style.setProperty('--custom-bg-card', hslToHex(bgHue, bgSat, 8));
  root.style.setProperty('--custom-bg-elevated', hslToHex(bgHue, bgSat, 11));
  root.style.setProperty('--custom-bg-hover', hslToHex(bgHue, bgSat, 16));
  
  // Update preview
  updateCustomPreview(hexColor);
}

// Color conversion utilities
function hexToHSL(hex) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  
  r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  b = Math.round((b + m) * 255).toString(16).padStart(2, '0');
  
  return `#${r}${g}${b}`;
}

// ===================================
// Data Persistence
// ===================================
async function saveData() {
  await window.electronAPI.saveData(appData);
}

// ===================================
// Utilities
// ===================================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message) {
  const toastMessage = elements.toast.querySelector('.toast-message');
  toastMessage.textContent = message;
  elements.toast.classList.add('show');
  
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2500);
}

function renderAll() {
  renderTemplatesList();
  renderStreamersList();
  renderGroupsList();
  renderGroupStreamerSelect();
  updateTemplateSelect();
  updateStreamerSelectList();
  updateLanguageToggle();
  updateGeneratedCommand();
  renderSettings();
  
  // Apply theme (including custom colors if needed)
  const theme = appData.settings.theme || 'twitch-dark';
  if (theme === 'custom' && appData.settings.customColor) {
    applyCustomColorToCSS(appData.settings.customColor);
  }
  applyTheme(theme);
  
  applySidebarState();
}

// ===================================
// Start App
// ===================================
init();

