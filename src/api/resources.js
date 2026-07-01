import { api } from './client';

// Maps backend Resource.ResourceCategory <-> simple display labels used in the FE
const CATEGORY_TO_FE = {
  POLICY: 'Policy',
  HANDBOOK: 'Handbook',
  TEMPLATE: 'Template',
  GUIDE: 'Guide',
  LINK: 'Link',
  OTHER: 'Other',
};
const CATEGORY_TO_BE = {
  Policy: 'POLICY',
  Handbook: 'HANDBOOK',
  Template: 'TEMPLATE',
  Guide: 'GUIDE',
  Link: 'LINK',
  Other: 'OTHER',
};

// Maps backend ResourceResponse -> a flat shape for FE consumption
export function adaptResource(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: CATEGORY_TO_FE[r.category] || r.category,
    fileUrl: r.fileUrl,
    externalLink: r.externalLink,
    isPublic: r.isPublic,
    uploadedById: r.uploadedById,
    uploadedBy: r.uploadedByName,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// Maps FE form shape -> backend ResourceRequest
export function toResourceRequest(form) {
  return {
    title: form.title,
    description: form.description || null,
    category: CATEGORY_TO_BE[form.category] || form.category || 'OTHER',
    fileUrl: form.fileUrl || null,
    externalLink: form.externalLink || null,
    isPublic: !!form.isPublic,
  };
}

export async function getAllResources() {
  const data = await api.get('/resources');
  return (data || []).map(adaptResource);
}

export async function getResource(id) {
  return adaptResource(await api.get(`/resources/${id}`));
}

export async function createResource(form) {
  return adaptResource(await api.post('/resources', toResourceRequest(form)));
}

export async function updateResource(id, form) {
  return adaptResource(await api.put(`/resources/${id}`, toResourceRequest(form)));
}

export async function deleteResource(id) {
  return api.del(`/resources/${id}`);
}

export async function getResourcesByCategory(category) {
  const data = await api.get(`/resources/category/${CATEGORY_TO_BE[category] || category}`);
  return (data || []).map(adaptResource);
}

export async function searchResources(q) {
  const data = await api.get('/resources/search', { q });
  return (data || []).map(adaptResource);
}
