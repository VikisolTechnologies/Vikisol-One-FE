import { api, uploadMultipart } from './client';
import { validateFile } from '../utils/fileValidation';

export async function getBranding() {
  return api.get('/branding');
}

export async function updateBranding(fields) {
  return api.put('/branding', fields);
}

// Uploads a branding asset (logo, signature, seal, letterhead, watermark, etc.) and returns its
// stored URL - the caller is responsible for then calling updateBranding({ [FIELD_KEY]: url }).
export async function uploadBrandingAsset(file, assetType) {
  const validationError = validateFile(file);
  if (validationError) throw new Error(validationError);
  const formData = new FormData();
  formData.append('file', file);
  const params = new URLSearchParams({ assetType });
  return uploadMultipart(`/files/upload-branding-asset?${params}`, formData);
}
