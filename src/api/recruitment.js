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
    currentCTC: c.currentCtc != null ? `₹${c.currentCtc}` : '-',
    currentCtcRaw: c.currentCtc,
    expectedCTC: c.expectedSalary != null ? `₹${c.expectedSalary}` : '-',
    expectedSalary: c.expectedSalary,
    stage: STAGE_TO_FE[c.status] || 'Applied',
    status: c.status,
    score: 75,
    source: SOURCE_TO_FE[c.source] || 'LinkedIn',
    appliedDate: c.createdAt ? c.createdAt.split('T')[0] : '',
    skills: c.skills ? c.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
    location: c.currentLocation || '-',
    currentLocation: c.currentLocation,
    preferredLocation: c.preferredLocation,
    noticePeriod: c.noticePeriod != null ? `${c.noticePeriod} days` : '-',
    noticePeriodRaw: c.noticePeriod,
    interviewer: '-',
    feedback: c.notes || null,
    resume: c.resumeUrl || 'resume.pdf',
    offeredCtc: c.offeredCtc,
    offeredDesignationId: c.offeredDesignationId,
    offeredDesignationTitle: c.offeredDesignationTitle,
    offeredDepartmentId: c.offeredDepartmentId,
    offeredDepartmentName: c.offeredDepartmentName,
    offeredDateOfJoining: c.offeredDateOfJoining,
    offeredReportingManagerId: c.offeredReportingManagerId || null,
    offeredJoiningBonus: c.offeredJoiningBonus,
    offeredVariablePay: c.offeredVariablePay,
    convertedEmployeeId: c.convertedEmployeeId || null,
    managerRemarks: c.managerRemarks || null,
    assignedRecruiterId: c.assignedRecruiterId || null,
    hiringManagerId: c.hiringManagerId || null,
    businessUnit: c.businessUnit || null,
    priority: c.priority || 'MEDIUM',
    alternateMobile: c.alternateMobile,
    currentAddress: c.currentAddress,
    city: c.city,
    state: c.state,
    country: c.country,
    linkedinUrl: c.linkedinUrl,
    githubUrl: c.githubUrl,
    portfolioUrl: c.portfolioUrl,
    employmentType: c.employmentType,
    relevantExperienceYears: c.relevantExperienceYears,
    certifications: c.certifications,
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
    alternateMobile: form.alternateMobile || null,
    currentAddress: form.currentAddress || null,
    city: form.city || null,
    state: form.state || null,
    country: form.country || null,
    linkedinUrl: form.linkedinUrl || null,
    githubUrl: form.githubUrl || null,
    portfolioUrl: form.portfolioUrl || null,
    currentCompany: form.currentCompany || null,
    currentDesignation: form.role || form.currentDesignation || null,
    employmentType: form.employmentType || null,
    experienceYears: parseFloat(form.experience) || 0,
    relevantExperienceYears: form.relevantExperienceYears ? parseFloat(form.relevantExperienceYears) : 0,
    certifications: form.certifications || null,
    expectedSalary: form.expectedCTC ? Number(String(form.expectedCTC).replace(/[^\d.]/g, '')) || null : null,
    currentCtc: form.currentCTC ? Number(String(form.currentCTC).replace(/[^\d.]/g, '')) || null : null,
    noticePeriod: form.noticePeriod ? parseInt(form.noticePeriod, 10) || 0 : 0,
    currentLocation: form.currentLocation || null,
    preferredLocation: form.preferredLocation || null,
    resumeUrl: form.resume || null,
    skills: Array.isArray(form.skills) ? form.skills.join(', ') : (form.skills || null),
    source: SOURCE_TO_BE[form.source] || 'DIRECT',
    notes: form.feedback || null,
    jobPostingId: form.jobPostingId || null,
    assignedRecruiterId: form.assignedRecruiterId || null,
    hiringManagerId: form.hiringManagerId || null,
    businessUnit: form.businessUnit || null,
    priority: form.priority || null,
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

