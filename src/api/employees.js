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
    // Both dateOfJoining and exitDate were previously missing from the lightweight list DTO the
    // backend actually returns for directory-wide employee data - the CEO Dashboard's headcount
    // growth/attrition charts read these fields but always got undefined for real (non-mock)
    // data as a result, regardless of what a single-employee fetch showed.
    exitDate: e.exitDate,
    dob: e.dateOfBirth,
    gender: e.gender,
    address: e.currentAddress,
    permanentAddress: e.permanentAddress,
    profilePictureUrl: e.profilePictureUrl,
    maritalStatus: e.maritalStatus,
    nationality: e.nationality,
    bloodGroup: e.bloodGroup,
    languagesKnown: e.languagesKnown,
    pan: e.panNumber,
    aadhar: e.aadharNumber,
    uan: e.uanNumber,
    pfNumber: e.pfNumber,
    esiNumber: e.esiNumber,
    bankName: e.bankName,
    bankAccount: e.bankAccountNumber,
    ifsc: e.ifscCode,
    ctc: e.ctc,
    manager: e.reportingManagerName || '',
    reportingManagerId: e.reportingManagerId,
    isActive: e.isActive,
    accountRole: e.accountRole || null,
    lifecycleStatus: e.lifecycleStatus || null,
    costCenter: e.costCenter || null,
    businessUnit: e.businessUnit || null,
    onboarding: {
      documentsVerified: !!e.onboardingDocumentsVerified,
      assetsAssigned: !!e.onboardingAssetsAssigned,
      bankDetailsCollected: !!e.onboardingBankDetailsCollected,
      inductionCompleted: !!e.onboardingInductionCompleted,
    },
    emergencyContact: e.emergencyContactName
      ? { name: e.emergencyContactName, phone: e.emergencyContactPhone, relation: e.emergencyContactRelation }
      : null,
    nominee: e.nomineeName
      ? { name: e.nomineeName, relation: e.nomineeRelation, dob: e.nomineeDateOfBirth, sharePercentage: e.nomineeSharePercentage, gender: e.nomineeGender }
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
    permanentAddress: form.permanentAddress || null,
    profilePictureUrl: form.profilePictureUrl || null,
    maritalStatus: form.maritalStatus || null,
    nationality: form.nationality || null,
    bloodGroup: form.bloodGroup || null,
    languagesKnown: form.languagesKnown || null,
    panNumber: form.pan || null,
    aadharNumber: form.aadhar || null,
    uanNumber: form.uan || null,
    pfNumber: form.pfNumber || null,
    esiNumber: form.esiNumber || null,
    bankName: form.bankName || null,
    bankAccountNumber: form.bankAccount || null,
    ifscCode: form.ifsc || null,
    ctc: form.ctc || null,
    emergencyContactName: form.emergencyContact?.name || form.emergencyContactName || null,
    emergencyContactPhone: form.emergencyContact?.phone || form.emergencyContactPhone || null,
    emergencyContactRelation: form.emergencyContact?.relation || form.emergencyContactRelation || null,
    nomineeName: form.nominee?.name || form.nomineeName || null,
    nomineeRelation: form.nominee?.relation || form.nomineeRelation || null,
    nomineeDateOfBirth: form.nominee?.dob || form.nomineeDateOfBirth || null,
    nomineeSharePercentage: form.nominee?.sharePercentage || form.nomineeSharePercentage || null,
    nomineeGender: form.nominee?.gender || form.nomineeGender || null,
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

// Both DashboardRouter (onboarding-completeness check) and EmployeeDashboard (summary widgets)
// call this independently right after login, doubling a network round-trip that's on the
// critical path to a Manager/Employee ever seeing their dashboard render. A short in-memory
// cache (cleared on logout via clearMyProfileCache) means the second caller reuses the same
// in-flight/just-resolved promise instead of firing its own request.
let myProfileCache = null;
export async function getMyProfile() {
  if (!myProfileCache) {
    myProfileCache = api.get('/employees/me').then(adaptEmployee).catch(err => { myProfileCache = null; throw err; });
  }
  return myProfileCache;
}
export function clearMyProfileCache() {
  myProfileCache = null;
}

export async function createEmployee(form) {
  return adaptEmployee(await api.post('/employees', toEmployeeRequest(form)));
}

export async function updateEmployee(id, form) {
  return adaptEmployee(await api.put(`/employees/${id}`, toEmployeeRequest(form)));
}

// Self-service variant for the Onboarding Wizard (Personal/Bank/Tax/Nominee steps) - hits a
// distinct endpoint any employee can call for their own record; the admin PUT above is
// CEO/HR/Admin-only and always 403s for a plain employee saving their own profile.
export async function updateOwnProfile(id, form) {
  return adaptEmployee(await api.put(`/employees/${id}/personal-profile`, toEmployeeRequest(form)));
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

// Manual HR override for the employee's lifecycle status (e.g. PROBATION -> CONFIRMED).
export async function updateLifecycleStatus(id, status) {
  return adaptEmployee(await api.put(`/employees/${id}/lifecycle-status`, { status }));
}

// Chronological feed of an employee's significant lifecycle events (recruitment, BGV, onboarding,
// offboarding, audit trail) aggregated server-side.
export async function getEmployeeTimeline(employeeId) {
  const data = await api.get(`/employees/${employeeId}/timeline`);
  return (data || []).map(t => ({
    timestamp: t.timestamp,
    category: t.category,
    title: t.title,
    description: t.description,
  }));
}

// Organization transfers - department/reporting manager/location/cost center/business unit moves
// for existing active employees, tracked as their own history (separate from offboarding).
export async function initiateTransfer(id, { transferType, newValue, effectiveDate, reason }) {
  return api.post(`/employees/${id}/transfers`, { transferType, newValue, effectiveDate, reason });
}

export async function getEmployeeDashboardSummary(employeeId) {
  return api.get(`/employees/${employeeId}/dashboard-summary`);
}

export async function getTransferHistory(id) {
  return api.get(`/employees/${id}/transfers`);
}

// Login/account state for the "Linked Accounts" panel - official vs personal recovery email,
// lockout/activation status, and whether Microsoft sign-in is even available for this tenant yet.
export async function getAccountStatus(employeeId) {
  return api.get(`/employees/${employeeId}/account-status`);
}

export async function unlockAccount(employeeId) {
  return api.post(`/employees/${employeeId}/unlock-account`);
}

// Real-time inline validation for the Add/Edit Employee form - lets HR see "already exists"
// beside a field before submitting instead of a raw DB constraint error on save.
export async function validateEmployeeFields(fields) {
  return api.get('/employees/validate', fields);
}
