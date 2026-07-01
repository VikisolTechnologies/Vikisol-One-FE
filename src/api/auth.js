import { api, setToken } from './client';

export async function login(email, password) {
  const data = await api.noAuth.post('/auth/login', { email, password });
  setToken(data.token);
  return data;
}

export async function fetchMe() {
  return api.get('/auth/me');
}

export function logout() {
  setToken(null);
}
