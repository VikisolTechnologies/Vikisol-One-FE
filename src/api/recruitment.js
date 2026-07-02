import { api } from './client';

// ─── Candidate status/stage mapping ───
// Backend Candidate.Status: NEW, SCREENING, SHORTLISTED, INTERVIEW_SCHEDULED, INTERVIEWED,
//   SELECTED, OFFER_MADE, OFFER_ACCEPTED, OFFER_DECLINED, JOINED, REJECTED
// Frontend kanban stages: Applied, Screening, Technical, Manager, HR, Offered, Hired, Rejected
const STAGE_TO_FE = {
  NEW: 'Applied',
  SCREENING: 'Screening',
  SHORTLISTED: 'Technical',
  INTERVIEW_SCHEDULED: 'Manager',
  INTERVIEWED: 'HR',
  PENDING_APPROVAL: 'HR',
  REVISION_REQUESTED: 'HR',
  SELECTED: 'HR',
  OFFER_MADE: 'Offered',
  OFFER_ACCEPTED: 'Offered',
  OFFER_DECLINED: 'Rejected',
  JOINED: 'Hired',
  REJECTED: 'Rejected',
};
const STAGE_TO_BE = {
  Applied: 'NEW',
  Screening: 'SCREENING',
  Technical: 'SHORTLISTED',
  Manager: 'INTERVIEW_SCHEDULED',
  HR: 'INTERVIEWED',
  Offered: 'OFFER_MADE',
  Hired: 'JOINED',
  Rejected: 'REJECTED',
};

const SOURCE_TO_FE = {
  PORTAL: 'Company Website',
  REFERRAL: 'Referral',
  AGENCY: 'Naukri',
  DIRECT: 'Indeed',
  LINKEDIN: 'LinkedIn',
};
const SOURCE_TO_BE = {
  'Company Website': 'PORTAL',
  Referral: 'REFERRAL',
  Naukri: 'AGENCY',
  Indeed: 'DIRECT',
  LinkedIn: 'LINKEDIN',
  Cutshort: 'AGENCY',
  Instahyre: 'AGENCY',
  Campus: 'DIRECT',
};

// Maps backend CandidateResponse -> shape the existing mock-driven UI expects
export function adaptCandidate(c) {
  if (!c) return null;
  return {
    id: c.id,
    name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
    email: c.email,
    phone: c.phone,
    role: c.jobPostingTitle || c.currentDesignation || '',
    jobPostingId: c.jobPostingId,
    experience: `${c.experienceYears ?? 0} years`,
    experienceYears: c.experienceYears,
    currentCompany: c.currentCompany || '-',
    currentDesignation: c.currentDesignation,
    currentCTC: '-',
    expectedCTC: c.expectedSalary != null ? `₹${c.expectedSalary}` : '-',
    expectedSalary: c.expectedSalary,
    stage: STAGE_TO_FE[c.status] || 'Applied',
    status: c.status,
    score: 75,
    source: SOURCE_TO_FE[c.source] || 'LinkedIn',
    appliedDate: c.createdAt ? c.createdAt.split('T')[0] : '',
    skills: c.skills ? c.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
    location: '-',
    noticePeriod: c.noticePeriod != null ? `${c.noticePeriod} days` : '-',
    interviewer: '-',
    feedback: c.notes || null,
    resume: c.resumeUrl || 'resume.pdf',
    offeredCtc: c.offeredCtc,
    offeredDesignationId: c.offeredDesignationId,
    offeredDesignationTitle: c.offeredDesignationTitle,
    offeredDepartmentId: c.offeredDepartmentId,
    offeredDepartmentName: c.offeredDepartmentName,
    offeredDateOfJoining: c.offeredDateOfJoining,
    convertedEmployeeId: c.convertedEmployeeId || null,
    managerRemarks: c.managerRemarks || null,
  };
}

// Maps the FE form shape back to backend CandidateRequest
export function toCandidateRequest(form) {
  const [firstName, ...rest] = (form.name || '').trim().split(' ');
  return {
    firstName: firstName || form.name || '',
    lastName: rest.join(' ') || '',
    email: form.email,
    phone: form.phone || null,
    currentCompany: form.currentCompany || null,
    currentDesignation: form.role || null,
    experienceYears: parseFloat(form.experience) || 0,
    expectedSalary: form.expectedCTC ? Number(String(form.expectedCTC).replace(/[^\d.]/g, '')) || null : null,
    noticePeriod: form.noticePeriod ? parseInt(form.noticePeriod, 10) || 0 : 0,
    resumeUrl: form.resume || null,
    skills: Array.isArray(form.skills) ? form.skills.join(', ') : (form.skills || null),
    source: SOURCE_TO_BE[form.source] || 'DIRECT',
    notes: form.feedback || null,
    jobPostingId: form.jobPostingId || null,
  };
}