// Full-profile edit (Personal/Professional/Recruitment tabs in CandidateEditModal) - takes the
// already-adapted candidate shape (raw numeric fields, not formatted currency strings) directly,
// distinct from toCandidateRequest/updateCandidate which serve the legacy quick-add form's
// formatted-string convention.
export async function updateCandidateFull(id, c) {
  return adaptCandidate(await api.put(`/recruitment/candidates/${id}`, {
    firstName: (c.name || '').trim().split(' ')[0] || c.name,
    lastName: (c.name || '').trim().split(' ').slice(1).join(' '),
    email: c.email,
    phone: c.phone || null,
    alternateMobile: c.alternateMobile || null,
    currentAddress: c.currentAddress || null,
    city: c.city || null,
    state: c.state || null,
    country: c.country || null,
    linkedinUrl: c.linkedinUrl || null,
    githubUrl: c.githubUrl || null,
    portfolioUrl: c.portfolioUrl || null,
    currentCompany: c.currentCompany || null,
    currentDesignation: c.currentDesignation || null,
    employmentType: c.employmentType || null,
    experienceYears: c.experienceYears != null ? Number(c.experienceYears) : 0,
    relevantExperienceYears: c.relevantExperienceYears != null ? Number(c.relevantExperienceYears) : 0,
    certifications: c.certifications || null,
    expectedSalary: c.expectedSalary != null ? Number(c.expectedSalary) : null,
    currentCtc: c.currentCtcRaw != null ? Number(c.currentCtcRaw) : null,
    noticePeriod: c.noticePeriodRaw != null ? Number(c.noticePeriodRaw) : 0,
    currentLocation: c.currentLocation || null,
    preferredLocation: c.preferredLocation || null,
    resumeUrl: c.resume || null,
    skills: Array.isArray(c.skills) ? c.skills.join(', ') : (c.skills || null),
    source: SOURCE_TO_BE[c.source] || undefined,
    notes: c.feedback || null,
    jobPostingId: c.jobPostingId || null,
    assignedRecruiterId: c.assignedRecruiterId || null,
    hiringManagerId: c.hiringManagerId || null,
    businessUnit: c.businessUnit || null,
    priority: c.priority || null,
  }));
}

// HR adjusts a recruiter's pending offer proposal before approving it.
export async function updateOfferProposal(id, { designationId, departmentId, offeredCtc, dateOfJoining, reportingManagerId, joiningBonus, variablePay }) {
  return adaptCandidate(await api.put(`/recruitment/candidates/${id}/offer-proposal`, {
    designationId: designationId || null,
    departmentId: departmentId || null,
    offeredCtc: offeredCtc != null ? Number(offeredCtc) : null,
    dateOfJoining: dateOfJoining || null,
    reportingManagerId: reportingManagerId || null,
    joiningBonus: joiningBonus != null ? Number(joiningBonus) : null,
    variablePay: variablePay != null ? Number(variablePay) : null,
  }));
}

export async function deleteCandidate(id) {
  return api.del(`/recruitment/candidates/${id}`);
}

export async function updateCandidateStatus(id, feStage) {
  const status = STAGE_TO_BE[feStage] || 'NEW';
  return adaptCandidate(await api.put(`/recruitment/candidates/${id}/status?status=${status}`));
}

// Edits Expected/Current CTC, Notice Period, Current/Preferred Location - the 5 fields tracked
// with field-level audit history (see getCandidateFieldHistory).
export async function updateCandidateFields(id, { expectedSalary, currentCtc, noticePeriod, currentLocation, preferredLocation }) {
  return adaptCandidate(await api.put(`/recruitment/candidates/${id}/fields`, {
    expectedSalary: expectedSalary != null ? Number(expectedSalary) : null,
    currentCtc: currentCtc != null ? Number(currentCtc) : null,
    noticePeriod: noticePeriod != null ? Number(noticePeriod) : null,
    currentLocation: currentLocation || null,
    preferredLocation: preferredLocation || null,
  }));
}

