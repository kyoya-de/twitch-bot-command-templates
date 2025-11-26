// ===================================
// Streamers Page
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
      const displayName = item.dataset.display;
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
  
  if (editingStreamerId) {
    await updateStreamerName(editingStreamerId, name);
    editingStreamerId = null;
  } else {
    await addStreamerByName(name);
  }
  
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

async function updateStreamerName(id, newName) {
  if (!newName) {
    showToast('Name cannot be empty');
    return;
  }
  
  // Check for duplicates (excluding current streamer)
  if (appData.streamers.some(s => s.id !== id && s.name.toLowerCase() === newName.toLowerCase())) {
    showToast('Streamer with this name already exists!');
    return;
  }
  
  const streamer = appData.streamers.find(s => s.id === id);
  if (streamer) {
    streamer.name = newName;
    await saveData();
    renderStreamersList();
    updateStreamerSelectList();
    showToast('Streamer updated!');
  }
}

async function deleteStreamer(id) {
  appData.streamers = appData.streamers.filter(s => s.id !== id);
  selectedStreamers.delete(id);
  await saveData();
  renderStreamersList();
  updateStreamerSelectList();
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
        <div class="streamer-item-actions">
          <button class="edit-btn" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="delete-btn" title="Remove">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // Add click handlers
  elements.streamersList.querySelectorAll('.streamer-item').forEach(item => {
    const id = item.dataset.id;
    item.querySelector('.edit-btn').addEventListener('click', () => editStreamer(id));
    item.querySelector('.delete-btn').addEventListener('click', () => deleteStreamer(id));
  });
  
  // Also update group streamer select
  renderGroupStreamerSelect();
}

function editStreamer(id) {
  const streamer = appData.streamers.find(s => s.id === id);
  if (!streamer) return;
  
  editingStreamerId = id;
  elements.streamerName.value = streamer.name;
  elements.streamerName.focus();
  
  // Clear validation status for this streamer since we're editing
  delete streamerValidationStatus[id];
  
  showToast('Editing streamer - update the name and click Add');
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
    const usernames = appData.streamers.map(s => s.name);
    const result = await window.electronAPI.twitchValidateUsers(usernames, appData.settings.twitchClientId);
    
    if (!result.success) {
      if (result.needsReauth) {
        await initTwitchApi();
        if (twitchAuthenticated) {
          return validateAllStreamers();
        }
      }
      throw new Error(result.error || 'Validation failed');
    }
    
    const validUsers = result.data;
    let validCount = 0;
    let invalidCount = 0;
    
    appData.streamers.forEach(streamer => {
      const isValid = validUsers[streamer.name.toLowerCase()] !== undefined;
      streamerValidationStatus[streamer.id] = isValid ? 'valid' : 'invalid';
      if (isValid) validCount++;
      else invalidCount++;
    });
    
    renderStreamersList();
    
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

