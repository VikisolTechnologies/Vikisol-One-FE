import { useState, useMemo } from 'react';
import { Download, IndianRupee, Calculator, FileText, TrendingUp, Mail, Lock, Unlock, Eye, Send, Check, QrCode, Printer } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import SelectableTable from '../../components/ui/SelectableTable';
import BulkActions from '../../components/ui/BulkActions';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SearchFilter from '../../components/ui/SearchFilter';
import ApprovalTimeline from '../../components/ui/ApprovalTimeline';
import { useData } from '../../context/DataContext';
import { usePayroll } from '../../context/PayrollEngine';
import { useApproval } from '../../context/ApprovalEngine';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

export default function PayrollPage() {
  const { data, payslips: payslipsCrud, stats } = useData();
  const { generateBulkPayroll, payrollSummary } = usePayroll();
  const { isCEO, isHRManager, isManager } = useApproval();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();

  const isEmployee = user?.role === 'employee';

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [payrollStatus, setPayrollStatus] = useState('Draft');

  // Employees see only their own payslips
  const allPayslips = useMemo(() => {
    if (isEmployee) {
      return data.payslips.filter(p => p.empName === user?.name || p.empId === user?.empId);
    }
    return data.payslips;
  }, [data.payslips, isEmployee, user]);

  const filtered = useMemo(() => allPayslips.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = !s || p.empName.toLowerCase().includes(s) || p.empId.toLowerCase().includes(s) || (p.department || '').toLowerCase().includes(s);
    const matchDept = !filters.department || filters.department === 'All' || p.department === filters.department;
    return matchSearch && matchDept;
  }), [allPayslips, search, filters]);

  const summary = payrollSummary || { totalPayroll: 0, totalGross: 0, totalDeductions: 0, avgSalary: 0, highestSalary: 0, lowestSalary: 0, employeeCount: 0 };

  const handleRunPayroll = async () => {
    const ok = await confirm({ title: 'Generate Payroll?', message: `Generate payroll for ${data.employees.filter(e => e.status === 'Active').length} active employees?`, type: 'info', confirmText: 'Generate' });
    if (ok) {
      const newPayslips = generateBulkPayroll(data.employees, 'June 2026');
      newPayslips.forEach(ps => payslipsCrud.create(ps));
      setPayrollStatus('Pending Approval');
      toast.success(`Payroll generated for ${newPayslips.length} employees`);
    }
  };

  const handleLockPayroll = async () => {
    if (!isCEO) { toast.error('Only CEO can lock/unlock payroll'); return; }
    const newStatus = payrollStatus === 'Locked' ? 'Approved' : 'Locked';
    const ok = await confirm({ title: `${newStatus === 'Locked' ? 'Lock' : 'Unlock'} Payroll?`, message: newStatus === 'Locked' ? 'No further changes allowed.' : 'Allow modifications.', type: 'warning', confirmText: newStatus === 'Locked' ? 'Lock' : 'Unlock' });
    if (ok) { setPayrollStatus(newStatus); toast.success(`Payroll ${newStatus.toLowerCase()}`); }
  };

  const columns = [
    ...(!isEmployee ? [{ key: 'empName', label: 'Employee', render: (v, row) => <div><p className="font-medium text-text text-sm">{v}</p><p className="text-[10px] text-text-secondary">{row.empId} · {row.department}</p></div> }] : []),
    { key: 'month', label: 'Month', render: (v) => v || 'May 2024' },
    ...(isEmployee ? [{ key: 'designation', label: 'Designation' }] : []),
    { key: 'totalEarnings', label: 'Gross', render: (v) => `₹${(v || 0).toLocaleString()}` },
    { key: 'totalDeductions', label: 'Deductions', render: (v) => <span className="text-danger">₹{(v || 0).toLocaleString()}</span> },
    { key: 'netPay', label: 'Net Pay', render: (v) => <span className="font-semibold text-primary">₹{(v || 0).toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (v) => <Badge dot>{v || 'Paid'}</Badge> },
    { key: 'actions', label: '', sortable: false, render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); setSelected(row); }} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary"><Eye size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); toast.success('Payslip downloaded'); }} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary"><Download size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: isEmployee ? 'My Payslips' : 'Payroll' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">{isEmployee ? 'My Payslips' : 'Payroll'}</h1>
          <p className="text-sm text-text-secondary">{allPayslips.length} payslips {!isEmployee && payrollStatus !== 'Draft' && `· ${payrollStatus}`}</p>
        </div>
        {!isEmployee && (
          <div className="flex gap-2">
            <Button variant="secondary" icon={Download} size="sm" onClick={() => toast.success('Bulk download started')}>Bulk Download</Button>
            {(isCEO || isHRManager) && <Button variant="secondary" icon={Send} size="sm" onClick={() => toast.success(`Emailed ${allPayslips.length} payslips`)}>Bulk Email</Button>}
            {isCEO && <Button variant="secondary" icon={payrollStatus === 'Locked' ? Unlock : Lock} size="sm" onClick={handleLockPayroll}>{payrollStatus === 'Locked' ? 'Unlock' : 'Lock'}</Button>}
            {(isCEO || isHRManager) && <Button icon={Calculator} size="sm" onClick={handleRunPayroll} disabled={payrollStatus === 'Locked'}>Run Payroll</Button>}
          </div>
        )}
      </div>

      {/* Summary - only for managers */}
      {!isEmployee && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={IndianRupee} label="Total Net" value={`₹${(summary.totalPayroll / 100000).toFixed(1)}L`} delay={0} />
          <StatCard icon={TrendingUp} label="Total Gross" value={`₹${(summary.totalGross / 100000).toFixed(1)}L`} color="success" delay={1} />
          <StatCard icon={Calculator} label="Deductions" value={`₹${(summary.totalDeductions / 100000).toFixed(1)}L`} color="warning" delay={2} />
          <StatCard icon={IndianRupee} label="Avg Salary" value={`₹${summary.avgSalary.toLocaleString()}`} color="info" delay={3} />
          <StatCard icon={IndianRupee} label="Highest" value={`₹${summary.highestSalary.toLocaleString()}`} color="primary" delay={4} />
          <StatCard icon={IndianRupee} label="Lowest" value={`₹${summary.lowestSalary.toLocaleString()}`} color="default" delay={5} />
        </div>
      )}

      {!isEmployee && (
        <SearchFilter searchValue={search} onSearch={setSearch} filters={[
          { key: 'department', label: 'Department', options: data.departments },
        ]} activeFilters={filters} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClearFilters={() => setFilters({})} />
      )}

      <Card padding={false}>
        <SelectableTable columns={columns} data={filtered} pageSize={isEmployee ? 6 : 12} selected={!isEmployee ? selectedIds : []} onSelectChange={!isEmployee ? setSelectedIds : () => {}} onRowClick={setSelected} />
      </Card>

      {!isEmployee && <BulkActions selectedCount={selectedIds.length} onExport={() => { toast.success('Exported'); setSelectedIds([]); }} onEmail={() => { toast.success('Emailed'); setSelectedIds([]); }} onClear={() => setSelectedIds([])} />}

      {/* Payslip Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Payslip" size="xl">
        {selected && (
          <div className="space-y-5">
            <div className="p-5 bg-surface-3 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center"><span className="text-white font-bold">V</span></div>
                  <div><p className="font-bold text-text tracking-[0.15em]">VIKISOL</p><p className="text-[10px] text-text-secondary">Technology · Talent · Transformation</p></div>
                </div>
                <div className="text-right"><p className="text-lg font-bold text-text">PAYSLIP</p><p className="text-xs text-text-secondary">{selected.month || 'May 2024'}</p></div>
              </div>
              <hr className="border-border mb-4" />
              <div className="grid grid-cols-4 gap-4 text-xs">
                {[['Employee', selected.empName], ['Employee ID', selected.empId], ['Department', selected.department], ['Designation', selected.designation], ['Bank', selected.bankName || 'HDFC Bank'], ['Account', `****${(selected.bankAccount || '1234').slice(-4)}`], ['PAN', selected.pan || 'ABCPD1234E'], ['PF No', `PF/${selected.empId}/2024`]].map(([k, v]) => (
                  <div key={k}><p className="text-text-secondary">{k}</p><p className="text-text font-semibold mt-0.5">{v || '-'}</p></div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-success" /> Earnings</h4>
                <div className="space-y-2">
                  {(selected.earnings || []).map(e => <div key={e.component} className="flex justify-between text-sm py-1"><span className="text-text-secondary">{e.component}</span><span className="text-text">₹{e.amount.toLocaleString()}</span></div>)}
                  <hr className="border-border" />
                  <div className="flex justify-between text-sm font-bold py-1"><span className="text-text">Total Earnings</span><span className="text-success">₹{(selected.totalEarnings || 0).toLocaleString()}</span></div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-danger" /> Deductions</h4>
                <div className="space-y-2">
                  {(selected.deductions || []).map(d => <div key={d.component} className="flex justify-between text-sm py-1"><span className="text-text-secondary">{d.component}</span><span className="text-text">₹{d.amount.toLocaleString()}</span></div>)}
                  <hr className="border-border" />
                  <div className="flex justify-between text-sm font-bold py-1"><span className="text-text">Total Deductions</span><span className="text-danger">₹{(selected.totalDeductions || 0).toLocaleString()}</span></div>
                </div>
              </div>
            </div>
            <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
              <div><p className="text-sm font-semibold text-text">Net Payable</p><p className="text-xs text-text-secondary">Credited to bank</p></div>
              <p className="text-3xl font-bold text-primary">₹{(selected.netPay || 0).toLocaleString()}</p>
            </div>
            <div className="flex gap-2 flex-wrap border-t border-border pt-4">
              <Button icon={Download} onClick={() => toast.success('Payslip downloaded')}>Download PDF</Button>
              <Button variant="secondary" icon={Mail} onClick={() => toast.success('Payslip emailed')}>Email</Button>
              <Button variant="secondary" icon={Printer} onClick={() => toast.success('Printing...')}>Print</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
