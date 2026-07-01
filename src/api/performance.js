import { api } from './client';

const GOAL_STATUS_TO_FE = { NOT_STARTED: 'On Track', IN_PROGRESS: 'On Track', COMPLETED: 'Completed', DEFERRED: 'Deferred' };
const GOAL_CATEGORY_TO_FE = { BUSINESS: 'Business', TECHNICAL: 'Technical', BEHAVIORAL: 'Leadership', LEARNING: 'Learning' };
const GOAL_CATEGORY_TO_BE = { Business: 'BUSINESS', Technical: 'TECHNICAL', Leadership: 'BEHAVIORAL', Process: 'BUSINESS', Quality: 'TECHNICAL', Learning: 'LEARNING' };

// Maps backend GoalResponse -> shape PerformancePage.jsx mock goals use
export function adaptGoal(g) {
  if (!g) return null;
  return {
    id: g.id,
    title: g.title,
    description: g.description,
    category: GOAL_CATEGORY_TO_FE[g.category] || g.category,
    progress: g.status === 'COMPLETED' ? 100 : g.status === 'IN_PROGRESS' ? 50 : g.status === 'NOT_STARTED' ? 0 : 0,
    status: GOAL_STATUS_TO_FE[g.status] || g.status,
    due: g.dueDate,
    weight: g.weightage,
    employeeId: g.employeeId,
    employeeName: g.employeeName,
    reviewCycleId: g.reviewCycleId,
    reviewCycleName: g.reviewCycleName,
    targetValue: g.targetValue,
    achievedValue: g.achievedValue,
    selfRating: g.selfRating,
    managerRating: g.managerRating,
    selfComments: g.selfComments,
    managerComments: g.managerComments,
  };
}

export function toGoalRequest(form, employeeId, reviewCycleId) {
  return {
    employeeId: form.employeeId || employeeId,
    reviewCycleId: form.reviewCycleId || reviewCycleId,
    title: form.title,
    description: form.description || '',
    category: GOAL_CATEGORY_TO_BE[form.category] || 'TECHNICAL',
    weightage: form.weight || 0,
    targetValue: form.targetValue || '',
    dueDate: form.due || null,
  };
}

// Maps backend ReviewCycleResponse -> simple FE shape
export function adaptCycle(c) {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    startDate: c.startDate,
    endDate: c.endDate,
    status: c.status,
    type: c.type,
  };
}

export function toCycleRequest(form) {
  return {
    name: form.name,
    startDate: form.startDate,
    endDate: form.endDate,
    type: form.type || 'ANNUAL',
    status: form.status || undefined,
  };
}

// Maps backend PerformanceReviewResponse -> shape PerformancePage.jsx mock reviews use
export function adaptReview(r) {
  if (!r) return null;
  const rating = r.overallManagerRating ?? r.overallSelfRating ?? 0;
  let status = 'In Progress';
  if (r.status === 'ACKNOWLEDGED' || r.status === 'COMPLETED') status = 'Completed';
  else if (r.status === 'MANAGER_REVIEWED') status = 'In Progress';
  else if (r.status === 'SELF_REVIEWED') status = 'In Progress';
  return {
    id: r.id,
    period: r.reviewCycleName,
    rating,
    status,
    rawStatus: r.status,
    reviewer: r.reviewerId,
    comments: r.managerSummary || r.selfSummary || '',
    employeeId: r.employeeId,
    employeeName: r.employeeName,
    reviewCycleId: r.reviewCycleId,
    overallSelfRating: r.overallSelfRating,
    overallManagerRating: r.overallManagerRating,
    selfSummary: r.selfSummary,
    managerSummary: r.managerSummary,
    strengths: r.strengths,
    areasOfImprovement: r.areasOfImprovement,
    acknowledgedDate: r.acknowledgedDate,
    goals: (r.goals || []).map(adaptGoal),
  };
}

export async function createCycle(form) {
  return adaptCycle(await api.post('/performance/cycles', toCycleRequest(form)));
}

export async function getAllCycles(status) {
  const data = await api.get('/performance/cycles', status ? { status } : undefined);
  return (data || []).map(adaptCycle);
}

export async function createGoal(form, employeeId, reviewCycleId) {
  return adaptGoal(await api.post('/performance/goals', toGoalRequest(form, employeeId, reviewCycleId)));
}

export async function updateGoal(id, form, employeeId, reviewCycleId) {
  return adaptGoal(await api.put(`/performance/goals/${id}`, toGoalRequest(form, employeeId, reviewCycleId)));
}

export async function getMyGoals(cycleId) {
  const data = await api.get('/performance/goals/my', { cycleId });
  return (data || []).map(adaptGoal);
}

export async function getTeamGoals(cycleId) {
  const data = await api.get('/performance/goals/team', { cycleId });
  return (data || []).map(adaptGoal);
}

export async function submitSelfReview(reviewCycleId, overallRating, summary, goalRatings = []) {
  const body = {
    reviewCycleId,
    overallRating,
    summary,
    goalRatings: goalRatings.map(g => ({ goalId: g.goalId, selfRating: g.selfRating, comments: g.comments || '' })),
  };
  return adaptReview(await api.post('/performance/reviews/self', body));
}

export async function submitManagerReview(employeeId, reviewCycleId, overallRating, summary, strengths, areasOfImprovement, goalRatings = []) {
  const body = {
    employeeId,
    reviewCycleId,
    overallRating,
    summary,
    strengths,
    areasOfImprovement,
    goalRatings: goalRatings.map(g => ({ goalId: g.goalId, managerRating: g.managerRating, comments: g.comments || '' })),
  };
  return adaptReview(await api.post('/performance/reviews/manager', body));
}

export async function acknowledgeReview(id) {
  return adaptReview(await api.put(`/performance/reviews/${id}/acknowledge`));
}

export async function getMyReviews() {
  const data = await api.get('/performance/reviews/my');
  return (data || []).map(adaptReview);
}

export async function getTeamReviews(cycleId) {
  const data = await api.get('/performance/reviews/team', { cycleId });
  return (data || []).map(adaptReview);
}
