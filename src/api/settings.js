import { api } from './client';

// ---- Company settings ----

// Maps backend CompanySettingsResponse -> simple key/value record the SettingsPage form expects
export function adaptSetting(s) {
  if (!s) return null;
  return {
    id: s.id,
    key: s.key,
    value: s.value,
    category: s.category,
    description: s.description,
    dataType: s.dataType,
  };
}

export async function getAllSettings() {
  const data = await api.get('/settings/company');
  return (data || []).map(adaptSetting);
}

export async function getSettingsByCategory(category) {
  const data = await api.get(`/settings/company/${category}`);
  return (data || []).map(adaptSetting);
}

export async function updateSetting({ key, value, category, description, dataType }) {
  return adaptSetting(await api.put('/settings/company', { key, value, category, description, dataType }));
}

// ---- Holidays ----

const HOLIDAY_TYPE_TO_FE = { NATIONAL: 'National', REGIONAL: 'Regional', OPTIONAL: 'Optional', COMPANY: 'Company' };
const HOLIDAY_TYPE_TO_BE = { National: 'NATIONAL', Regional: 'REGIONAL', Optional: 'OPTIONAL', Company: 'COMPANY', Festival: 'COMPANY', Religious: 'COMPANY' };

// Maps backend HolidayResponse -> shape SettingsPage.jsx's Holidays tab expects
// (see generateHolidays in src/data/generator.js for the mock shape)
export function adaptHoliday(h) {
  if (!h) return null;
  return {
    id: h.id,
    name: h.name,
    date: h.date,
    type: HOLIDAY_TYPE_TO_FE[h.type] || h.type,
    optional: !!h.isOptional,
    year: h.year,
    description: h.description,
  };
}

export function toHolidayRequest(form) {
  return {
    name: form.name,
    date: form.date,
    type: HOLIDAY_TYPE_TO_BE[form.type] || 'COMPANY',
    isOptional: !!form.optional,
    description: form.description || null,
  };
}

export async function getHolidays(year = new Date().getFullYear()) {
  const data = await api.get('/settings/holidays', { year });
  return (data || []).map(adaptHoliday);
}

export async function createHoliday(form) {
  return adaptHoliday(await api.post('/settings/holidays', toHolidayRequest(form)));
}

export async function updateHoliday(id, form) {
  return adaptHoliday(await api.put(`/settings/holidays/${id}`, toHolidayRequest(form)));
}

export async function deleteHoliday(id) {
  return api.del(`/settings/holidays/${id}`);
}

// ---- Role Permissions (CEO controls what each role can see) ----

export async function getRolePermissionMatrix() {
  return api.get('/settings/role-permissions');
}

export async function updateRolePermissionMatrix(entries) {
  // entries: [{ role, module, canView }, ...]
  return api.put('/settings/role-permissions', entries);
}

export async function getMyVisibleModules() {
  return api.get('/settings/role-permissions/me');
}
