import { api } from './client';

export async function getAllDepartments() {
  const data = await api.get('/departments');
  return data || [];
}
