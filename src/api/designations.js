import { api } from './client';

export async function getAllDesignations() {
  const data = await api.get('/designations');
  return data || [];
}

export async function createDesignation({ title, level, description }) {
  return api.post('/designations', { title, level: Number(level) || 0, description: description || null });
}

export async function updateDesignation(id, { title, level, description }) {
  return api.put(`/designations/${id}`, { title, level: Number(level) || 0, description: description || null });
}

export async function deleteDesignation(id) {
  return api.del(`/designations/${id}`);
}
