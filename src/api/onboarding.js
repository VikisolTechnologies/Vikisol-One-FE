import { api } from './client';

// Thin wrappers over /employees/{employeeId}/onboarding/* - kept in their own file since they're
// a distinct sub-resource group (education/employment-history/skills/completion), not general
// employee CRUD.

export async function getEducation(employeeId) {
  return api.get(`/employees/${employeeId}/onboarding/education`);
}
export async function addEducation(employeeId, data) {
  return api.post(`/employees/${employeeId}/onboarding/education`, data);
}
export async function deleteEducation(employeeId, id) {
  return api.del(`/employees/${employeeId}/onboarding/education/${id}`);
}

export async function getEmploymentHistory(employeeId) {
  return api.get(`/employees/${employeeId}/onboarding/employment-history`);
}
export async function addEmploymentHistory(employeeId, data) {
  return api.post(`/employees/${employeeId}/onboarding/employment-history`, data);
}
export async function deleteEmploymentHistory(employeeId, id) {
  return api.del(`/employees/${employeeId}/onboarding/employment-history/${id}`);
}

export async function getSkills(employeeId) {
  return api.get(`/employees/${employeeId}/onboarding/skills`);
}
export async function addSkill(employeeId, data) {
  return api.post(`/employees/${employeeId}/onboarding/skills`, data);
}
export async function deleteSkill(employeeId, id) {
  return api.del(`/employees/${employeeId}/onboarding/skills/${id}`);
}

export async function getProfileCompletion(employeeId) {
  return api.get(`/employees/${employeeId}/onboarding/completion`);
}
