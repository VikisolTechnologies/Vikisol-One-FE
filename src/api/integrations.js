import { api } from './client';

export async function getIntegrations() {
  return api.get('/admin/integrations');
}

export async function saveIntegration({ type, enabled, config }) {
  return api.put('/admin/integrations', { type, enabled, config });
}

export async function testIntegrationConnection(type) {
  return api.post(`/admin/integrations/${type}/test`);
}
