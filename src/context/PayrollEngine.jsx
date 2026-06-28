import { createContext, useContext, useCallback, useMemo } from 'react';
import { useData } from './DataContext';

const PayrollContext = createContext(null);

function calcSalaryStructure(ctc) {
  const monthly = ctc / 12;
  const basic = Math.round(monthly * 0.40);
  const hra = Math.round(basic * 0.50);
  const special = Math.round(monthly * 0.15);
  const medical = 1250;
  const travel = Math.round(monthly * 0.05);
  const internet = 1500;
  const food = 2000;
  const gross = basic + hra + special + medical + travel + internet + food;
  const pf = Math.round(Math.min(basic, 15000) * 0.12);
  const esi = ctc <= 2100000 ? Math.round(gross * 0.0075) : 0;
  const pt = 200;
  let incomeTax = 0;
  if (ctc > 1500000) incomeTax = Math.round((ctc - 1500000) * 0.30 / 12);
  else if (ctc > 1200000) incomeTax = Math.round((ctc - 1200000) * 0.20 / 12);
  else if (ctc > 900000) incomeTax = Math.round((ctc - 900000) * 0.15 / 12);
  else if (ctc > 600000) incomeTax = Math.round((ctc - 600000) * 0.10 / 12);
  else if (ctc > 300000) incomeTax = Math.round((ctc - 300000) * 0.05 / 12);

  return {
    earnings: [
      { component: 'Basic Salary', amount: basic },
      { component: 'HRA', amount: hra },
      { component: 'Special Allowance', amount: special },
      { component: 'Medical Allowance', amount: medical },
      { component: 'Travel Allowance', amount: travel },
      { component: 'Internet Allowance', amount: internet },
      { component: 'Food Allowance', amount: food },
    ],
    deductions: [
      { component: 'Provident Fund', amount: pf },
      ...(esi > 0 ? [{ component: 'ESI', amount: esi }] : []),
      { component: 'Professional Tax', amount: pt },
      { component: 'Income Tax (TDS)', amount: incomeTax },
    ],
    gross,
    totalDeductions: pf + esi + pt + incomeTax,
    netPay: gross - (pf + esi + pt + incomeTax),
    basic, hra,
  };
}

function calcLOP(grossSalary, workingDays, lopDays) {
  if (lopDays <= 0) return 0;
  const perDaySalary = Math.round(grossSalary / workingDays);
  return perDaySalary * lopDays;
}

function calcOvertime(basicSalary, workingDays, otHours) {
  if (otHours <= 0) return 0;
  const hourlyRate = Math.round((basicSalary / workingDays) / 8);
  return Math.round(hourlyRate * 1.5 * otHours);
}

export function PayrollProvider({ children }) {
  const { data } = useData();

  const generatePayslip = useCallback((employee, month = 'June 2024', overrides = {}) => {
    const structure = calcSalaryStructure(employee.ctc);
    const workingDays = overrides.workingDays || 22;
    const lopDays = overrides.lopDays || 0;
    const otHours = overrides.overtimeHours || 0;
    const bonus = overrides.bonus || 0;
    const variablePay = overrides.variablePay || 0;
    const reimbursements = overrides.reimbursements || 0;
    const loanDeduction = overrides.loanDeduction || 0;
    const salaryAdvance = overrides.salaryAdvance || 0;

    const lopDeduction = calcLOP(structure.gross, workingDays, lopDays);
    const overtimePay = calcOvertime(structure.basic, workingDays, otHours);

    const additionalEarnings = [];
    if (bonus > 0) additionalEarnings.push({ component: 'Bonus', amount: bonus });
    if (variablePay > 0) additionalEarnings.push({ component: 'Variable Pay', amount: variablePay });
    if (overtimePay > 0) additionalEarnings.push({ component: 'Overtime', amount: overtimePay });
    if (reimbursements > 0) additionalEarnings.push({ component: 'Reimbursements', amount: reimbursements });

    const additionalDeductions = [];
    if (lopDeduction > 0) additionalDeductions.push({ component: `LOP (${lopDays} days)`, amount: lopDeduction });
    if (loanDeduction > 0) additionalDeductions.push({ component: 'Loan EMI', amount: loanDeduction });
    if (salaryAdvance > 0) additionalDeductions.push({ component: 'Salary Advance', amount: salaryAdvance });

    const allEarnings = [...structure.earnings, ...additionalEarnings];
    const allDeductions = [...structure.deductions, ...additionalDeductions];
    const totalEarnings = allEarnings.reduce((s, e) => s + e.amount, 0);
    const totalDeductions = allDeductions.reduce((s, d) => s + d.amount, 0);

    return {
      empId: employee.empId,
      empName: employee.name,
      department: employee.department,
      designation: employee.designation,
      email: employee.email,
      ctc: employee.ctc,
      month,
      bankAccount: employee.bankAccount,
      bankName: employee.bankName,
      ifsc: employee.ifsc,
      pan: employee.pan,
      pfNumber: `PF/${employee.empId}/2024`,
      esiNumber: structure.gross * 12 <= 2100000 ? `ESI/${employee.empId}/2024` : null,
      workingDays,
      presentDays: workingDays - lopDays,
      lopDays,
      overtimeHours: otHours,
      earnings: allEarnings,
      deductions: allDeductions,
      totalEarnings,
      totalDeductions,
      netPay: totalEarnings - totalDeductions,
      lopDeduction,
      overtimePay,
      status: 'Draft',
      generatedAt: new Date().toISOString(),
      approvalHistory: [],
    };
  }, []);

  const generateBulkPayroll = useCallback((employees, month = 'June 2024') => {
    return employees.filter(e => e.status === 'Active').map(emp => {
      const lopDays = Math.random() > 0.85 ? Math.floor(Math.random() * 3) + 1 : 0;
      const otHours = Math.random() > 0.7 ? Math.floor(Math.random() * 20) : 0;
      return generatePayslip(emp, month, { lopDays, overtimeHours: otHours });
    });
  }, [generatePayslip]);

  const payrollSummary = useMemo(() => {
    const payslips = data.payslips;
    if (payslips.length === 0) return null;
    const total = payslips.reduce((s, p) => s + p.netPay, 0);
    const gross = payslips.reduce((s, p) => s + p.totalEarnings, 0);
    const deductions = payslips.reduce((s, p) => s + p.totalDeductions, 0);
    const salaries = payslips.map(p => p.netPay).sort((a, b) => a - b);
    return {
      totalPayroll: total,
      totalGross: gross,
      totalDeductions: deductions,
      avgSalary: Math.round(total / payslips.length),
      highestSalary: salaries[salaries.length - 1],
      lowestSalary: salaries[0],
      medianSalary: salaries[Math.floor(salaries.length / 2)],
      employeeCount: payslips.length,
      lopEmployees: payslips.filter(p => p.lopDays > 0 || (p.deductions || []).some(d => d.component.includes('LOP'))).length,
      totalPF: payslips.reduce((s, p) => s + (p.deductions || []).filter(d => d.component === 'Provident Fund').reduce((ss, d) => ss + d.amount, 0), 0),
      totalTax: payslips.reduce((s, p) => s + (p.deductions || []).filter(d => d.component.includes('Tax')).reduce((ss, d) => ss + d.amount, 0), 0),
    };
  }, [data.payslips]);

  return (
    <PayrollContext.Provider value={{ generatePayslip, generateBulkPayroll, calcSalaryStructure, calcLOP, payrollSummary }}>
      {children}
    </PayrollContext.Provider>
  );
}

export const usePayroll = () => useContext(PayrollContext);
