import { api } from './client';

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

export async function listVariables(documentType) {
  return api.get('/template-variables', documentType ? { documentType } : undefined);
}

export async function createVariable({ key, label, description, documentType }) {
  return api.post('/template-variables', { key, label, description, documentType });
}

// Renders a preview PDF without storing it - returns a Blob the caller can open in an <iframe>
// or new tab via URL.createObjectURL.
export async function previewDocument({ documentType, employeeId, templateId, fields }) {
  const token = localStorage.getItem('vikisol_token');
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const res = await fetch(`${BASE_URL}/documents/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ documentType, employeeId, templateId, fields }),
  });
  if (!res.ok) {
    let message = `Preview failed with status ${res.status}`;
    try {
      const json = await res.json();
      message = json?.message || message;
    } catch { /* not JSON */ }
    throw new Error(message);
  }
  return res.blob();
}