export async function getAllCandidates({ page = 0, size = 200 } = {}) {
  const data = await api.get('/recruitment/candidates', { page, size });
  return {
    items: (data.content || []).map(adaptCandidate),
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}

export async function getCandidate(id) {
  return adaptCandidate(await api.get(`/recruitment/candidates/${id}`));
}

export async function createCandidate(form) {
  return adaptCandidate(await api.post('/recruitment/candidates', toCandidateRequest(form)));
}

export async function updateCandidate(id, form) {
  return adaptCandidate(await api.put(`/recruitment/candidates/${id}`, toCandidateRequest(form)));
}

export async function deleteCandidate(id) {
  return api.del(`/recruitment/candidates/${id}`);
}

export async function updateCandidateStatus(id, feStage) {
  const status = STAGE_TO_BE[feStage] || 'NEW';
  return adaptCandidate(await api.put(`/recruitment/candidates/${id}/status?status=${status}`));
}

// Recruiter proposes CTC/designation/department/joining date for manager approval.
// Does NOT send an offer letter by itself - a manager must approve first.
export async function proposeSelection(id, { designationId, departmentId, offeredCtc, dateOfJoining }) {
  return adaptCandidate(await api.post(`/recruitment/candidates/${id}/propose-selection`, {
    designationId,
    departmentId,
    offeredCtc: Number(offeredCtc),
    dateOfJoining,
  }));
}

// Manager approves a pending proposal: creates the Employee record + employee ID using the
// CEO's standard CTC breakup, and emails the offer/congratulations letter.
export async function approveSelection(id) {
  return api.post(`/recruitment/candidates/${id}/approve-selection`);
}

// Manager sends the proposal back to the recruiter with remarks.
export async function requestRevision(id, remarks) {
  return adaptCandidate(await api.post(`/recruitment/candidates/${id}/request-revision`, { remarks }));
}

// ─── Job Postings ───

const JOB_TYPE_TO_FE = { FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract', INTERN: 'Intern' };
const JOB_TYPE_TO_BE = { 'Full Time': 'FULL_TIME', 'Part Time': 'PART_TIME', Contract: 'CONTRACT', Intern: 'INTERN' };

export function adaptJobPosting(j) {
  if (!j) return null;
  return {
    id: j.id,
    title: j.title,
    description: j.description,
    departmentId: j.departmentId,
    department: j.departmentName || '',
    designationId: j.designationId,
    designation: j.designationTitle || '',
    location: j.location,
    employmentType: JOB_TYPE_TO_FE[j.employmentType] || j.employmentType,
    experienceMin: j.experienceMin,
    experienceMax: j.experienceMax,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    skills: j.skills ? j.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
    numberOfPositions: j.numberOfPositions,
    status: j.status,
    postedDate: j.postedDate,
    closingDate: j.closingDate,
    isActive: j.isActive,
  };
}

export function toJobPostingRequest(form) {
  return {
    title: form.title,
    description: form.description || null,
    departmentId: form.departmentId,
    designationId: form.designationId,
    location: form.location || null,
    employmentType: JOB_TYPE_TO_BE[form.employmentType] || 'FULL_TIME',
    experienceMin: Number(form.experienceMin) || 0,
    experienceMax: Number(form.experienceMax) || 0,
    salaryMin: form.salaryMin || null,
    salaryMax: form.salaryMax || null,
    skills: Array.isArray(form.skills) ? form.skills.join(', ') : (form.skills || null),
    numberOfPositions: Number(form.numberOfPositions) || 1,
    status: form.status || 'OPEN',
    closingDate: form.closingDate || null,
  };
}

export async function getAllJobPostings({ page = 0, size = 100 } = {}) {
  const data = await api.get('/recruitment/jobs', { page, size });
  return {
    items: (data.content || []).map(adaptJobPosting),
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}

export async function getJobPosting(id) {
  return adaptJobPosting(await api.get(`/recruitment/jobs/${id}`));
}

export async function createJobPosting(form) {
  return adaptJobPosting(await api.post('/recruitment/jobs', toJobPostingRequest(form)));
}

export async function updateJobPosting(id, form) {
  return adaptJobPosting(await api.put(`/recruitment/jobs/${id}`, toJobPostingRequest(form)));
}

export async function deleteJobPosting(id) {
  return api.del(`/recruitment/jobs/${id}`);
}

// ─── Interviews ───

export function adaptInterview(i) {
  if (!i) return null;
  return {
    id: i.id,
    candidateId: i.candidateId,
    candidateName: i.candidateName,
    jobPostingId: i.jobPostingId,
    jobPostingTitle: i.jobPostingTitle,
    interviewerId: i.interviewerId,
    interviewer: i.interviewerName || '-',
    round: i.round,
    scheduledDate: i.scheduledDate,
    scheduledTime: i.scheduledTime,
    duration: i.duration,
    mode: i.mode,
    status: i.status,
    feedback: i.feedback,
    rating: i.rating,
    result: i.result,
  };
}

export async function scheduleInterview(form) {
  const body = {
    candidateId: form.candidateId,
    jobPostingId: form.jobPostingId,
    interviewerId: form.interviewerId || null,
    interviewerName: form.interviewerName || form.interviewer || null,
    round: Number(form.round) || 1,
    scheduledDate: form.scheduledDate,
    scheduledTime: form.scheduledTime,
    duration: Number(form.duration) || 30,
    mode: form.mode || 'ONLINE',
  };
  return adaptInterview(await api.post('/recruitment/interviews', body));
}

export async function submitInterviewFeedback(id, { feedback, rating, result }) {
  return adaptInterview(await api.put(`/recruitment/interviews/${id}/feedback`, { feedback, rating, result }));
}

export async function getUpcomingInterviews() {
  const data = await api.get('/recruitment/interviews/upcoming');
  return (data || []).map(adaptInterview);
}
