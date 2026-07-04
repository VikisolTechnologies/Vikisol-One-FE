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
import { generatePayslipPdf } from '../../api/payroll';
import { downloadFile } from '../../api/client';
import { usePayroll } from '../../context/PayrollEngine';
import { useApproval } from '../../context/ApprovalEngine';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import SensitiveValue from '../../components/ui/SensitiveValue';
import { formatCurrency } from '../../utils/format';
import Skeleton, { TableSkeleton } from '../../components/ui/Skeleton';

export default function PayrollPage() {
  const { data, payslips: payslipsCrud, stats, payslipsSource, payslipsLoading } = useData();
  const { generateBulkPayroll, payrollSummary: mockPayrollSummary } = usePayroll();
  const { isCEO, isHRManager, isManager } = useApproval();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();

  const isEmployee = (user?.role || '').toLowerCase() === 'employee';
  const [runningPayroll, setRunningPayroll] = useState(false);
  const [liveSummary, setLiveSummary] = useState(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(null);
  const [downloadingPayslip, setDownloadingPayslip] = useState(false);
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

  const summary = (payslipsSource === 'live' && liveSummary) || mockPayrollSummary || { totalPayroll: 0, totalGross: 0, totalDeductions: 0, avgSalary: 0, highestSalary: 0, lowestSalary: 0, employeeCount: 0 };

  const handleRunPayroll = async () => {
    const ok = await confirm({ title: 'Generate Payroll?', message: `Generate payroll for ${data.employees.filter(e => e.status === 'Active').length} active employees?`, type: 'info', confirmText: 'Generate' });
    if (!ok) return;

    if (payslipsSource === 'live') {
      const now = new Date();
      setRunningPayroll(true);
      try {
        const result = await payslipsCrud.create({ month: now.getMonth() + 1, year: now.getFullYear() });
        setLiveSummary(result);
        setPayrollStatus('Pending Approval');
        toast.success('Payroll generated successfully');
      } catch (err) {
        toast.error(err.message || 'Failed to run payroll');
      } finally {
        setRunningPayroll(false);
      }
      return;
    }

    try {
      const newPayslips = generateBulkPayroll(data.employees, 'June 2026');
      newPayslips.forEach(ps => payslipsCrud.create(ps));
      setPayrollStatus('Pending Approval');
      toast.success(`Payroll generated for ${newPayslips.length} employees`);
    } catch (err) {
      toast.error(err.message || 'Failed to run payroll');
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
    { key: 'totalEarnings', label: 'Gross', render: (v, row) => <SensitiveValue type="currency" value={v} id={`gross-${row.id}`} /> },
    { key: 'totalDeductions', label: 'Deductions', render: (v, row) => <SensitiveValue type="currency" value={v} id={`deductions-${row.id}`} className="text-danger" /> },
    { key: 'netPay', label: 'Net Pay', render: (v, row) => <SensitiveValue type="currency" value={v} id={`netpay-${row.id}`} className="font-semibold text-primary" /> },
    { key: 'status', label: 'Status', render: (v) => <Badge dot>{v || 'Paid'}</Badge> },
    { key: 'actions', label: '', sortable: false, render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); setSelected(row); }} aria-label={`View payslip for ${row.empName}`} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary"><Eye size={14} /></button>
        <button onClick={async (e) => {
          e.stopPropagation();
          if (payslipsSource !== 'live') { toast.error('Connect to the live backend to download payslips'); return; }
          try {
            const fileUrl = await generatePayslipPdf(row.id);
            await downloadFile(fileUrl);
          } catch (err) {
            toast.error(err.message || 'Failed to generate payslip PDF');
          }
        }} aria-label={`Download payslip for ${row.empName}`} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary"><Download size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: isEmployee ? 'My Payslips' : 'Payroll' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">{isEmployee ? 'My Payslips' : 'Payroll'}</h1>
          <p className="text-sm text-text-secondary">
            {payslipsLoading ? 'Loading from server...' : `${allPayslips.length} payslips ${!isEmployee && payrollStatus !== 'Draft' ? `· ${payrollStatus}` : ''}`}
            {!payslipsLoading && payslipsSource === 'mock' && <span className="ml-2 text-warning">(demo data)</span>}
          </p>
        </div>
        {!isEmployee && (
          <div className="flex gap-2">
            <Button variant="secondary" icon={Download} size="sm" onClick={() => toast.info('Bulk payslip download is not available yet')}>Bulk Download</Button>
            {(isCEO || isHRManager) && <Button variant="secondary" icon={Send} size="sm" onClick={() => toast.info('Bulk payslip email is not available yet')}>Bulk Email</Button>}
            {isCEO && <Button variant="secondary" icon={payrollStatus === 'Locked' ? Unlock : Lock} size="sm" onClick={handleLockPayroll}>{payrollStatus === 'Locked' ? 'Unlock' : 'Lock'}</Button>}
            {(isCEO || isHRManager) && <Button icon={Calculator} size="sm" onClick={handleRunPayroll} disabled={payrollStatus === 'Locked' || runningPayroll}>{runningPayroll ? 'Running...' : 'Run Payroll'}</Button>}
          </div>
        )}
      </div>

      {/* Summary - only for managers */}
      {!isEmployee && (
        payslipsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} variant="stat" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={IndianRupee} label="Total Net" value={<SensitiveValue type="currency" value={summary.totalPayroll} id="payroll-total-net" />} delay={0} showSparkline={false} />
            <StatCard icon={TrendingUp} label="Total Gross" value={<SensitiveValue type="currency" value={summary.totalGross} id="payroll-total-gross" />} color="success" delay={1} showSparkline={false} />
            <StatCard icon={Calculator} label="Deductions" value={<SensitiveValue type="currency" value={summary.totalDeductions} id="payroll-total-deductions" />} color="warning" delay={2} showSparkline={false} />
            <StatCard icon={IndianRupee} label="Avg Salary" value={<SensitiveValue type="currency" value={summary.avgSalary} id="payroll-avg-salary" />} color="info" delay={3} showSparkline={false} />
            <StatCard icon={IndianRupee} label="Highest" value={<SensitiveValue type="currency" value={summary.highestSalary} id="payroll-highest-salary" />} color="primary" delay={4} showSparkline={false} />
            <StatCard icon={IndianRupee} label="Lowest" value={<SensitiveValue type="currency" value={summary.lowestSalary} id="payroll-lowest-salary" />} color="default" delay={5} showSparkline={false} />
          </div>
        )
      )}

      {!isEmployee && (
        <SearchFilter searchValue={search} onSearch={setSearch} filters={[
          { key: 'department', label: 'Department', options: data.departments },
        ]} activeFilters={filters} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClearFilters={() => setFilters({})} />
      )}

      <Card padding={false}>
        {payslipsLoading ? <TableSkeleton rows={8} cols={6} /> : <SelectableTable columns={columns} data={filtered} pageSize={isEmployee ? 6 : 12} selected={!isEmployee ? selectedIds : []} onSelectChange={!isEmployee ? setSelectedIds : () => {}} onRowClick={setSelected} />}
      </Card>

      {!isEmployee && <BulkActions selectedCount={selectedIds.length} onExport={() => { toast.info('Export is not available yet'); setSelectedIds([]); }} onEmail={() => { toast.info('Bulk email is not available yet'); setSelectedIds([]); }} onClear={() => setSelectedIds([])} />}

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
                {[['Employee', selected.empName], ['Employee ID', selected.empId], ['Department', selected.department], ['Designation', selected.designation]].map(([k, v]) => (
                  <div key={k}><p className="text-text-secondary">{k}</p><p className="text-text font-semibold mt-0.5">{v || '-'}</p></div>
                ))}
                <div><p className="text-text-secondary">Bank</p><p className="text-text font-semibold mt-0.5">{selected.bankName || 'HDFC Bank'}</p></div>
                <div><p className="text-text-secondary">Account</p><p className="text-text font-semibold mt-0.5"><SensitiveValue type="account" value={selected.bankAccount || '0000001234'} id={`bank-${selected.id}`} /></p></div>
                <div><p className="text-text-secondary">PAN</p><p className="text-text font-semibold mt-0.5"><SensitiveValue type="pan" value={selected.pan || 'ABCPD1234E'} id={`pan-${selected.id}`} /></p></div>
                <div><p className="text-text-secondary">PF No</p><p className="text-text font-semibold mt-0.5">{`PF/${selected.empId}/2024`}</p></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-success" /> Earnings</h4>
                <div className="space-y-2">
                  {(selected.earnings || []).map(e => <div key={e.component} className="flex justify-between text-sm py-1"><span className="text-text-secondary">{e.component}</span><SensitiveValue type="currency" value={e.amount} id={`earn-${selected.id}-${e.component}`} /></div>)}
                  <hr className="border-border" />
                  <div className="flex justify-between text-sm font-bold py-1"><span className="text-text">Total Earnings</span><SensitiveValue type="currency" value={selected.totalEarnings} id={`total-earn-${selected.id}`} className="text-success" /></div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-danger" /> Deductions</h4>
                <div className="space-y-2">
                  {(selected.deductions || []).map(d => <div key={d.component} className="flex justify-between text-sm py-1"><span className="text-text-secondary">{d.component}</span><SensitiveValue type="currency" value={d.amount} id={`ded-${selected.id}-${d.component}`} /></div>)}
                  <hr className="border-border" />
                  <div className="flex justify-between text-sm font-bold py-1"><span className="text-text">Total Deductions</span><SensitiveValue type="currency" value={selected.totalDeductions} id={`total-ded-${selected.id}`} className="text-danger" /></div>
                </div>
              </div>
            </div>
            <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
              <div><p className="text-sm font-semibold text-text">Net Payable</p><p className="text-xs text-text-secondary">Credited to bank</p></div>
              <SensitiveValue type="currency" value={selected.netPay} id={`netpay-modal-${selected.id}`} className="text-3xl font-bold text-primary" />
            </div>
            <div className="flex gap-2 flex-wrap border-t border-border pt-4">
              <Button
                icon={Download}
                disabled={downloadingPayslip || payslipsSource !== 'live'}
                onClick={async () => {
                  if (payslipsSource !== 'live') { toast.error('Connect to the live backend to download payslips'); return; }
                  setDownloadingPayslip(true);
                  try {
                    const fileUrl = await generatePayslipPdf(selected.id);
                    await downloadFile(fileUrl);
                  } catch (err) {
                    toast.error(err.message || 'Failed to generate payslip PDF');
                  } finally {
                    setDownloadingPayslip(false);
                  }
                }}
              >
                {downloadingPayslip ? 'Generating...' : 'Download PDF'}
              </Button>
              <Button variant="secondary" icon={Mail} onClick={() => toast.info('Payslip email is not available yet')}>Email</Button>
              <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
