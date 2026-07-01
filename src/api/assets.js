import { api } from './client';

const CATEGORY_TO_FE = {
  LAPTOP: 'Laptop', DESKTOP: 'Monitor', MONITOR: 'Monitor', PHONE: 'SIM', HEADSET: 'Headset',
  FURNITURE: 'General', VEHICLE: 'General', SOFTWARE_LICENSE: 'Software License', OTHER: 'Access Card',
};
const CATEGORY_TO_BE = {
  Laptop: 'LAPTOP', Monitor: 'MONITOR', Keyboard: 'OTHER', Mouse: 'OTHER', Headset: 'HEADSET',
  'ID Card': 'OTHER', SIM: 'PHONE', 'Software License': 'SOFTWARE_LICENSE', 'Access Card': 'OTHER',
};

const STATUS_TO_FE = { AVAILABLE: 'Available', ASSIGNED: 'Assigned', IN_REPAIR: 'Under Repair', RETIRED: 'Disposed', LOST: 'Disposed' };

const CONDITION_TO_FE = { NEW: 'Excellent', GOOD: 'Good', FAIR: 'Fair', POOR: 'Needs Repair' };
const CONDITION_TO_BE = { Excellent: 'NEW', Good: 'GOOD', Fair: 'FAIR', 'Needs Repair': 'POOR' };

// Maps backend AssetResponse -> shape the existing mock-driven UI expects
export function adaptAsset(a) {
  if (!a) return null;
  return {
    id: a.id,
    assetTag: a.assetTag,
    type: CATEGORY_TO_FE[a.category] || a.category,
    name: a.name,
    serial: a.serialNumber || a.assetTag || '',
    assignedTo: null,
    assignedToId: null,
    status: STATUS_TO_FE[a.status] || a.status,
    assignedDate: null,
    purchaseDate: a.purchaseDate,
    warranty: a.warrantyEndDate ? `Until ${a.warrantyEndDate}` : '',
    cost: a.purchasePrice != null ? `₹${a.purchasePrice}` : '',
    vendor: a.brand || '',
    location: a.location || '',
    condition: CONDITION_TO_FE[a.condition] || a.condition,
    notes: a.notes,
  };
}

export function adaptAssignment(a) {
  if (!a) return null;
  return {
    id: a.id,
    assetId: a.assetId,
    assetTag: a.assetTag,
    assetName: a.assetName,
    employeeId: a.employeeId,
    employeeName: a.employeeName,
    assignedDate: a.assignedDate,
    returnDate: a.returnDate,
    condition: CONDITION_TO_FE[a.conditionAtAssignment] || a.conditionAtAssignment,
    returnCondition: CONDITION_TO_FE[a.conditionAtReturn] || a.conditionAtReturn,
    remarks: a.remarks,
    isActive: a.isActive,
  };
}

export function toAssetRequest(form) {
  return {
    name: form.name,
    category: CATEGORY_TO_BE[form.type] || 'OTHER',
    brand: form.vendor || null,
    model: null,
    serialNumber: form.serial || null,
    purchaseDate: form.purchaseDate || new Date().toISOString().split('T')[0],
    purchasePrice: form.cost ? Number(String(form.cost).replace(/[^\d.]/g, '')) || null : null,
    warrantyEndDate: null,
    condition: CONDITION_TO_BE[form.condition] || 'NEW',
    location: form.location || null,
    notes: null,
  };
}

export async function getAllAssets({ page = 0, size = 200 } = {}) {
  const data = await api.get('/assets', { page, size });
  return { items: (data.content || []).map(adaptAsset), totalElements: data.totalElements, totalPages: data.totalPages };
}

export async function getAsset(id) {
  return adaptAsset(await api.get(`/assets/${id}`));
}

export async function createAsset(form) {
  return adaptAsset(await api.post('/assets', toAssetRequest(form)));
}

export async function updateAsset(id, form) {
  return adaptAsset(await api.put(`/assets/${id}`, toAssetRequest(form)));
}

export async function deleteAsset(id) {
  return api.del(`/assets/${id}`);
}

export async function getAvailableAssets() {
  const data = await api.get('/assets/available');
  return (data || []).map(adaptAsset);
}

export async function getEmployeeAssets(employeeId) {
  const data = await api.get(`/assets/employee/${employeeId}`);
  return (data || []).map(adaptAssignment);
}

export async function assignAsset(assetId, employeeId, remarks) {
  return adaptAssignment(await api.post('/assets/assign', { assetId, employeeId, remarks }));
}

export async function returnAsset(assetId, condition, remarks) {
  return adaptAssignment(await api.post('/assets/return', { assetId, condition: CONDITION_TO_BE[condition] || 'GOOD', remarks }));
}
