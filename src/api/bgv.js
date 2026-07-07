import { api } from './client';

export async function getBackgroundChecks(employeeId) {
  return api.get(`/employees/${employeeId}/bgv`);
}

export async function updateBackgroundCheck(employeeId, checkId, { status, remarks }) {
  return api.put(`/employees/${employeeId}/bgv/${checkId}`, { status, remarks });
}

// Recruiter-permitted: adds a remark/comment without changing status (approve/reject stays
// HR/CEO/Admin-only via updateBackgroundCheck above).
export async function addBackgroundCheckRemarks(employeeId, checkId, remarks) {
  return api.put(`/employees/${employeeId}/bgv/${checkId}/remarks`, { remarks });
}

// Links a document already uploaded via the generic Document module to this BGV check.
export async function attachBackgroundCheckDocument(employeeId, checkId, documentId) {
  return api.put(`/employees/${employeeId}/bgv/${checkId}/document`, { documentId });
}
