import { api } from './client';

// No token handling here anymore - login sets HttpOnly cookies directly on the response (see
// Phase 2 auth overhaul); this call just returns the profile fields the login screen needs
// immediately (email/role/name/passwordExpired) plus mfaRequired/challengeToken when a second
// factor is needed before the real session exists.
export async function login(email, password, remember = false) {
  return api.noAuth.post('/auth/login', { email, password, remember });
}

export async function verifyMfa(challengeToken, code, remember = false) {
  return api.noAuth.post('/auth/mfa/verify', { challengeToken, code, remember });
}

export async function fetchMe() {
  return api.get('/auth/me');
}

// Real server-side logout now - revokes the current session/refresh-token family and clears
// cookies (previously this was a client-side-only localStorage.removeItem with no server call).
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Logging out should never get "stuck" on a network hiccup - the frontend clears its own
    // state regardless (see AuthContext.clearSession).
  }
}

export async function changePassword(oldPassword, newPassword) {
  return api.post('/auth/change-password', { oldPassword, newPassword });
}

export async function getLoginHistory({ size = 100 } = {}) {
  return api.get('/login-history', { size });
}

export async function getMyLoginHistory({ size = 50 } = {}) {
  return api.get('/login-history/me', { size });
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

// Active Sessions / Devices (My Security + Security Center)
export async function getMySessions() {
  return api.get('/sessions/me');
}

export async function getAllSessions() {
  return api.get('/sessions');
}

export async function revokeSession(id) {
  return api.post(`/sessions/${id}/revoke`);
}

export async function revokeAllMySessions() {
  return api.post('/sessions/revoke-all');
}

export async function forceLogoutUser(userEmail) {
  return api.post(`/sessions/force-logout/${encodeURIComponent(userEmail)}`);
}

// MFA (My Security)
export async function getMfaStatus() {
  return api.get('/auth/mfa/status');
}

export async function startMfaSetup() {
  return api.post('/auth/mfa/setup');
}

export async function enableMfa(code) {
  return api.post('/auth/mfa/enable', { code });
}

export async function disableMfa(password) {
  return api.post('/auth/mfa/disable', { password });
}

// Email Templates (Security Center)
export async function getEmailTemplates() {
  return api.get('/email-templates');
}

export async function updateEmailTemplate(key, subject, bodyHtml) {
  return api.put(`/email-templates/${key}`, { subject, bodyHtml });
}

export async function resetEmailTemplate(key) {
  return api.post(`/email-templates/${key}/reset`);
}
