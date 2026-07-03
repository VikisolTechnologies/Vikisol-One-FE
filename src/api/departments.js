import { api } from './client';

export async function getAllDepartments() {
  const data = await api.get('/departments');
  return data || [];
}

export async function createDepartment({ name, code, description }) {
  return api.post('/departments', { name, code: code || null, description: description || null, managerId: null });
}

export async function updateDepartment(id, { name, code, description }) {
  return api.put(`/departments/${id}`, { name, code: code || null, description: description || null, managerId: null });
}

export async function deleteDepartment(id) {
  return api.del(`/departments/${id}`);
}
