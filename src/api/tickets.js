import { api } from './client';

const CATEGORY_TO_FE = { IT: 'Software', HR: 'HR Issue', ADMIN: 'General', FINANCE: 'Payroll Issue', FACILITIES: 'Facility' };
const CATEGORY_TO_BE = {
  Hardware: 'IT', Software: 'IT', Network: 'IT', Email: 'IT', VPN: 'IT', Access: 'IT', Laptop: 'IT', Monitor: 'IT', Printer: 'IT',
  'HR Issue': 'HR', 'Payroll Issue': 'FINANCE', Facility: 'FACILITIES', Travel: 'ADMIN', General: 'ADMIN',
};

const PRIORITY_TO_FE = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' };
const PRIORITY_TO_BE = { Low: 'LOW', Medium: 'MEDIUM', High: 'HIGH', Critical: 'CRITICAL' };

const STATUS_TO_FE = { OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed', REOPENED: 'Open' };
const STATUS_TO_BE = {
  Open: 'OPEN', 'In Progress': 'IN_PROGRESS', Resolved: 'RESOLVED', Closed: 'CLOSED',
  'Waiting on User': 'IN_PROGRESS', Escalated: 'IN_PROGRESS',
};

// Maps backend TicketResponse -> shape the existing mock-driven UI expects
export function adaptTicket(t) {
  if (!t) return null;
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    title: t.title,
    category: CATEGORY_TO_FE[t.category] || t.category,
    priority: PRIORITY_TO_FE[t.priority] || t.priority,
    status: STATUS_TO_FE[t.status] || t.status,
    raisedBy: t.raisedByName,
    raisedByEmpId: t.raisedById,
    raisedByDept: '',
    assignee: t.assignedToName || 'Unassigned',
    assignedToId: t.assignedToId,
    date: t.createdAt ? t.createdAt.split('T')[0] : '',
    description: t.description,
    comments: t.comments ? t.comments.length : 0,
    commentList: (t.comments || []).map(adaptComment),
    attachments: 0,
    sla: '24 hours',
    resolution: t.resolutionComments || null,
  };
}

export function adaptComment(c) {
  if (!c) return null;
  return {
    id: c.id,
    by: c.commentByName,
    comment: c.comment,
    isInternal: c.isInternal,
    date: c.createdAt,
  };
}

export function toTicketRequest(form) {
  return {
    title: form.title,
    description: form.description || '',
    category: CATEGORY_TO_BE[form.category] || 'ADMIN',
    priority: PRIORITY_TO_BE[form.priority] || 'MEDIUM',
  };
}

export async function raiseTicket(form) {
  return adaptTicket(await api.post('/tickets', toTicketRequest(form)));
}

export async function getAllTickets({ page = 0, size = 100 } = {}) {
  const data = await api.get('/tickets', { page, size });
  return { items: (data.content || []).map(adaptTicket), totalElements: data.totalElements, totalPages: data.totalPages };
}

export async function getMyTickets({ page = 0, size = 100 } = {}) {
  const data = await api.get('/tickets/my', { page, size });
  return { items: (data.content || []).map(adaptTicket), totalElements: data.totalElements, totalPages: data.totalPages };
}

export async function getAssignedTickets({ page = 0, size = 100 } = {}) {
  const data = await api.get('/tickets/assigned', { page, size });
  return { items: (data.content || []).map(adaptTicket), totalElements: data.totalElements, totalPages: data.totalPages };
}

export async function getTicket(id) {
  return adaptTicket(await api.get(`/tickets/${id}`));
}

export async function assignTicket(id, assignedToId) {
  return adaptTicket(await api.put(`/tickets/${id}/assign`, { assignedToId }));
}

export async function updateTicketStatus(id, status, comments) {
  return adaptTicket(await api.put(`/tickets/${id}/status`, { status: STATUS_TO_BE[status] || status, comments }));
}

export async function addTicketComment(id, comment, isInternal = false) {
  return adaptComment(await api.post(`/tickets/${id}/comments`, { comment, isInternal }));
}
