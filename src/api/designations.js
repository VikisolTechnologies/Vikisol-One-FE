import { api } from './client';

export async function getAllDesignations() {
  const data = await api.get('/designations');
  return data || [];
}
