import { useState, useMemo } from 'react';
import { Download, IndianRupee, Calculator, TrendingUp, Mail, Lock, Unlock, Eye, Send, Printer, Share2, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import DataTable from '../../components/ui/DataTable';
import RowActionsMenu from '../../components/ui/RowActionsMenu';
import BulkActions from '../../components/ui/BulkActions';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SearchFilter from '../../components/ui/SearchFilter';
import { useData } from '../../context/DataContext';
import { generatePayslipPdf } from '../../api/payroll';
import { downloadFile } from '../../api/client';
import { usePayroll } from '../../context/PayrollEngine';
import { useApproval } from '../../context/ApprovalEngine';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import SensitiveValue from '../../components/ui/SensitiveValue';
import SensitivityToggle from '../../components/ui/SensitivityToggle';
import useSensitivityToggle from '../../hooks/useSensitivityToggle';
import { formatDateTime } from '../../utils/format';
import Skeleton, { TableSkeleton } from '../../components/ui/Skeleton';

function timeAgo(iso) {
  if (!iso) return 'Updated just now';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Updated ${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  return `Updated ${Math.round(hrs / 24)}d ago`;
}

export default function PayrollPage() {
  const { data, payslips: payslipsCrud, payslipsSource, payslipsLoading } = useData();
  const { generateBulkPayroll, payrollSummary: mockPayrollSummary } = usePayroll();
  const { isCEO, isHRManager } = useApproval();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();

  const isEmployee = (user?.role || '').toLowerCase() === 'employee';
  const [revealed, toggleRevealed] = useSensitivityToggle('payroll');
  const [runningPayroll, setRunningPayroll] = useState(false);
  const [liveSummary, setLiveSummary] = useState(null);
  const [lastUpdated] = useState(new Date().toISOString());

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(null);
  const [downloadingPayslip, setDownloadingPayslip] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [payrollStatus, setPayrollStatus] = useState('Draft');

  const allPayslips = useMemo(() => {
    if (isEmployee) {
      return data.payslips.filter(p => p.empName === user?.name || p.empId === user?.empId);
    }
    return data.payslips;
  }, [data.payslips, isEmployee, user]);

  const filtered = useMemo(() => allPayslips.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = !s || p.empName.toLowerCase().includes(s) || p.empId.toLowerCase().includes(s) || (p.department || '').toLowerCase().includes(s) || (p.month || '').toLowerCase().includes(s);
    const matchDept = !filters.department || filters.department === 'All' || p.department === filters.department;
    return matchSearch && matchDept;
  }), [allPayslips, search, filters]);

  // The "Highest"/"Lowest"/"Avg Salary" stat cards previously fell back to mockPayrollSummary
  // (computed over an entirely different, randomly-generated demo dataset) whenever `liveSummary`
  // was null - which it always was unless someone had just clicked "Run Payroll" in this exact
  // session, since PayrollSummaryResponse (the only thing that ever populates it) doesn't even
  // carry highest/lowest fields. That meant the stat cards showed numbers from a dataset that had
  // nothing to do with the "103 payslips" actually listed in the table below them. Computing
  // directly from the live payslips being displayed keeps the two in sync.
  const liveComputedSummary = useMemo(() => {
    if (payslipsSource !== 'live' || allPayslips.length === 0) return null;
    const nets = allPayslips.map(p => p.netPay);
    const totalGross = allPayslips.reduce((s, p) => s + p.totalEarnings, 0);
    const totalDeductions = allPayslips.reduce((s, p) => s + p.totalDeductions, 0);
    const totalPayroll = nets.reduce((s, n) => s + n, 0);
    return {
      totalPayroll, totalGross, totalDeductions,
      avgSalary: totalPayroll / nets.length,
      highestSalary: Math.max(...nets),
      lowestSalary: Math.min(...nets),
      employeeCount: allPayslips.length,
    };
  }, [payslipsSource, allPayslips]);

  const summary = liveComputedSummary || (payslipsSource === 'live' && liveSummary) || mockPayrollSummary || { totalPayroll: 0, totalGross: 0, totalDeductions: 0, avgSalary: 0, highestSalary: 0, lowestSalary: 0, employeeCount: 0 };

  // When the visible payslips are all for a single month (the common case - searching/filtering
  // to one month, as in the reported "March/April/May/June only have 20 records" confusion),
  // show why the payroll-record count differs from the current active headcount: employees who
  // joined or exited partway through that specific month explain the gap, rather than it looking
  // like payroll silently failed for some employees.
  const monthContext = useMemo(() => {
    if (isEmployee || filtered.length === 0) return null;
    const first = filtered[0];
    if (!filtered.every(p => p.monthNum === first.monthNum && p.year === first.year)) return null;
    const monthStart = new Date(first.year, first.monthNum - 1, 1);
    const monthEnd = new Date(first.year, first.monthNum, 0);
    const newJoiners = data.employees.filter(e => e.joinDate && new Date(e.joinDate) >= monthStart && new Date(e.joinDate) <= monthEnd);
    const exited = data.employees.filter(e => e.exitDate && new Date(e.exitDate) >= monthStart && new Date(e.exitDate) <= monthEnd);
    const activeDuring = data.employees.filter(e => {
      if (!e.joinDate || new Date(e.joinDate) > monthEnd) return false;
      if (e.exitDate && new Date(e.exitDate) < monthStart) return false;
      return true;
    });
    return { label: first.month, payrollCount: filtered.length, activeDuring: activeDuring.length, newJoiners, exited };
  }, [filtered, data.employees, isEmployee]);

  // Exports exactly what's currently visible (respects active search/filters), same plain-CSV
  // pattern used for the Employee Directory's toolbar Export button.
  const handleExportPayrollCsv = (rows = filtered) => {
    const headers = ['Employee', 'Employee ID', 'Department', 'Month', 'Gross', 'Deductions', 'Net Pay', 'Status'];
    const csvRows = rows.map(p => [p.empName, p.empId, p.department, p.month, p.totalEarnings, p.totalDeductions, p.netPay, p.status]);
    const escape = (v) => {
      const s = v ?? '';
      return typeof s === 'string' && (s.includes(',') || s.includes('"')) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(','), ...csvRows.map(r => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payroll_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} payslip${rows.length === 1 ? '' : 's'}`);
  };

  const downloadPayslip = async (id) => {
    if (payslipsSource !== 'live') { toast.error('Connect to the live backend to download payslips'); return; }
    try {
      const fileUrl = await generatePayslipPdf(id);
      await downloadFile(fileUrl);
    } catch (err) {
      toast.error(err.message || 'Failed to generate payslip PDF');
    }
  };

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
    ...(!isEmployee ? [{ key: 'empName', label: 'Employee', render: (v, row) => <div><p className="font-medium text-text text-sm">{v}</p><p className="text-[10px] text-text-secondary">{row.empId}</p></div> }] : []),
    ...(!isEmployee ? [{ key: 'department', label: 'Department' }] : []),
    { key: 'month', label: 'Month', render: (v) => v || 'May 2024' },
    ...(isEmployee ? [{ key: 'designation', label: 'Designation' }] : []),
    { key: 'totalEarnings', label: 'Gross', render: (v) => <SensitiveValue type="currency" value={v} revealed={revealed} /> },
    { key: 'totalDeductions', label: 'Deductions', render: (v) => <SensitiveValue type="currency" value={v} className="text-danger" revealed={revealed} /> },
    { key: 'netPay', label: 'Net Pay', render: (v) => <SensitiveValue type="currency" value={v} className="font-semibold text-primary" revealed={revealed} /> },
    { key: 'status', label: 'Status', render: (v) => <Badge dot>{v || 'Paid'}</Badge> },
    { key: 'actions', label: '', sortable: false, render: (_, row) => (
      <RowActionsMenu actions={[
        { label: 'View', icon: Eye, onClick: () => setSelected(row) },
        { label: 'Download', icon: Download, onClick: () => downloadPayslip(row.id) },
        { label: 'Print', icon: Printer, onClick: () => { setSelected(row); setTimeout(() => window.print(), 300); } },
        { label: 'Email', icon: Mail, onClick: () => toast.info('Payslip email is not available yet') },
      ]} />
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
            <StatCard icon={IndianRupee} label="Total Net" value={<SensitiveValue type="currency" value={summary.totalPayroll} revealed={revealed} />} delay={0} showSparkline={false} updatedAt={timeAgo(lastUpdated)} />
            <StatCard icon={TrendingUp} label="Total Gross" value={<SensitiveValue type="currency" value={summary.totalGross} revealed={revealed} />} color="success" delay={1} showSparkline={false} updatedAt={timeAgo(lastUpdated)} />
            <StatCard icon={Calculator} label="Deductions" value={<SensitiveValue type="currency" value={summary.totalDeductions} revealed={revealed} />} color="warning" delay={2} showSparkline={false} updatedAt={timeAgo(lastUpdated)} />
            <StatCard icon={IndianRupee} label="Avg Salary" value={<SensitiveValue type="currency" value={summary.avgSalary} revealed={revealed} />} color="info" delay={3} showSparkline={false} updatedAt={timeAgo(lastUpdated)} />
            <StatCard icon={IndianRupee} label="Highest" value={<SensitiveValue type="currency" value={summary.highestSalary} revealed={revealed} />} color="primary" delay={4} showSparkline={false} updatedAt={timeAgo(lastUpdated)} />
            <StatCard icon={IndianRupee} label="Lowest" value={<SensitiveValue type="currency" value={summary.lowestSalary} revealed={revealed} />} color="default" delay={5} showSparkline={false} updatedAt={timeAgo(lastUpdated)} />
          </div>
        )
      )}

      {!isEmployee && (
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex-1 min-w-0">
            <SearchFilter inline searchValue={search} onSearch={setSearch} placeholder="Search by employee, month, or payroll status..." filters={[
              { key: 'department', label: 'Department', options: data.departments },
            ]} activeFilters={filters} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClearFilters={() => { setFilters({}); setSearch(''); }} onExport={() => handleExportPayrollCsv(filtered)} />
          </div>
          <SensitivityToggle revealed={revealed} onToggle={toggleRevealed} />
        </div>
      )}

      {monthContext && (monthContext.newJoiners.length > 0 || monthContext.exited.length > 0 || monthContext.payrollCount !== monthContext.activeDuring) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 px-4 py-3 bg-surface-3 rounded-xl text-xs text-text-secondary">
          <span className="font-medium text-text">{monthContext.label}:</span>
          <span>Active During Month: <b className="text-text">{monthContext.activeDuring}</b></span>
          <span>Payroll Generated: <b className="text-text">{monthContext.payrollCount}</b></span>
          {monthContext.newJoiners.length > 0 && (
            <span>New Joiners: <b className="text-success">{monthContext.newJoiners.length}</b> ({monthContext.newJoiners.map(e => e.name).join(', ')})</span>
          )}
          {monthContext.exited.length > 0 && (
            <span>Exited: <b className="text-danger">{monthContext.exited.length}</b> ({monthContext.exited.map(e => e.name).join(', ')})</span>
          )}
        </div>
      )}

      {isEmployee && (
        <div className="flex justify-end">
          <SensitivityToggle revealed={revealed} onToggle={toggleRevealed} />
        </div>
      )}

      <Card padding={false}>
        {payslipsLoading ? <TableSkeleton rows={8} cols={6} /> : <DataTable columns={columns} data={filtered} pageSize={isEmployee ? 6 : 12} selectable={!isEmployee} selected={!isEmployee ? selectedIds : []} onSelectChange={!isEmployee ? setSelectedIds : () => {}} onRowClick={setSelected} />}
      </Card>

      {!isEmployee && <BulkActions selectedCount={selectedIds.length} onExport={() => { handleExportPayrollCsv(filtered.filter(p => selectedIds.includes(p.id))); setSelectedIds([]); }} onEmail={() => { toast.info('Bulk email is not available yet'); setSelectedIds([]); }} onClear={() => setSelectedIds([])} />}

      {/* Payslip Modal - styled as an actual payroll statement document, not a generic dialog */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Payroll Statement" size="xl">
        {selected && (
          <div className="space-y-5">
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-primary/10 to-transparent border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20"><span className="text-white font-bold text-xl">V</span></div>
                    <div>
                      <p className="font-extrabold text-text text-lg tracking-[0.18em]">VIKISOL</p>
                      <p className="text-xs text-text-secondary font-medium">Technology &bull; Talent &bull; Transformation</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-text">Payroll Statement</p>
                    <p className="text-xs text-text-secondary">{selected.month || 'May 2024'}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Employee Details</p>
                  <div className="grid grid-cols-4 gap-4 text-xs bg-surface-3 rounded-lg p-4">
                    {[['Employee', selected.empName], ['Employee ID', selected.empId], ['Department', selected.department], ['Designation', selected.designation]].map(([k, v]) => (
                      <div key={k}><p className="text-text-secondary">{k}</p><p className="text-text font-semibold mt-0.5">{v || '-'}</p></div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Payroll Details</p>
                  <div className="grid grid-cols-4 gap-4 text-xs bg-surface-3 rounded-lg p-4">
                    <div><p className="text-text-secondary">Bank</p><p className="text-text font-semibold mt-0.5">{selected.bankName || 'HDFC Bank'}</p></div>
                    <div><p className="text-text-secondary">Account</p><p className="text-text font-semibold mt-0.5"><SensitiveValue type="account" value={selected.bankAccount || '0000001234'} revealed={revealed} /></p></div>
                    <div><p className="text-text-secondary">PAN</p><p className="text-text font-semibold mt-0.5"><SensitiveValue type="pan" value={selected.pan || 'ABCPD1234E'} revealed={revealed} /></p></div>
                    <div><p className="text-text-secondary">PF No</p><p className="text-text font-semibold mt-0.5">{`PF/${selected.empId}/2024`}</p></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-success" /> Earnings</h4>
                    <div className="space-y-2">
                      {(selected.earnings || []).map(e => <div key={e.component} className="flex justify-between text-sm py-1"><span className="text-text-secondary">{e.component}</span><SensitiveValue type="currency" value={e.amount} revealed={revealed} /></div>)}
                      <hr className="border-border" />
                      <div className="flex justify-between text-sm font-bold py-1"><span className="text-text">Total Earnings</span><SensitiveValue type="currency" value={selected.totalEarnings} className="text-success" revealed={revealed} /></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-danger" /> Deductions</h4>
                    <div className="space-y-2">
                      {(selected.deductions || []).map(d => <div key={d.component} className="flex justify-between text-sm py-1"><span className="text-text-secondary">{d.component}</span><SensitiveValue type="currency" value={d.amount} revealed={revealed} /></div>)}
                      <hr className="border-border" />
                      <div className="flex justify-between text-sm font-bold py-1"><span className="text-text">Total Deductions</span><SensitiveValue type="currency" value={selected.totalDeductions} className="text-danger" revealed={revealed} /></div>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
                  <div><p className="text-sm font-semibold text-text">Net Salary</p><p className="text-xs text-text-secondary">Credited to bank account</p></div>
                  <SensitiveValue type="currency" value={selected.netPay} className="text-3xl font-bold text-primary" revealed={revealed} />
                </div>
              </div>

              <div className="px-6 py-3 bg-surface-3 border-t border-border flex items-center justify-between text-[10px] text-text-secondary">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>Generated on {formatDateTime(selected.generatedAt || new Date().toISOString())}</span>
                  <span>Generated by Vikisol One System</span>
                  <span>Version 1.0</span>
                  <span>Document ID: PS-{selected.id}</span>
                </div>
                <span>Page 1 of 1</span>
              </div>
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
              <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print</Button>
              <Button variant="secondary" icon={Share2} onClick={() => toast.info('Sharing is not available yet')}>Share</Button>
              <Button variant="secondary" icon={Mail} onClick={() => toast.info('Payslip email is not available yet')}>Email</Button>
              <Button variant="secondary" icon={RefreshCw} onClick={() => toast.info('Regeneration is not available yet')}>Regenerate</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
