import { api } from './client';

const STATUS_TO_FE = {
  NOT_STARTED: 'On Track',
  IN_PROGRESS: 'On Track',
  ON_HOLD: 'On Hold',
  AT_RISK: 'At Risk',
  DELAYED: 'Delayed',
  COMPLETED: 'Completed',
  CANCELLED: 'On Hold',
};
const STATUS_TO_BE = {
  'On Track': 'IN_PROGRESS',
  'At Risk': 'AT_RISK',
  Delayed: 'DELAYED',
  Completed: 'COMPLETED',
  'On Hold': 'ON_HOLD',
};
const PRIORITY_TO_FE = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
const PRIORITY_TO_BE = { High: 'HIGH', Medium: 'MEDIUM', Low: 'LOW' };

function money(n) {
  if (n === null || n === undefined) return '₹0';
  const lakhs = Number(n) / 100000;
  return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`;
}

// Maps backend ProjectResponse -> shape the mock-driven ProjectsPage.jsx UI expects
// (see generateProjects in src/data/generator.js for the mock shape)
export function adaptProject(p) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    code: p.code,
    client: p.clientName || '',
    status: STATUS_TO_FE[p.status] || p.status,
    priority: PRIORITY_TO_FE[p.priority] || p.priority || 'Medium',
    description: p.description || '',
    startDate: p.startDate,
    deadline: p.endDate,
    budget: money(p.budget),
    budgetRaw: p.budget,
    spent: '₹0',
    projectManagerId: p.projectManagerId,
    manager: p.projectManagerName || '',
    progress: 0,
    team: p.teamSize ?? 0,
    tech: [],
    milestones: 0,
    completedMilestones: 0,
    risks: 0,
    sprints: 0,
    repository: '',
    isActive: p.active,
  };
}

export function toProjectRequest(form) {
  return {
    name: form.name,
    code: form.code || (form.name || '').substring(0, 10).toUpperCase().replace(/\s+/g, '-'),
    description: form.description || null,
    clientName: form.client || null,
    startDate: form.startDate || new Date().toISOString().split('T')[0],
    endDate: form.deadline || null,
    status: STATUS_TO_BE[form.status] || 'NOT_STARTED',
    priority: PRIORITY_TO_BE[form.priority] || 'MEDIUM',
    projectManagerId: form.projectManagerId || null,
    budget: form.budgetRaw ?? (form.budget ? parseFloat(String(form.budget).replace(/[^\d.]/g, '')) * 100000 : null),
  };
}

export function adaptMember(m) {
  if (!m) return null;
  return {
    id: m.id,
    projectId: m.projectId,
    projectName: m.projectName,
    employeeId: m.employeeId,
    employeeName: m.employeeName,
    role: m.role,
    allocationPercentage: m.allocationPercentage,
    startDate: m.startDate,
    endDate: m.endDate,
    isActive: m.active,
  };
}

export function adaptTask(t) {
  if (!t) return null;
  return {
    id: t.id,
    projectId: t.projectId,
    projectName: t.projectName,
    title: t.title,
    description: t.description || '',
    assigneeId: t.assigneeId,
    assigneeName: t.assigneeName,
    status: t.status,
    priority: t.priority,
    startDate: t.startDate,
    dueDate: t.dueDate,
    completedDate: t.completedDate,
    estimatedHours: t.estimatedHours,
    actualHours: t.actualHours,
    parentTaskId: t.parentTaskId,
  };
}

export async function getAllProjects({ page = 0, size = 100 } = {}) {
  const data = await api.get('/projects', { page, size });
  return {
    items: (data.content || []).map(adaptProject),
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}

export async function getProject(id) {
  return adaptProject(await api.get(`/projects/${id}`));
}

export async function getMyProjects() {
  const data = await api.get('/projects/my-projects');
  return (data || []).map(adaptProject);
}

export async function createProject(form) {
  return adaptProject(await api.post('/projects', toProjectRequest(form)));
}

export async function updateProject(id, form) {
  return adaptProject(await api.put(`/projects/${id}`, toProjectRequest(form)));
}

export async function deleteProject(id) {
  return api.del(`/projects/${id}`);
}

export async function addProjectMember(projectId, { employeeId, role, allocationPercentage = 100, startDate, endDate } = {}) {
  return adaptMember(await api.post(`/projects/${projectId}/members`, { employeeId, role, allocationPercentage, startDate, endDate }));
}

export async function removeProjectMember(projectId, memberId) {
  return api.del(`/projects/${projectId}/members/${memberId}`);
}

export async function getProjectMembers(projectId) {
  const data = await api.get(`/projects/${projectId}/members`);
  return (data || []).map(adaptMember);
}

export async function createTask(projectId, form) {
  const body = {
    title: form.title,
    description: form.description || null,
    assigneeId: form.assigneeId || null,
    assigneeName: form.assigneeName || null,
    status: form.status || 'TODO',
    priority: form.priority || 'MEDIUM',
    startDate: form.startDate || null,
    dueDate: form.dueDate || null,
    estimatedHours: form.estimatedHours || 0,
    parentTaskId: form.parentTaskId || null,
  };
  return adaptTask(await api.post(`/projects/${projectId}/tasks`, body));
}

export async function updateTask(projectId, taskId, form) {
  const body = {
    title: form.title,
    description: form.description || null,
    assigneeId: form.assigneeId || null,
    assigneeName: form.assigneeName || null,
    status: form.status || 'TODO',
    priority: form.priority || 'MEDIUM',
    startDate: form.startDate || null,
    dueDate: form.dueDate || null,
    estimatedHours: form.estimatedHours || 0,
    parentTaskId: form.parentTaskId || null,
  };
  return adaptTask(await api.put(`/projects/${projectId}/tasks/${taskId}`, body));
}

export async function getProjectTasks(projectId) {
  const data = await api.get(`/projects/${projectId}/tasks`);
  return (data || []).map(adaptTask);
}

export async function deleteTask(projectId, taskId) {
  return api.del(`/projects/${projectId}/tasks/${taskId}`);
}

export async function getProjectDashboard(projectId) {
  return api.get(`/projects/${projectId}/dashboard`);
}
