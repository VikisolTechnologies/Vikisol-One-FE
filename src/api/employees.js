import { api } from './client';

const STATUS_TO_FE = { ACTIVE: 'Active', ON_NOTICE: 'Notice Period', TERMINATED: 'Terminated', RESIGNED: 'Resigned', ABSCONDED: 'Absconded' };
const STATUS_TO_BE = { Active: 'ACTIVE', 'Notice Period': 'ON_NOTICE', Terminated: 'TERMINATED', Resigned: 'RESIGNED', Suspended: 'ON_NOTICE' };
const TYPE_TO_FE = { FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract', INTERN: 'Intern' };
const TYPE_TO_BE = { 'Full Time': 'FULL_TIME', 'Part Time': 'PART_TIME', Contract: 'CONTRACT', Intern: 'INTERN' };

// Maps backend EmployeeResponse / lightweight EmployeeListResponse -> shape the existing mock-driven UI expects
export function adaptEmployee(e) {
  if (!e) return null;
  return {
    id: e.id,
    empId: e.employeeId || e.visibleId,
    name: `${e.firstName} ${e.lastName}`.trim(),
    email: e.email,
    phone: e.phone,
    personalEmail: e.personalEmail,
    personalMobile: e.personalMobile,
    department: e.departmentName || '',
    departmentId: e.departmentId,
    designation: e.designationTitle || '',
    designationId: e.designationId,
    location: e.city || '',
    status: STATUS_TO_FE[e.employmentStatus] || e.employmentStatus,
    employmentType: TYPE_TO_FE[e.employmentType] || e.employmentType,
    joinDate: e.dateOfJoining,
    dob: e.dateOfBirth,
    gender: e.gender,
    address: e.currentAddress,
    pan: e.panNumber,
    aadhar: e.aadharNumber,
    bankName: e.bankName,
    bankAccount: e.bankAccountNumber,
    ifsc: e.ifscCode,
    ctc: e.ctc,
    manager: e.reportingManagerName || '',
    reportingManagerId: e.reportingManagerId,
    isActive: e.isActive,
    accountRole: e.accountRole || null,
    onboarding: {
      documentsVerified: !!e.onboardingDocumentsVerified,
      assetsAssigned: !!e.onboardingAssetsAssigned,
      bankDetailsCollected: !!e.onboardingBankDetailsCollected,
      inductionCompleted: !!e.onboardingInductionCompleted,
    },
    emergencyContact: e.emergencyContactName
      ? { name: e.emergencyContactName, phone: e.emergencyContactPhone, relation: e.emergencyContactRelation }
      : null,
    skills: [],
    education: [],
  };
}

// Maps the FE form shape back to backend EmployeeRequest
export function toEmployeeRequest(form) {
  const [firstName, ...rest] = (form.name || '').trim().split(' ');
  return {
    firstName: firstName || form.name || '',
    lastName: rest.join(' ') || '',
    email: form.email,
    phone: form.phone,
    personalEmail: form.personalEmail || null,
    personalMobile: form.personalMobile || null,
    dateOfBirth: form.dob || null,
    gender: form.gender || null,
    departmentId: form.departmentId || null,
    designationId: form.designationId || null,
    dateOfJoining: form.joinDate || new Date().toISOString().split('T')[0],
    reportingManagerId: form.reportingManagerId || null,
    employmentType: TYPE_TO_BE[form.employmentType] || 'FULL_TIME',
    employmentStatus: STATUS_TO_BE[form.status] || 'ACTIVE',
    city: form.location || null,
    currentAddress: form.address || null,
    panNumber: form.pan || null,
    aadharNumber: form.aadhar || null,
    bankName: form.bankName || null,
    bankAccountNumber: form.bankAccount || null,
    ifscCode: form.ifsc || null,
    ctc: form.ctc || null,
  };
}

export async function getAllEmployees({ page = 0, size = 100 } = {}) {
  const data = await api.get('/employees', { page, size });
  return {
    items: (data.content || []).map(adaptEmployee),
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}

export async function getEmployee(id) {
  return adaptEmployee(await api.get(`/employees/${id}`));
}

export async function createEmployee(form) {
  return adaptEmployee(await api.post('/employees', toEmployeeRequest(form)));
}

export async function updateEmployee(id, form) {
  return adaptEmployee(await api.put(`/employees/${id}`, toEmployeeRequest(form)));
}

export async function deactivateEmployee(id) {
  return api.del(`/employees/${id}`);
}

export async function resetPassword(id) {
  return api.post(`/employees/${id}/reset-password`);
}

// Generates the employee's offer letter PDF from their current record; returns the file URL.
export async function generateOfferLetter(id) {
  return api.post(`/employees/${id}/generate-offer-letter`);
}

export async function generateExperienceLetter(id) {
  return api.post(`/employees/${id}/generate-experience-letter`);
}

export async function generateRelievingLetter(id) {
  return api.post(`/employees/${id}/generate-relieving-letter`);
}

// Lightweight manager list for dropdowns - available to any authenticated role (e.g. recruiters
// picking a reporting manager for an offer), unlike the full employee list.
export async function getManagerOptions() {
  const data = await api.get('/employees/managers');
  return (data || []).map(m => ({ id: m.id, name: m.name, designation: m.designationTitle || '' }));
}

export async function searchEmployees(q) {
  const data = await api.get('/employees/search', { q });
  return (data.content || data || []).map(adaptEmployee);
}

// Revises CTC using the CEO's standard breakup template and emails a hike letter.
export async function issueHike(id, { newAnnualCtc, effectiveDate, reason }) {
  return adaptEmployee(await api.post(`/employees/${id}/hike`, { newAnnualCtc: Number(newAnnualCtc), effectiveDate, reason }));
}

// Records a resignation and emails an acknowledgement letter.
export async function recordResignation(id, { lastWorkingDate, reason }) {
  return adaptEmployee(await api.post(`/employees/${id}/resign`, { lastWorkingDate, reason }));
}

// Promotes/changes an employee's application login role (CEO only). role is e.g. 'MANAGER', 'HR_MANAGER'.
export async function changeAccountRole(id, role) {
  return adaptEmployee(await api.put(`/employees/${id}/account-role?role=${role}`));
}

// Updates one or more onboarding checklist flags. Pass only the fields you want to change.
export async function updateOnboardingChecklist(id, { documentsVerified, assetsAssigned, bankDetailsCollected, inductionCompleted } = {}) {
  return adaptEmployee(await api.put(`/employees/${id}/onboarding`, { documentsVerified, assetsAssigned, bankDetailsCollected, inductionCompleted }));
}
