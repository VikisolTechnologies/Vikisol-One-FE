import { api } from './client';

export function adaptAnnouncement(a) {
  if (!a) return null;
  return {
    id: a.id,
    title: a.title,
    message: a.message,
    priority: a.priority,
    postedByName: a.postedByName,
    createdAt: a.createdAt,
  };
}

export async function getAllAnnouncements() {
  const data = await api.get('/announcements');
  return (data || []).map(adaptAnnouncement);
}

export async function createAnnouncement({ title, message, priority = 'NORMAL' }) {
  return adaptAnnouncement(await api.post('/announcements', { title, message, priority }));
}

export async function updateAnnouncement(id, { title, message, priority = 'NORMAL' }) {
  return adaptAnnouncement(await api.put(`/announcements/${id}`, { title, message, priority }));
}

export async function deleteAnnouncement(id) {
  return api.del(`/announcements/${id}`);
}
