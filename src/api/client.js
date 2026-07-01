const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

function getToken() {
  return localStorage.getItem('vikisol_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('vikisol_token', token);
  else localStorage.removeItem('vikisol_token');
}

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(path, { method = 'GET', body, params, auth = true } = {}) {
  const url = new URL(BASE_URL + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }

  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    if (onUnauthorized) onUnauthorized();
    throw new ApiError('Session expired, please log in again', 401, null);
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    // no body
  }

  if (!res.ok || (json && json.success === false)) {
    const message = json?.message || `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, json);
  }

  return json?.data;
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
    post: (path, body) => request(path, { method: 'POST', body, auth: false }),
  },
};
