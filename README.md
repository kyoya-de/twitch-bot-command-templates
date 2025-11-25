# Twitch Bot Command Manager

A stylish Electron desktop app for managing Twitch bot commands with templates, streamer placeholders, and Twitch API integration.

![Electron](https://img.shields.io/badge/Electron-33+-47848F?logo=electron&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

### 🎮 Command Generator
- Generate bot commands by selecting a template and streamers
- One-click copy to clipboard
- Multi-language support (German & English) for streamer list formatting

### 📝 Template System
- Create reusable command templates
- Support for `{streamer}` placeholder
- Configure command name, first argument, and template text
- Edit and delete templates

### 👥 Streamer Management
- **Twitch API Search** - Search for streamers with live profile pictures
- **Live indicator** - See who's currently streaming
- **Manual entry** - Add streamers without API
- Smart duplicate detection

### ⚙️ Settings
- **Twitch API Integration** - Connect with your Client ID & Secret
- **8 Preset Themes** - Twitch, Midnight, Cyber, Forest, Crimson, Ocean, Sunset
- **Custom Theme** - Pick any accent color to generate a personalized theme
- **Collapsible Sidebar** - Minimize to icon-only view

## Example Usage

Create a template like:
- **Name**: Among Us Session
- **Command**: `cmd`
- **First Argument**: `who`
- **Text**: `is playing Among Us in the senior lobby with {streamer}`

Select streamers like @Smeggy, @FeineKatze, @TheKllr, and the app generates:

**German (default):**
```
!cmd who is playing Among Us in the senior lobby with @Smeggy, @FeineKatze und @TheKllr
```

**English:**
```
!cmd who is playing Among Us in the senior lobby with @Smeggy, @FeineKatze, and @TheKllr
```

## Installation

```bash
# Clone the repository
git clone https://github.com/kyoya-de/twitch-bot-command-templates.git
cd twitch-bot-command-templates

# Install dependencies
npm install
```

## Running the App

```bash
# Start the application
npm start

# Development mode (with logging)
npm run dev
```

## Twitch API Setup

To use the streamer search feature:

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Click **"Register Your Application"**
3. Fill in:
   - **Name**: e.g., "Bot Command Manager"
   - **OAuth Redirect URLs**: `http://localhost`
   - **Category**: "Application Integration"
4. Click **"Create"**
5. Copy the **Client ID**
6. Click **"New Secret"** and copy the **Client Secret**
7. Paste both into the app's Settings page

## Themes

| Theme | Description |
|-------|-------------|
| Twitch Dark | Purple accent (default) |
| Midnight | Indigo/violet tones |
| Cyber | Cyan & magenta accents |
| Forest | Green nature theme |
| Crimson | Red accent |
| Ocean | Blue accent |
| Sunset | Orange/yellow warmth |
| Custom | Your own accent color |

## Tech Stack

- **Electron 33+** - Cross-platform desktop app
- **Vanilla JavaScript** - No frameworks, fast & lightweight
- **Custom CSS** - Dark theme with CSS variables for theming
- **Twitch Helix API** - Streamer search & profile images

## Project Structure

```
twitch-bot-command-templates/
├── main.js          # Electron main process
├── preload.js       # Secure IPC bridge
├── index.html       # App UI structure
├── styles.css       # Styling & themes
├── renderer.js      # Frontend logic
├── package.json     # Project config
├── LICENSE          # MIT License
└── assets/          # Icons & images
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
