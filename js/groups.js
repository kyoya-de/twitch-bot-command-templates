// ===================================
// Groups Management
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
    const index = appData.groups.findIndex(g => g.id === editingGroupId);
    if (index !== -1) {
      appData.groups[index] = group;
    }
    editingGroupId = null;
  } else {
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

