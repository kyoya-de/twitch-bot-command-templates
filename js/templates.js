// ===================================
// Templates Page
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

