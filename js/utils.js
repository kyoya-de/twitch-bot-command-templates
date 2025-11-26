// ===================================
// Utility Functions
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

// ===================================
// Data Persistence
// ===================================
async function saveData() {
  await window.electronAPI.saveData(appData);
}

// ===================================
// Date/Time Formatting
// ===================================
function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  const dateFormat = appData.settings.dateFormat || 'system';
  const timeFormat = appData.settings.timeFormat || 'system';
  
  let dateStr, timeStr;
  
  // Format date
  if (dateFormat === 'system') {
    dateStr = date.toLocaleDateString();
  } else {
    dateStr = formatDateCustom(date, dateFormat);
  }
  
  // Format time
  if (timeFormat === 'system') {
    timeStr = date.toLocaleTimeString();
  } else {
    timeStr = formatTimeCustom(date, timeFormat);
  }
  
  return `${dateStr} ${timeStr}`;
}

function formatDateCustom(date, format) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[date.getMonth()];
  
  switch (format) {
    case 'DD.MM.YYYY': return `${day}.${month}.${year}`;
    case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
    case 'DD MMM YYYY': return `${day} ${monthName} ${year}`;
    default: return date.toLocaleDateString();
  }
}

function formatTimeCustom(date, format) {
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours24Str = String(hours24).padStart(2, '0');
  const hours12Str = String(hours12).padStart(2, '0');
  
  switch (format) {
    case 'HH:mm': return `${hours24Str}:${minutes}`;
    case 'HH:mm:ss': return `${hours24Str}:${minutes}:${seconds}`;
    case 'hh:mm A': return `${hours12Str}:${minutes} ${ampm}`;
    case 'hh:mm:ss A': return `${hours12Str}:${minutes}:${seconds} ${ampm}`;
    default: return date.toLocaleTimeString();
  }
}

async function updateDateTimeFormat() {
  appData.settings.dateFormat = elements.dateFormat.value;
  appData.settings.timeFormat = elements.timeFormat.value;
  await saveData();
  updateDateTimePreview();
  renderHistory();
}

function updateDateTimePreview() {
  elements.datetimePreview.textContent = formatDateTime(Date.now());
}

// ===================================
// Color Utilities
// ===================================
function hexToHSL(hex) {
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

