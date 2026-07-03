import { api } from './client';

// Maps backend LeaveRequestResponse -> shape the mock-driven LeaveManagement.jsx UI expects
// (see generateLeaveRequests in src/data/generator.js for the mock shape)
export function adaptLeaveRequest(l) {
  if (!l) return null;
  return {
    id: l.id,
    empName: l.employeeName,
    empId: l.employeeId,
    department: l.department || '',
    type: l.leaveType,
    from: l.startDate,
    to: l.endDate,
    days: l.numberOfDays,
    reason: l.reason,
    status: l.status ? l.status.charAt(0) + l.status.slice(1).toLowerCase() : l.status,
    appliedOn: l.appliedOn ? l.appliedOn.split('T')[0] : l.appliedOn,
    approver: l.approverName,
    approverComments: l.approverComments,
    isHalfDay: l.isHalfDay,
    approvedBy: l.status === 'APPROVED' ? l.approverName : undefined,
    rejectedBy: l.status === 'REJECTED' ? l.approverName : undefined,
    rejectedReason: l.status === 'REJECTED' ? l.approverComments : undefined,
  };
}

export function adaptLeaveType(t) {
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    code: t.code,
    defaultDays: t.defaultDays,
    carryForward: t.carryForward,
    maxCarryForwardDays: t.maxCarryForwardDays,
    isActive: t.isActive,
  };
}

export function adaptLeaveBalance(b) {
  if (!b) return null;
  return {
    type: b.leaveType,
    total: b.totalDays,
    used: b.usedDays,
    remaining: b.remainingDays,
    carryForward: b.carryForwardDays,
    year: b.year,
  };
}

export async function getLeaveTypes() {
  const data = await api.get('/leaves/types');
  return (data || []).map(adaptLeaveType);
}

// CEO-configurable leave type quotas (Casual/Earned/Sick/Comp Off/etc).
export async function createLeaveType({ name, code, defaultDays, carryForward = false, maxCarryForwardDays = 0 }) {
  return adaptLeaveType(await api.post('/leaves/types', { name, code, defaultDays: Number(defaultDays), carryForward, maxCarryForwardDays: Number(maxCarryForwardDays) || 0 }));
}

export async function updateLeaveType(id, { name, code, defaultDays, carryForward = false, maxCarryForwardDays = 0 }) {
  return adaptLeaveType(await api.put(`/leaves/types/${id}`, { name, code, defaultDays: Number(defaultDays), carryForward, maxCarryForwardDays: Number(maxCarryForwardDays) || 0 }));
}

export async function deleteLeaveType(id) {
  return api.del(`/leaves/types/${id}`);
}

export async function applyLeave(form) {
  const body = {
    leaveTypeId: form.leaveTypeId,
    startDate: form.from,
    endDate: form.to,
    reason: form.reason,
    isHalfDay: !!form.isHalfDay,
    halfDayType: form.halfDayType || null,
  };
  return adaptLeaveRequest(await api.post('/leaves/apply', body));
}

export async function processLeaveAction(id, action, comments = '') {
  return adaptLeaveRequest(await api.put(`/leaves/${id}/action`, { action, comments }));
}

export async function cancelLeave(id) {
  return api.put(`/leaves/${id}/cancel`);
}

export async function getMyLeaveRequests({ page = 0, size = 100 } = {}) {
  const data = await api.get('/leaves/my-requests', { page, size });
  return {
    items: (data.content || []).map(adaptLeaveRequest),
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}

export async function getMyBalances(year = new Date().getFullYear()) {
  const data = await api.get('/leaves/my-balances', { year });
  return (data || []).map(adaptLeaveBalance);
}

export async function getPendingApprovals({ page = 0, size = 100 } = {}) {
  const data = await api.get('/leaves/pending-approvals', { page, size });
  return {
    items: (data.content || []).map(adaptLeaveRequest),
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}

export async function getTeamLeaveRequests({ page = 0, size = 100 } = {}) {
  const data = await api.get('/leaves/team', { page, size });
  return {
    items: (data.content || []).map(adaptLeaveRequest),
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}
