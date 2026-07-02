import { api } from './client';

const STATUS_TO_FE = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const LOCATION_TO_FE = { OFFICE: 'Office', REMOTE: 'Remote', CLIENT_LOCATION: 'Client Location' };
const LOCATION_TO_BE = { Office: 'OFFICE', Remote: 'REMOTE', 'Client Location': 'CLIENT_LOCATION' };

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
    project: e.projectName || 'Bench',
    projectId: e.projectId || '',
    billable: !!e.billable,
    task: e.taskTitle || '',
    taskId: e.taskId,
    weekStart: e.date,
    date: e.date,
    hours: [e.hours || 0],
    total: e.hours || 0,
    checkInTime: e.checkInTime || '',
    checkOutTime: e.checkOutTime || '',
    reason: e.reason || '',
    workLocation: LOCATION_TO_FE[e.workLocation] || 'Office',
    status: STATUS_TO_FE[e.status] || e.status,
    description: e.description || '',
    approvedBy: e.approvedById,
    submittedOn: e.date,
  };
}

// projectId of '' or falsy means Bench (non-billable, no project)
export async function createEntry({ projectId, taskId, date, hours, description, checkInTime, checkOutTime, reason, workLocation } = {}) {
  return adaptEntry(await api.post('/timesheets', {
    projectId: projectId || null, taskId: taskId || null, date, hours: hours ?? null, description: description || null,
    checkInTime: checkInTime || null, checkOutTime: checkOutTime || null, reason: reason || null,
    workLocation: LOCATION_TO_BE[workLocation] || 'OFFICE',
  }));
}

export async function updateEntry(id, { projectId, taskId, date, hours, description, checkInTime, checkOutTime, reason, workLocation } = {}) {
  return adaptEntry(await api.put(`/timesheets/${id}`, {
    projectId: projectId || null, taskId: taskId || null, date, hours: hours ?? null, description: description || null,
    checkInTime: checkInTime || null, checkOutTime: checkOutTime || null, reason: reason || null,
    workLocation: LOCATION_TO_BE[workLocation] || 'OFFICE',
  }));
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