export async function getCandidateFieldHistory(id) {
  return api.get(`/recruitment/candidates/${id}/field-history`);
}

export async function getCandidateTimeline(id) {
  return api.get(`/recruitment/candidates/${id}/timeline`);
}

export async function getCandidateInterviews(id) {
  const data = await api.get(`/recruitment/candidates/${id}/interviews`);
  return (data || []).map(adaptInterview);
}

// Recruiter proposes CTC/designation/department/joining date for manager approval.
// Does NOT send an offer letter by itself - a manager must approve first.
export async function proposeSelection(id, { designationId, departmentId, offeredCtc, dateOfJoining, reportingManagerId }) {
  return adaptCandidate(await api.post(`/recruitment/candidates/${id}/propose-selection`, {
    designationId,
    departmentId,
    offeredCtc: Number(offeredCtc),
    dateOfJoining,
    reportingManagerId: reportingManagerId || null,
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

export const INTERVIEW_TYPES = ['HR', 'TECHNICAL_L1', 'TECHNICAL_L2', 'TECHNICAL_L3', 'MANAGERIAL', 'CLIENT', 'FINAL_HR', 'CEO_ROUND', 'CUSTOM'];
export const INTERVIEW_PLATFORMS = ['GOOGLE_MEET', 'MICROSOFT_TEAMS', 'ZOOM', 'IN_PERSON', 'PHONE_CALL'];
export const RECOMMENDATIONS = ['STRONG_HIRE', 'HIRE', 'HOLD', 'REJECT', 'STRONG_REJECT'];

export function adaptInterview(i) {
  if (!i) return null;
  return {
    id: i.id,
    candidateId: i.candidateId,
    candidateName: i.candidateName,
    jobPostingId: i.jobPostingId,
    jobPostingTitle: i.jobPostingTitle,
    title: i.title,
    type: i.type,
    interviewerId: i.interviewerId,
    interviewer: i.interviewerName || '-',
    additionalInterviewerIds: i.additionalInterviewerIds || [],
    recruiterId: i.recruiterId,
    recruiterName: i.recruiterName,
    hrManagerId: i.hrManagerId,
    hrManagerName: i.hrManagerName,
    round: i.round,
    orderIndex: i.orderIndex,
    scheduledDate: i.scheduledDate,
    scheduledTime: i.scheduledTime,
    duration: i.duration,
    timezone: i.timezone,
    mode: i.mode,
    platform: i.platform,
    meetingLink: i.meetingLink,
    location: i.location,
    notes: i.notes,
    agenda: i.agenda,
    prepNotes: i.prepNotes,
    status: i.status,
    cancellationReason: i.cancellationReason,
    feedback: i.feedback,
    rating: i.rating,
    result: i.result,
    recommendation: i.recommendation,
    technicalRating: i.technicalRating,
    communicationRating: i.communicationRating,
    problemSolvingRating: i.problemSolvingRating,
    codingRating: i.codingRating,
    architectureRating: i.architectureRating,
    cultureFitRating: i.cultureFitRating,
    strengths: i.strengths,
    weaknesses: i.weaknesses,
    submittedByName: i.submittedByName,
    submittedAt: i.submittedAt,
  };
}

export async function scheduleInterview(form) {
  const body = {
    candidateId: form.candidateId,
    jobPostingId: form.jobPostingId,
    title: form.title || null,
    type: form.type || 'CUSTOM',
    interviewerId: form.interviewerId || null,
    interviewerName: form.interviewerName || form.interviewer || null,
    additionalInterviewerIds: form.additionalInterviewerIds || [],
    recruiterId: form.recruiterId || null,
    hrManagerId: form.hrManagerId || null,
    round: Number(form.round) || 1,
    orderIndex: Number(form.orderIndex) || Number(form.round) || 1,
    scheduledDate: form.scheduledDate,
    scheduledTime: form.scheduledTime,
    duration: Number(form.duration) || 30,
    timezone: form.timezone || 'Asia/Kolkata',
    mode: form.mode || 'VIDEO',
    platform: form.platform || null,
    meetingLink: form.meetingLink || null,
    location: form.location || null,
    notes: form.notes || null,
    agenda: form.agenda || null,
    prepNotes: form.prepNotes || null,
    attachmentUrls: form.attachmentUrls || null,
  };
  return adaptInterview(await api.post('/recruitment/interviews', body));
}

export async function rescheduleInterview(id, { scheduledDate, scheduledTime, reason }) {
  return adaptInterview(await api.put(`/recruitment/interviews/${id}/reschedule`, { scheduledDate, scheduledTime, reason }));
}

// Full interview edit - everything except candidate/job posting stays editable until COMPLETED.
export async function editInterview(id, form) {
  const body = {
    candidateId: form.candidateId,
    jobPostingId: form.jobPostingId,
    title: form.title || null,
    type: form.type || 'CUSTOM',
    interviewerId: form.interviewerId || null,
    interviewerName: form.interviewerName || form.interviewer || null,
    additionalInterviewerIds: form.additionalInterviewerIds || [],
    recruiterId: form.recruiterId || null,
    hrManagerId: form.hrManagerId || null,
    round: Number(form.round) || 1,
    orderIndex: Number(form.orderIndex) || Number(form.round) || 1,
    scheduledDate: form.scheduledDate,
    scheduledTime: form.scheduledTime,
    duration: Number(form.duration) || 30,
    timezone: form.timezone || 'Asia/Kolkata',
    mode: form.mode || 'VIDEO',
    platform: form.platform || null,
    meetingLink: form.meetingLink || null,
    location: form.location || null,
    notes: form.notes || null,
    agenda: form.agenda || null,
    prepNotes: form.prepNotes || null,
    attachmentUrls: form.attachmentUrls || null,
  };
  return adaptInterview(await api.put(`/recruitment/interviews/${id}`, body));
}

export async function reorderInterviews(candidateId, orderedInterviewIds) {
  const data = await api.put(`/recruitment/candidates/${candidateId}/interviews/reorder`, orderedInterviewIds);
  return (data || []).map(adaptInterview);
}

export async function cancelInterview(id, reason) {
  return adaptInterview(await api.put(`/recruitment/interviews/${id}/cancel`, { reason }));
}

export async function submitInterviewFeedback(id, feedbackForm) {
  return adaptInterview(await api.put(`/recruitment/interviews/${id}/feedback`, {
    feedback: feedbackForm.feedback || feedbackForm.comments || null,
    rating: Number(feedbackForm.rating) || Math.round((Number(feedbackForm.technicalRating) || 5) / 2),
    result: feedbackForm.result || null,
    recommendation: feedbackForm.recommendation || null,
    technicalRating: feedbackForm.technicalRating != null ? Number(feedbackForm.technicalRating) : null,
    communicationRating: feedbackForm.communicationRating != null ? Number(feedbackForm.communicationRating) : null,
    problemSolvingRating: feedbackForm.problemSolvingRating != null ? Number(feedbackForm.problemSolvingRating) : null,
    codingRating: feedbackForm.codingRating != null ? Number(feedbackForm.codingRating) : null,
    architectureRating: feedbackForm.architectureRating != null ? Number(feedbackForm.architectureRating) : null,
    cultureFitRating: feedbackForm.cultureFitRating != null ? Number(feedbackForm.cultureFitRating) : null,
    strengths: feedbackForm.strengths || null,
    weaknesses: feedbackForm.weaknesses || null,
    comments: feedbackForm.comments || null,
  }));
}

export async function getUpcomingInterviews() {
  const data = await api.get('/recruitment/interviews/upcoming');
  return (data || []).map(adaptInterview);
}

export async function getRecruiterDashboard() {
  return api.get('/recruitment/dashboard');
}
