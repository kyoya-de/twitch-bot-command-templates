// ===================================
// Twitch Bot Command Manager
// Application Entry Point
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
  if (!appData.history) {
    appData.history = [];
  }
  if (!appData.settings.dateFormat) {
    appData.settings.dateFormat = 'system';
  }
  if (!appData.settings.timeFormat) {
    appData.settings.timeFormat = 'system';
  }
  
  // Setup event listeners for each page
  setupNavigation();
  setupWindowControls();
  setupGenerator();
  setupTemplates();
  setupStreamers();
  setupGroups();
  setupHistory();
  setupSettings();
  
  // Initial render
  renderAll();
  
  // Initialize Twitch API if credentials exist
  if (appData.settings.twitchClientId && appData.settings.twitchClientSecret) {
    initTwitchApi();
  }
}

function renderAll() {
  renderTemplatesList();
  renderStreamersList();
  renderGroupsList();
  renderGroupStreamerSelect();
  renderHistory();
  updateTemplateSelect();
  updateStreamerSelectList();
  updateLanguageToggle();
  updateTemplatePreview();
  renderSettings();
  
  // Apply theme (including custom colors if needed)
  const theme = appData.settings.theme || 'twitch-dark';
  if (theme === 'custom' && appData.settings.customColor) {
    applyCustomColorToCSS(appData.settings.customColor);
  }
  applyTheme(theme);
  
  applySidebarState();
}

// Start the application
init();

