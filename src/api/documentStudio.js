import { api, fetchBlob } from './client';

export async function listTemplatesByType(documentType) {
  return api.get('/document-templates', { type: documentType });
}

export async function getTemplate(id) {
  return api.get(`/document-templates/${id}`);
}

export async function listVersions(templateGroupId) {
  return api.get(`/document-templates/group/${templateGroupId}/versions`);
}

export async function createDraft({ documentType, name, contentBlocksJson, bodyHtml }) {
  return api.post('/document-templates', { documentType, name, contentBlocksJson, bodyHtml });
}

export async function createNewVersion(templateGroupId, { documentType, name, contentBlocksJson, bodyHtml }) {
  return api.post(`/document-templates/group/${templateGroupId}/versions`, { documentType, name, contentBlocksJson, bodyHtml });
}

export async function duplicateTemplate(id, name) {
  return api.post(`/document-templates/${id}/duplicate${name ? `?name=${encodeURIComponent(name)}` : ''}`);
}

export async function publishTemplate(id) {
  return api.put(`/document-templates/${id}/publish`);
}

export async function rollbackTemplate(id) {
  return api.put(`/document-templates/${id}/rollback`);
}

export async function archiveTemplate(id) {
  return api.put(`/document-templates/${id}/archive`);
}

// Deliberate, one-click creation of the built-in default template pack (no-op per type if it
// already exists) - the production-safe alternative to relying on DataSeeder's dev-only auto-seed.
export async function seedDefaultTemplates() {
  return api.post('/document-templates/seed-defaults');
}

export async function seedOfferLetterTemplate() {
  return api.post('/document-templates/seed-offer-letter');
}

export async function listVariables(documentType) {
  return api.get('/template-variables', documentType ? { documentType } : undefined);
}

export async function createVariable({ key, label, description, documentType }) {
  return api.post('/template-variables', { key, label, description, documentType });
}

// Renders a preview PDF without storing it - returns a Blob the caller can open in an <iframe>
// or new tab via URL.createObjectURL.
export async function previewDocument({ documentType, employeeId, templateId, fields }) {
  return fetchBlob('/documents/preview', { documentType, employeeId, templateId, fields });
}
