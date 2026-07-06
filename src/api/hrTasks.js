import { api } from './client';

export async function getHrTaskCenter() {
  return api.get('/hr-tasks');
}
