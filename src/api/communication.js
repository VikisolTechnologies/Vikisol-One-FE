import { api } from './client';

// Fetches the outbound-email audit log (Communication Center), CEO/HR_MANAGER/ADMIN only.
export async function getEmails({ page = 0, size = 20, category, status, fromDate, toDate, search } = {}) {
  const data = await api.get('/communication/emails', { page, size, category, status, fromDate, toDate, search });
  return {
    items: data.content || [],
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}
