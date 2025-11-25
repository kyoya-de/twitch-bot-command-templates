const { app, BrowserWindow, ipcMain, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Data file path for persistence
const dataPath = path.join(app.getPath('userData'), 'data.json');

// Twitch API token cache
let twitchAccessToken = null;
let tokenExpiry = null;

function loadData() {
  try {
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return {
    templates: [],
    streamers: []
  };
}

function saveData(data) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0d0d1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('index.html');

  // Window controls
  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow.close());

  // Data operations
  ipcMain.handle('load-data', () => loadData());
  ipcMain.handle('save-data', (event, data) => {
    saveData(data);
    return true;
  });

  // Clipboard
  ipcMain.handle('copy-to-clipboard', (event, text) => {
    clipboard.writeText(text);
    return true;
  });

  // Open external links
  ipcMain.handle('open-external', (event, url) => {
    shell.openExternal(url);
    return true;
  });

  // Twitch API - Get Access Token
  ipcMain.handle('twitch-get-token', async (event, clientId, clientSecret) => {
    try {
      // Check if we have a valid cached token
      if (twitchAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return { success: true, token: twitchAccessToken };
      }

      const response = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Failed to authenticate' };
      }

      const data = await response.json();
      twitchAccessToken = data.access_token;
      // Set expiry 5 minutes before actual expiry for safety
      tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

      return { success: true, token: twitchAccessToken };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Twitch API - Search Channels
  ipcMain.handle('twitch-search', async (event, query, clientId) => {
    try {
      if (!twitchAccessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      // Search for channels
      const searchResponse = await fetch(
        `https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(query)}&first=10`,
        {
          headers: {
            'Authorization': `Bearer ${twitchAccessToken}`,
            'Client-Id': clientId
          }
        }
      );

      if (!searchResponse.ok) {
        // Token might be expired, clear it
        if (searchResponse.status === 401) {
          twitchAccessToken = null;
          tokenExpiry = null;
          return { success: false, error: 'Token expired', needsReauth: true };
        }
        return { success: false, error: 'Search failed' };
      }

      const searchData = await searchResponse.json();
      const channels = searchData.data;

      if (channels.length === 0) {
        return { success: true, data: [] };
      }

      // Get user profile images for all found channels
      const userIds = channels.map(c => c.id).join('&id=');
      const usersResponse = await fetch(
        `https://api.twitch.tv/helix/users?id=${userIds}`,
        {
          headers: {
            'Authorization': `Bearer ${twitchAccessToken}`,
            'Client-Id': clientId
          }
        }
      );

      let profileImages = {};
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        usersData.data.forEach(user => {
          profileImages[user.id] = user.profile_image_url;
        });
      }

      // Merge profile images into channel data
      const enrichedChannels = channels.map(channel => ({
        ...channel,
        profile_image_url: profileImages[channel.id] || null
      }));

      return { success: true, data: enrichedChannels };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Twitch API - Validate Token
  ipcMain.handle('twitch-validate', async (event, clientId, clientSecret) => {
    try {
      // First get a token
      const tokenResult = await ipcMain.emit('twitch-get-token', event, clientId, clientSecret);
      
      const response = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials'
        })
      });

      if (!response.ok) {
        return { success: false, error: 'Invalid credentials' };
      }

      const data = await response.json();
      twitchAccessToken = data.access_token;
      tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

