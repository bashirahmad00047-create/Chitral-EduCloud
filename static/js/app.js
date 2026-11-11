// Chitral EduCloud ERP - Master Bootstrapper (Phase 4 Modular Engine)

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initNavigation();
  await checkAuthSession();
  await loadSchoolData(state.currentSchoolId);
  initCharts();
  applyRolePermissions(state.currentRole);
  console.log("Chitral EduCloud ERP Initialized (Role: " + state.currentRole + ")");
});
