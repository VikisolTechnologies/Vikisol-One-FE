import { api } from './client';

const STATUS_TO_FE = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

// Maps backend TimesheetEntryResponse -> shape the mock-driven TimesheetPage.jsx UI expects
// (see generateTimesheets in src/data/generator.js for the mock shape). Each backend entry is a
// single day/project/hours row rather than a weekly grid, so the FE list view treats one entry as one row.
export function adaptEntry(e) {
  if (!e) return null;
  return {
    id: e.id,
    empId: e.employeeId,
    empName: e.employeeName,
    department: '',
    project: e.projectName || '',
    projectId: e.projectId,
    task: e.taskTitle || '',
    taskId: e.taskId,
    weekStart: e.date,
    date: e.date,
    hours: [e.hours || 0],
    total: e.hours || 0,
    status: STATUS_TO_FE[e.status] || e.status,
    description: e.description || '',
    approvedBy: e.approvedById,
    submittedOn: e.date,
  };
}

export async function createEntry({ projectId, taskId, date, hours, description } = {}) {
  return adaptEntry(await api.post('/timesheets', { projectId, taskId: taskId || null, date, hours, description: description || null }));
}

export async function updateEntry(id, { projectId, taskId, date, hours, description } = {}) {
  return adaptEntry(await api.put(`/timesheets/${id}`, { projectId, taskId: taskId || null, date, hours, description: description || null }));
}

export async function submitEntries(entryIds) {
  return api.post('/timesheets/submit', { entryIds });
}

export async function approveEntry(id) {
  return adaptEntry(await api.put(`/timesheets/${id}/action?action=APPROVE`));
}

export async function rejectEntry(id) {
  return adaptEntry(await api.put(`/timesheets/${id}/action?action=REJECT`));
}

export async function getMyEntries(start, end) {
  const data = await api.get('/timesheets/my', { start, end });
  return (data || []).map(adaptEntry);
}

export async function getTeamEntries(start, end) {
  const data = await api.get('/timesheets/team', { start, end });
  return (data || []).map(adaptEntry);
}

export async function getProjectEntries(projectId, start, end) {
  const data = await api.get(`/timesheets/project/${projectId}`, { start, end });
  return (data || []).map(adaptEntry);
}
