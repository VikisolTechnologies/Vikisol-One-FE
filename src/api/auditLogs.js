import { api } from './client';

export function adaptAuditLog(a) {
  if (!a) return null;
  return {
    id: a.id,
    action: a.action,
    target: a.target,
    details: a.details,
    user: a.performedByName || a.performedByEmail || 'System',
    ip: a.ipAddress || '-',
    timestamp: a.timestamp,
  };
}

export async function getAuditLogs({ page = 0, size = 50 } = {}) {
  const data = await api.get('/audit-logs', { page, size });
  return {
    items: (data.content || []).map(adaptAuditLog),
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}
