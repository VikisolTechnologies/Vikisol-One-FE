import { api, fetchBlobGet, downloadBlob } from './client';

// Maps backend OrgChartNode -> flat employee-like shape compatible with what
// OrgChart.jsx derives from data.employees (name, designation, department, manager, empId)
function flattenNode(node, managerName = '', list = []) {
  if (!node) return list;
  list.push({
    id: node.id,
    empId: node.employeeId,
    name: node.name,
    designation: node.designation || '',
    department: node.department || '',
    location: '',
    status: 'Active',
    employmentType: '',
    profilePictureUrl: node.profilePictureUrl,
    manager: managerName,
  });
  (node.directReports || []).forEach(child => flattenNode(child, node.name, list));
  return list;
}

export function adaptOrgChartNode(node) {
  if (!node) return null;
  return {
    id: node.id,
    empId: node.employeeId,
    name: node.name,
    designation: node.designation || '',
    department: node.department || '',
    profilePictureUrl: node.profilePictureUrl,
    directReports: (node.directReports || []).map(adaptOrgChartNode),
  };
}

// Returns both the raw tree (adapted) and a flat list (employee-shaped) for
// pages that group/derive from a flat array like OrgChart.jsx does today.
export async function getFullOrgChart() {
  const data = await api.get('/org-chart');
  const roots = (data || []).map(adaptOrgChartNode);
  const flat = roots.flatMap(r => flattenNode(r));
  return { roots, flat };
}

export async function downloadOrgChartPdf() {
  const blob = await fetchBlobGet('/org-chart/pdf');
  downloadBlob(blob, 'Organization_Chart.pdf');
}

export async function getOrgChartFromEmployee(employeeId) {
  const node = adaptOrgChartNode(await api.get(`/org-chart/${employeeId}`));
  return { root: node, flat: flattenNode(node) };
}
