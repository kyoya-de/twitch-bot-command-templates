// ===================================
// Navigation & Window Controls
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

function setupWindowControls() {
  elements.minimizeBtn.addEventListener('click', () => window.electronAPI.minimize());
  elements.maximizeBtn.addEventListener('click', () => window.electronAPI.maximize());
  elements.closeBtn.addEventListener('click', () => window.electronAPI.close());
}

