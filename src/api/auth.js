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

export async function inspectActivationToken(token) {
  return api.noAuth.get(`/auth/activate/${token}`);
}

export async function activateAccount(token, password) {
  return api.noAuth.post('/auth/activate', { token, password });
}
