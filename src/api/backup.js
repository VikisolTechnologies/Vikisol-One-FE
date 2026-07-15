import { fetchBlobGet, downloadBlob, uploadMultipart } from './client';

export async function exportBackup() {
  const blob = await fetchBlobGet('/admin/backup/export');
  downloadBlob(blob, `VikisolOne_Backup_${new Date().toISOString().split('T')[0]}.json`);
}

export async function restoreBackup(file) {
  const formData = new FormData();
  formData.append('file', file);
  return uploadMultipart('/admin/backup/restore', formData);
}
