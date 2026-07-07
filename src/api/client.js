import { logError } from '../utils/logger';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

// For turning a stored relative fileUrl (e.g. "/files/documents/xyz.pdf") into an absolute link.
export function toFileUrl(relativeUrl) {
  if (!relativeUrl) return null;
  if (/^https?:\/\//.test(relativeUrl)) return relativeUrl;
  return BASE_URL + relativeUrl;
}

// The access/refresh tokens live in HttpOnly cookies now (see Phase 2 auth overhaul) - this app
// never reads or sets them directly. The one cookie JS does need is the CSRF double-submit token,
// which is deliberately NOT HttpOnly so it can be echoed back as a header (see CookieService on
// the backend for why this is safe).
function getCsrfToken() {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function csrfHeader() {
  const token = getCsrfToken();
  return token ? { 'X-XSRF-TOKEN': token } : {};
}

// Shared multipart-upload path - previously duplicated (with slightly different error handling
// each time) across api/documents.js, api/branding.js, and api/documentStudio.js, each
// re-reading localStorage/rebuilding BASE_URL by hand instead of going through this module.
export async function uploadMultipart(path, formData) {
  let res;
  try {
    res = await fetch(BASE_URL + path, {
      method: 'POST',
      credentials: 'include',
      headers: csrfHeader(),
      body: formData,
    });
  } catch (err) {
    const networkError = new ApiError('Network error - check your connection and try again', 0, null);
    networkError.category = 'network';
    logError('api.network_error', networkError, { path, method: 'POST (multipart)' });
    throw networkError;
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || (json && json.success === false)) {
    const message = json?.message || `Upload failed with status ${res.status}`;
    const apiError = new ApiError(message, res.status, json);
    logError('api.upload_failed', apiError, { path });
    throw apiError;
  }
  return json?.data;
}

// Shared "POST JSON, get a blob back" path - used for PDF previews (documentStudio.js) where the
// response is a raw file stream, not the usual { success, data } JSON envelope.
export async function fetchBlob(path, body) {
  const res = await fetch(BASE_URL + path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...csrfHeader() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const json = await res.json();
      message = json?.message || message;
    } catch { /* body wasn't JSON (likely a raw file stream on success, or empty on error) */ }
    const apiError = new ApiError(message, res.status, null);
    logError('api.request_failed', apiError, { path });
    throw apiError;
  }
  return res.blob();
}

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

// Classifies a failure into the categories the request spec calls for (network, auth, authz,
// server, timeout, validation) so callers/logs can distinguish "you're not allowed to do this"
// from "the server is down" instead of every failure looking like an identical generic error.
function classifyStatus(status) {
  if (status === 401) return 'authentication';
  if (status === 403) return 'authorization';
  if (status === 400 || status === 422) return 'validation';
  if (status === 408) return 'timeout';
  if (status >= 500) return 'server';
  return 'unknown';
}

// A single in-flight refresh is shared by every request that hits a 401 at the same time (e.g.
// five widgets fetching in parallel right as the access token expires) - without this, each one
// would race to call /auth/refresh independently, and refresh-token rotation means only the
// first of those would actually succeed (the rest would see an already-rotated-away token and
// trip the reuse-detection kill switch, logging the user out for no real reason).
let refreshPromise = null;
async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(BASE_URL + '/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: csrfHeader(),
    }).then(res => res.ok).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function doFetch(url, method, headers, body) {
  return fetch(url, { method, credentials: 'include', headers, body });
}

async function request(path, { method = 'GET', body, params, auth = true, _retried = false } = {}) {
  const url = new URL(BASE_URL + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }

  const headers = { 'Content-Type': 'application/json' };
  if (auth) Object.assign(headers, csrfHeader());

  let res;
  try {
    res = await doFetch(url.toString(), method, headers, body !== undefined ? JSON.stringify(body) : undefined);
  } catch (err) {
    // fetch() itself throws on DNS failure/offline/CORS - this is a genuine network error, not
    // an API response at all, so it needs its own category rather than falling through below.
    const networkError = new ApiError('Network error - check your connection and try again', 0, null);
    networkError.category = 'network';
    logError('api.network_error', networkError, { path, method });
    throw networkError;
  }

  // Access token expired mid-session (normal, happens every ~15 min) - try exactly one silent
  // refresh-and-retry before treating this as a real "you're logged out" event. Never attempted
  // for the login call itself (auth=false) or for /auth/refresh's own request.
  if (res.status === 401 && auth && !_retried && path !== '/auth/refresh') {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request(path, { method, body, params, auth, _retried: true });
    }
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    // no body
  }

  if (res.status === 401 && auth) {
    if (onUnauthorized) onUnauthorized();
    const authError = new ApiError('Session expired, please log in again', 401, null);
    authError.category = 'authentication';
    logError('api.auth_error', authError, { path, method });
    throw authError;
  }

  if (!res.ok || (json && json.success === false)) {
    const message = json?.message || `Request failed with status ${res.status}`;
    const apiError = new ApiError(message, res.status, json);
    apiError.category = classifyStatus(res.status);
    // 403s are routine (a role trying an action it doesn't have) - log as a warning-level event
    // via a distinct name rather than the generic error bucket, so real server errors aren't
    // drowned out by expected permission checks in whatever log sink eventually reads this.
    logError(apiError.category === 'authorization' ? 'api.permission_denied' : 'api.request_failed', apiError, { path, method });
    throw apiError;
  }

  return json?.data;
}

// window.open()/a plain <a href> navigation can't attach cookies cross-context reliably for a
// blob download, so this still goes through fetch() + a synthetic <a> click, same as before -
// just with credentials:'include' now instead of an Authorization header.
export async function downloadFile(relativeOrAbsoluteUrl, suggestedFileName) {
  const url = toFileUrl(relativeOrAbsoluteUrl);
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    let message = `Download failed with status ${res.status}`;
    try {
      const json = await res.json();
      message = json?.message || message;
    } catch { /* body wasn't JSON (likely a raw file stream) */ }
    throw new ApiError(message, res.status, null);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const fileName = match?.[1] || suggestedFileName || 'document.pdf';

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export const api = {
  get: (path, params) => request(path, { method: 'GET', params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  noAuth: {
    get: (path, params) => request(path, { method: 'GET', params, auth: false }),
    post: (path, body) => request(path, { method: 'POST', body, auth: false }),
  },
};
