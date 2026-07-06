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

// Public auth-feature flags (login page reads these to decide what to show, e.g. whether the
// Microsoft button should render as usable at all).
export async function getAuthSettings() {
  return api.noAuth.get('/auth-settings');
}

export async function updateAuthSettings(flatMap) {
  return api.put('/auth-settings', flatMap);
}

// Forgot/reset password - never reveals whether an account exists; reset link goes to the
// employee's personal/recovery email, not their official one.
export async function requestPasswordReset(officialEmail) {
  return api.noAuth.post('/auth/forgot-password', { officialEmail });
}

export async function inspectResetToken(token) {
  return api.noAuth.get(`/auth/reset-password/${token}`);
}

export async function resetPasswordWithToken(token, newPassword) {
  return api.noAuth.post('/auth/reset-password', { token, newPassword });
}
