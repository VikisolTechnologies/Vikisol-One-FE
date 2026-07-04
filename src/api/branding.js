import { api } from './client';

export async function getBranding() {
  return api.get('/branding');
}

export async function updateBranding(fields) {
  return api.put('/branding', fields);
}

// Uploads a branding asset (logo, signature, seal, letterhead, watermark, etc.) and returns its
// stored URL - the caller is responsible for then calling updateBranding({ [FIELD_KEY]: url }).
export async function uploadBrandingAsset(file, assetType) {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('vikisol_token');
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const params = new URLSearchParams({ assetType });
  const res = await fetch(`${BASE_URL}/files/upload-branding-asset?${params}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || (json && json.success === false)) {
    throw new Error(json?.message || `Asset upload failed with status ${res.status}`);
  }
  return json?.data;
}
