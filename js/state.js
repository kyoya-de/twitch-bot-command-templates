// ===================================
// Twitch Bot Command Manager
// Shared State & Configuration
// ===================================

// App State
let appData = {
  templates: [],
  streamers: [],
  groups: [],
  history: [],
  language: 'de', // Default to German
  settings: {
    twitchClientId: '',
    twitchClientSecret: '',
    theme: 'twitch-dark',
    dateFormat: 'system',
    timeFormat: 'system'
  }
};

// Language configurations
const languages = {
  de: { name: 'Deutsch', conjunction: 'und', oxfordComma: false },
  en: { name: 'English', conjunction: 'and', oxfordComma: true }
};

// Runtime state
let selectedStreamers = new Set();
let editingTemplateId = null;
let editingGroupId = null;
let editingStreamerId = null;
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
  generateBtn: document.getElementById('generate-btn'),
  groupQuickSelect: document.getElementById('group-quick-select'),
  groupButtons: document.getElementById('group-buttons'),
  clearSelectionBtn: document.getElementById('clear-selection-btn'),
  selectionCount: document.getElementById('selection-count'),
  
  // History
  historyList: document.getElementById('history-list'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  historyStats: document.getElementById('history-stats'),
  
  // Date/Time format
  dateFormat: document.getElementById('date-format'),
  timeFormat: document.getElementById('time-format'),
  datetimePreview: document.getElementById('datetime-preview'),
  
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

