// ===================================
// Settings Page
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
  elements.twitchClientId.value = appData.settings.twitchClientId || '';
  elements.twitchClientSecret.value = appData.settings.twitchClientSecret || '';
  
  updateApiStatus();
  
  elements.themeOptions.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === appData.settings.theme);
  });
  
  if (appData.settings.customColor) {
    elements.customColorPicker.value = appData.settings.customColor;
    elements.customColorHex.value = appData.settings.customColor;
    updateCustomPreview(appData.settings.customColor);
  }
  
  elements.dateFormat.value = appData.settings.dateFormat || 'system';
  elements.timeFormat.value = appData.settings.timeFormat || 'system';
  updateDateTimePreview();
}

async function saveTwitchSettings(e) {
  e.preventDefault();
  
  appData.settings.twitchClientId = elements.twitchClientId.value.trim();
  appData.settings.twitchClientSecret = elements.twitchClientSecret.value.trim();
  
  await saveData();
  showToast('Twitch settings saved!');
  
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
  
  elements.themeOptions.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
  
  applyTheme(theme);
  showToast('Theme updated!');
}

function applyTheme(theme) {
  const themeClasses = ['theme-twitch-dark', 'theme-midnight', 'theme-cyber', 'theme-forest', 
                        'theme-crimson', 'theme-ocean', 'theme-sunset', 'theme-custom'];
  document.body.classList.remove(...themeClasses);
  document.body.classList.add(`theme-${theme}`);
  
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
  
  elements.themeOptions.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === 'custom');
  });
  
  const themeClasses = ['theme-twitch-dark', 'theme-midnight', 'theme-cyber', 'theme-forest', 
                        'theme-crimson', 'theme-ocean', 'theme-sunset', 'theme-custom'];
  document.body.classList.remove(...themeClasses);
  document.body.classList.add('theme-custom');
  
  showToast('Custom theme applied!');
}

function applyCustomColorToCSS(hexColor) {
  const hsl = hexToHSL(hexColor);
  const root = document.documentElement;
  
  root.style.setProperty('--custom-accent', hexColor);
  root.style.setProperty('--custom-accent-dim', hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 10, 20)));
  root.style.setProperty('--custom-accent-glow', `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.3)`);
  root.style.setProperty('--custom-accent-light', hslToHex(hsl.h, Math.min(hsl.s + 10, 100), Math.min(hsl.l + 25, 85)));
  
  const bgHue = hsl.h;
  const bgSat = Math.min(hsl.s * 0.3, 20);
  
  root.style.setProperty('--custom-bg-darkest', hslToHex(bgHue, bgSat, 4));
  root.style.setProperty('--custom-bg-dark', hslToHex(bgHue, bgSat, 6));
  root.style.setProperty('--custom-bg-card', hslToHex(bgHue, bgSat, 8));
  root.style.setProperty('--custom-bg-elevated', hslToHex(bgHue, bgSat, 11));
  root.style.setProperty('--custom-bg-hover', hslToHex(bgHue, bgSat, 16));
  
  updateCustomPreview(hexColor);
}

