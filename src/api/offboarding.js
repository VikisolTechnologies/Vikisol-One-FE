import { api, downloadFile } from './client';

export async function initiateOffboarding(employeeId, { type, lastWorkingDate, reason, bgvRequired }) {
  return api.post(`/employees/${employeeId}/offboarding/initiate`, { type, lastWorkingDate, reason, bgvRequired });
}

export async function getOffboardingForEmployee(employeeId) {
  return api.get(`/employees/${employeeId}/offboarding`);
}

export async function getOffboardingCase(caseId) {
  return api.get(`/offboarding/${caseId}`);
}

export async function listOffboardingCases({ status, stage, departmentId } = {}) {
  return api.get('/offboarding', { status, stage, departmentId });
}

export async function getOffboardingDashboardStats() {
  return api.get('/offboarding/dashboard-stats');
}

export async function advanceOffboardingStage(caseId, { stage, comments }) {
  return api.post(`/offboarding/${caseId}/advance-stage`, { stage, comments });
}

export async function cancelOffboardingCase(caseId, comments) {
  return api.post(`/offboarding/${caseId}/cancel${comments ? `?comments=${encodeURIComponent(comments)}` : ''}`);
}

export async function updateOffboardingChecklistItem(itemId, { status, remarks }) {
  return api.put(`/offboarding/checklist/${itemId}`, { status, remarks });
}

export async function downloadExitPackage(employeeId, employeeCode) {
  return downloadFile(`/employees/${employeeId}/offboarding/exit-package`, `ExitPackage_${employeeCode || employeeId}.zip`);
}

export async function emailExitPackage(employeeId) {
  return api.post(`/employees/${employeeId}/offboarding/exit-package/email`);
}
