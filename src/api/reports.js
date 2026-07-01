import { api } from './client';

// Maps backend DashboardStats -> shape used by dashboard-style widgets
export function adaptDashboardStats(d) {
  if (!d) return null;
  return {
    totalEmployees: d.totalEmployees || 0,
    activeEmployees: d.activeEmployees || 0,
    newJoineesThisMonth: d.newJoineesThisMonth || 0,
    onNoticeCount: d.onNoticeCount || 0,
    departmentWiseCount: d.departmentWiseCount || {},
    genderDistribution: d.genderDistribution || {},
    employmentTypeDistribution: d.employmentTypeDistribution || {},
  };
}

export async function getDashboardStats() {
  return adaptDashboardStats(await api.get('/reports/dashboard'));
}

export function adaptAttendanceReport(a) {
  if (!a) return null;
  return {
    employeeName: a.employeeName,
    employeeId: a.employeeId,
    presentDays: a.presentDays,
    absentDays: a.absentDays,
    halfDays: a.halfDays,
    leaveDays: a.leaveDays,
    avgWorkingHours: a.avgWorkingHours,
    month: a.month,
    year: a.year,
  };
}

export async function getAttendanceReport(month, year) {
  const data = await api.get('/reports/attendance', { month, year });
  return (data || []).map(adaptAttendanceReport);
}

export function adaptPayrollReport(p) {
  if (!p) return null;
  return {
    month: p.month,
    year: p.year,
    totalGrossPay: Number(p.totalGrossPay) || 0,
    totalNetPay: Number(p.totalNetPay) || 0,
    totalPF: Number(p.totalPF) || 0,
    totalESI: Number(p.totalESI) || 0,
    totalTDS: Number(p.totalTDS) || 0,
    departmentWiseCost: p.departmentWiseCost || {},
  };
}

export async function getPayrollReport(month, year) {
  return adaptPayrollReport(await api.get('/reports/payroll', { month, year }));
}

export function adaptHeadcountReport(h) {
  if (!h) return null;
  return {
    date: h.date,
    totalHeadcount: h.totalHeadcount || 0,
    departmentWise: h.departmentWise || {},
    designationWise: h.designationWise || {},
    newJoinees: h.newJoinees || 0,
    exits: h.exits || 0,
  };
}

export async function getHeadcountReport(date) {
  return adaptHeadcountReport(await api.get('/reports/headcount', { date }));
}
