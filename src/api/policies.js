import { api } from './client';

export async function getPolicies(includeInactive = false) {
  return api.get('/policies', includeInactive ? { includeInactive: true } : undefined);
}

export async function getPolicy(id) {
  return api.get(`/policies/${id}`);
}

export async function createPolicy(payload) {
  return api.post('/policies', payload);
}

export async function updatePolicy(id, payload) {
  return api.put(`/policies/${id}`, payload);
}

export async function disablePolicy(id) {
  return api.del(`/policies/${id}`);
}

export async function recordPolicyView(id) {
  return api.post(`/policies/${id}/view`);
}

export async function acceptPolicy(id, signatureText) {
  return api.post(`/policies/${id}/accept`, { signatureText });
}

export async function getAcknowledgementStatus(id) {
  return api.get(`/policies/${id}/acknowledgement-status`);
}

export async function getPolicyAcknowledgements(id) {
  return api.get(`/policies/${id}/acknowledgements`);
}
