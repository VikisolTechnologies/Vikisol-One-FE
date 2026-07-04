import { api } from './client';

// Maps backend Document.DocumentType <-> FE category labels used by DocumentsPage
const TYPE_TO_FE = {
  OFFER_LETTER: 'Employment',
  APPOINTMENT_LETTER: 'Employment',
  ID_PROOF: 'Legal',
  ADDRESS_PROOF: 'Legal',
  EDUCATION_CERTIFICATE: 'Training',
  EXPERIENCE_LETTER: 'Employment',
  PAYSLIP: 'Compensation',
  TAX_FORM: 'Compensation',
  OTHER: 'General',
};
const CATEGORY_TO_TYPE = {
  Employment: 'OFFER_LETTER',
  Legal: 'ID_PROOF',
  Compensation: 'PAYSLIP',
  Benefits: 'OTHER',
  Policy: 'OTHER',
  Performance: 'OTHER',
  Disciplinary: 'OTHER',
  Training: 'EDUCATION_CERTIFICATE',
  General: 'OTHER',
};

function formatSize(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// Maps backend DocumentResponse -> shape DocumentsPage expects (matches generateDocuments mock shape)
export function adaptDocument(d) {
  if (!d) return null;
  return {
    id: d.id,
    name: d.title,
    type: (d.mimeType || '').includes('pdf') ? 'PDF' : (d.fileName || '').split('.').pop()?.toUpperCase() || 'FILE',
    category: TYPE_TO_FE[d.type] || 'General',
    date: d.createdAt ? d.createdAt.split('T')[0] : '',
    size: formatSize(d.fileSize),
    uploadedBy: d.employeeName || '',
    status: d.isVerified ? 'Active' : 'Pending Approval',
    version: 'v1.0',
    employee: d.employeeName || '',
    empId: d.employeeId || '',
    signed: d.isVerified,
    fileUrl: d.fileUrl,
    description: d.description,
    expiryDate: d.expiryDate,
    verifiedBy: d.verifiedByName,
    verifiedDate: d.verifiedDate,
    employeeId: d.employeeId,
  };
}

// Step 1: upload the raw file bytes, returns the stored fileUrl. Files are organized in
// Cloudinary under employees/{entityId}/documents/ - entityId should be a stable identifier
// (the employee's UUID), never their name (names change, IDs don't).
export async function uploadFile(file, entityId) {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('vikisol_token');
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const params = new URLSearchParams({ entityId: entityId || 'unspecified', documentType: 'documents' });
  const res = await fetch(`${BASE_URL}/files/upload?${params}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || (json && json.success === false)) {
    throw new Error(json?.message || `File upload failed with status ${res.status}`);
  }
  return json?.data;
}

// Step 2: create the document metadata record referencing the uploaded file's URL
export async function createDocumentRecord({ employeeId, title, fileUrl, fileName, fileSize, mimeType, description, category }) {
  const body = {
    employeeId,
    title,
    type: CATEGORY_TO_TYPE[category] || 'OTHER',
    fileUrl,
    fileName: fileName || null,
    fileSize: fileSize || 0,
    mimeType: mimeType || null,
    description: description || null,
  };
  return adaptDocument(await api.post('/documents', body));
}

// Combined helper: upload the file then create the metadata record
export async function uploadDocument({ employeeId, title, category, description, file }) {
  let fileUrl = null;
  let fileName = null;
  let fileSize = 0;
  let mimeType = null;
  if (file) {
    fileUrl = await uploadFile(file, employeeId);
    fileName = file.name;
    fileSize = file.size;
    mimeType = file.type;
  }
  return createDocumentRecord({ employeeId, title, fileUrl, fileName, fileSize, mimeType, description, category });
}

export async function getEmployeeDocuments(employeeId) {
  const data = await api.get(`/documents/employee/${employeeId}`);
  return (data || []).map(adaptDocument);
}

export async function getMyDocuments() {
  const data = await api.get('/documents/my');
  return (data || []).map(adaptDocument);
}

export async function verifyDocument(id) {
  return adaptDocument(await api.put(`/documents/${id}/verify`));
}

export async function getUnverifiedDocuments() {
  const data = await api.get('/documents/unverified');
  return (data || []).map(adaptDocument);
}

export async function deleteDocument(id) {
  return api.del(`/documents/${id}`);
}
