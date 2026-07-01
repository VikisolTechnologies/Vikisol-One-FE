import { api } from './client';

// Maps backend NotificationType -> the lowercase type tags the mock-driven UI expects
// (see generateNotifications in src/data/generator.js for the mock shape)
const TYPE_TO_FE = {
  LEAVE: 'leave',
  ATTENDANCE: 'attendance',
  PAYROLL: 'payroll',
  TICKET: 'system',
  PERFORMANCE: 'project',
  GENERAL: 'system',
  RECRUITMENT: 'interview',
  PROJECT: 'project',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

// Maps backend NotificationResponse -> shape NotificationCenter.jsx / Topbar.jsx expect
export function adaptNotification(n) {
  if (!n) return null;
  return {
    id: n.id,
    title: n.title,
    message: n.message || n.title,
    type: TYPE_TO_FE[n.type] || 'system',
    read: !!n.isRead,
    time: timeAgo(n.createdAt),
    date: n.createdAt,
    referenceId: n.referenceId,
    referenceType: n.referenceType,
  };
}

export async function getMyNotifications({ page = 0, size = 50 } = {}) {
  const data = await api.get('/notifications', { page, size });
  return {
    items: (data.content || []).map(adaptNotification),
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}

export async function getUnreadCount() {
  return api.get('/notifications/unread-count');
}

export async function markAsRead(id) {
  return api.put(`/notifications/${id}/read`);
}

export async function markAllAsRead() {
  return api.put('/notifications/read-all');
}
