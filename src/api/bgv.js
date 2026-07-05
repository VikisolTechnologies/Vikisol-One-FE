import { api } from './client';

export async function getBackgroundChecks(employeeId) {
  return api.get(`/employees/${employeeId}/bgv`);
}

export async function updateBackgroundCheck(employeeId, checkId, { status, remarks }) {
  return api.put(`/employees/${employeeId}/bgv/${checkId}`, { status, remarks });
}
