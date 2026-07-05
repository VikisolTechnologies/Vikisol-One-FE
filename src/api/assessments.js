import { api } from './client';

export function adaptAssessment(a) {
  if (!a) return null;
  return {
    id: a.id,
    candidateId: a.candidateId,
    candidateName: a.candidateName,
    candidateEmail: a.candidateEmail,
    candidatePhone: a.candidatePhone,
    experienceYears: a.yearsOfExperience,
    techStack: a.techStack ? a.techStack.split(',').map(s => s.trim()).filter(Boolean) : [],
    resumeUrl: a.resumeUrl,
    testName: a.testName,
    dateTaken: a.dateTaken,
    score: a.score,
    maxScore: a.maxScore,
    percentage: Math.round((a.percentage || 0) * 10) / 10,
    status: a.status,
    movedToInterview: a.movedToInterview,
    createdAt: a.createdAt,
  };
}

export async function getAllAssessments({ page = 0, size = 200 } = {}) {
  const data = await api.get('/assessments', { page, size });
  return {
    items: (data.content || []).map(adaptAssessment),
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}

export async function getAssessment(id) {
  return adaptAssessment(await api.get(`/assessments/${id}`));
}

export async function moveAssessmentToInterview(id, form) {
  const body = {
    jobPostingId: form.jobPostingId,
    interviewerId: form.interviewerId || null,
    interviewerName: form.interviewerName || null,
    round: Number(form.round) || 1,
    scheduledDate: form.scheduledDate,
    scheduledTime: form.scheduledTime,
    duration: Number(form.duration) || 30,
    mode: form.mode || 'VIDEO',
  };
  return adaptAssessment(await api.post(`/assessments/${id}/move-to-interview`, body));
}
