import { api } from './client';

// Maps backend PayslipResponse -> shape the existing mock-driven UI expects (see data/generator.js generatePayslips)
export function adaptPayslip(p) {
  if (!p) return null;
  const earnings = [
    { component: 'Basic Salary', amount: Number(p.basicSalary) || 0 },
    { component: 'HRA', amount: Number(p.hra) || 0 },
    { component: 'Conveyance Allowance', amount: Number(p.conveyanceAllowance) || 0 },
    { component: 'Medical Allowance', amount: Number(p.medicalAllowance) || 0 },
    { component: 'Special Allowance', amount: Number(p.specialAllowance) || 0 },
    ...(Number(p.otherEarnings) > 0 ? [{ component: 'Other Earnings', amount: Number(p.otherEarnings) }] : []),
  ].filter(e => e.amount > 0);

  const deductions = [
    { component: 'Provident Fund', amount: Number(p.pfEmployee) || 0 },
    ...(Number(p.esiEmployee) > 0 ? [{ component: 'ESI', amount: Number(p.esiEmployee) }] : []),
    { component: 'Professional Tax', amount: Number(p.professionalTax) || 0 },
    { component: 'Income Tax (TDS)', amount: Number(p.tds) || 0 },
    ...(Number(p.lopDeduction) > 0 ? [{ component: `LOP (${p.lopDays} days)`, amount: Number(p.lopDeduction) }] : []),
    ...(Number(p.otherDeductions) > 0 ? [{ component: 'Other Deductions', amount: Number(p.otherDeductions) }] : []),
  ].filter(d => d.amount > 0);

  const monthName = MONTH_NAMES[(p.month || 1) - 1] || p.month;

  return {
    id: p.id,
    employeeId: p.employeeId,
    empId: p.employeeCode || '',
    empName: p.employeeName || '',
    department: p.departmentName || '',
    designation: '',
    month: `${monthName} ${p.year}`,
    monthNum: p.month,
    year: p.year,
    ctc: null,
    earnings,
    deductions,
    totalEarnings: Number(p.grossEarnings) || 0,
    totalDeductions: Number(p.totalDeductions) || 0,
    netPay: Number(p.netSalary) || 0,
    workingDays: p.workingDays,
    presentDays: p.presentDays,
    paidDays: p.paidDays,
    lopDays: p.lopDays,
    bankAccount: '',
    bankName: '',
    status: STATUS_TO_FE[p.status] || p.status,
    transactionReference: p.transactionReference,
    paidDate: p.paidDate,
  };
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STATUS_TO_FE = { DRAFT: 'Processing', PROCESSED: 'Processing', APPROVED: 'Processing', PAID: 'Paid' };

export async function getMyPayslips({ page = 0, size = 50 } = {}) {
  const data = await api.get('/payroll/my-payslips', { page, size });
  return {
    items: (data.content || []).map(adaptPayslip),
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}

export async function getPayslip(employeeId, month, year) {
  return adaptPayslip(await api.get(`/payroll/payslip/${employeeId}`, { month, year }));
}

export async function runPayroll(month, year) {
  return adaptPayrollSummary(await api.post('/payroll/run', { month, year }));
}

export async function approvePayroll(month, year) {
  return api.put(`/payroll/approve?month=${month}&year=${year}`);
}

export async function markPayrollPaid(month, year, ref) {
  return api.put(`/payroll/mark-paid?month=${month}&year=${year}&ref=${encodeURIComponent(ref)}`);
}

export async function getPayrollSummary(month, year) {
  return adaptPayrollSummary(await api.get('/payroll/summary', { month, year }));
}

// Maps backend PayrollSummaryResponse -> shape PayrollPage's summary cards expect
export function adaptPayrollSummary(s) {
  if (!s) return null;
  const totalNet = Number(s.totalNetSalary) || 0;
  const totalGross = Number(s.totalGrossEarnings) || 0;
  const totalDeductions = Number(s.totalDeductions) || 0;
  const employeeCount = Number(s.totalEmployees) || 0;
  return {
    month: s.month,
    year: s.year,
    status: s.status,
    totalPayroll: totalNet,
    totalGross,
    totalDeductions,
    avgSalary: employeeCount ? Math.round(totalNet / employeeCount) : 0,
    highestSalary: 0,
    lowestSalary: 0,
    employeeCount,
    totalPF: Number(s.totalPfContribution) || 0,
    totalESI: Number(s.totalEsiContribution) || 0,
  };
}

export async function getPayrollConfig() {
  return api.get('/payroll/config');
}

export async function updatePayrollConfig(config) {
  // config: { key, value, description, category }
  return api.put('/payroll/config', config);
}

// CEO-defined standard CTC breakup template — used to compute every offer/employee's salary split.
export async function getCtcBreakupTemplate() {
  return api.get('/payroll/ctc-breakup-template');
}

export async function updateCtcBreakupTemplate(percentages) {
  // percentages: { BASIC_PCT, HRA_PCT, CONVEYANCE_PCT, MEDICAL_PCT, SPECIAL_PCT } summing to 100
  return api.put('/payroll/ctc-breakup-template', percentages);
}

export async function previewCtcBreakup(ctc) {
  return api.post(`/payroll/ctc-breakup-preview?ctc=${encodeURIComponent(ctc)}`);
}

export async function requestSalaryAdvance({ amount, reason, emiMonths }) {
  return adaptSalaryAdvance(await api.post('/payroll/salary-advance', { amount, reason, emiMonths }));
}

export async function processSalaryAdvance(id, action) {
  return adaptSalaryAdvance(await api.put(`/payroll/salary-advance/${id}/action?action=${action}`));
}

export function adaptSalaryAdvance(a) {
  if (!a) return null;
  return {
    id: a.id,
    employeeName: a.employeeName,
    amount: Number(a.amount) || 0,
    requestDate: a.requestDate,
    status: a.status,
    emiMonths: a.emiMonths,
    emiAmount: Number(a.emiAmount) || 0,
    remainingAmount: Number(a.remainingAmount) || 0,
  };
}
