import { useState, useMemo } from 'react';
import { BarChart3, Download, FileSpreadsheet, FileText, TrendingUp, Printer, Mail, Calendar, Eye } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import * as reportsApi from '../../api/reports';

// Each report is tagged with the sidebar module it's most relevant to, so we can hide reports
// that don't matter for a given role (e.g. a Manager doesn't need company Revenue/Recruitment
// reports) using the same CEO-configurable role-permission data that drives the sidebar.
const ALL_REPORTS = [
  { id: 1, name: 'Attendance Report', description: 'Monthly attendance summary', category: 'Attendance', module: 'attendance', icon: BarChart3 },
  { id: 2, name: 'Payroll Report', description: 'Monthly payroll breakdown', category: 'Payroll', module: 'payroll', icon: FileSpreadsheet },
  { id: 3, name: 'Leave Report', description: 'Leave utilization and balance', category: 'Leave', module: 'leave', icon: FileText },
  { id: 4, name: 'Recruitment Report', description: 'Hiring pipeline metrics', category: 'Recruitment', module: 'recruitment', icon: TrendingUp },
  { id: 5, name: 'Performance Report', description: 'Performance ratings summary', category: 'Performance', module: 'performance', icon: BarChart3 },
  { id: 6, name: 'Timesheet Report', description: 'Weekly/monthly timesheet summary', category: 'Timesheets', module: 'timesheets', icon: FileSpreadsheet },
  { id: 7, name: 'Attrition Report', description: 'Employee attrition trends', category: 'HR', module: 'employees', icon: TrendingUp },
  { id: 8, name: 'Project Report', description: 'Project status and allocation', category: 'Projects', module: 'projects', icon: BarChart3 },
  { id: 9, name: 'Asset Report', description: 'Asset inventory and allocation', category: 'Assets', module: 'assets', icon: FileSpreadsheet },
  { id: 10, name: 'Department Report', description: 'Department-wise analytics', category: 'HR', module: 'employees', icon: BarChart3 },
  { id: 11, name: 'Revenue Report', description: 'Monthly revenue analysis', category: 'Finance', module: 'payroll', icon: TrendingUp },
  { id: 12, name: 'Employee Report', description: 'Employee demographics overview', category: 'HR', module: 'employees', icon: FileText },
];

// Reports backed by a live endpoint; others remain demo-only previews.
const LIVE_REPORT_IDS = new Set([1, 2]); // Attendance Report, Payroll Report

export default function ReportsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { visibleModules } = useData() || {};
  const isCEOOrAdmin = ['ceo', 'admin'].includes(user?.role);

  // CEO/Admin always see every report; everyone else only sees reports tied to a module their
  // role has access to (per the Role Permissions settings), so a Manager isn't shown, say, the
  // company-wide Revenue Report just because the Payroll module happens to be visible to them.
  const reports = useMemo(() => {
    if (isCEOOrAdmin) return ALL_REPORTS;
    if (!visibleModules) return ALL_REPORTS;
    return ALL_REPORTS.filter(r => visibleModules.includes(r.module));
  }, [isCEOOrAdmin, visibleModules]);
  const [preview, setPreview] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSource, setPreviewSource] = useState('mock'); // 'mock' | 'live'
  const [dateRange, setDateRange] = useState({ from: '2024-01-01', to: '2024-05-31' });
  const [filter, setFilter] = useState('All');

  const categories = ['All', ...new Set(reports.map(r => r.category))];
  const filtered = filter === 'All' ? reports : reports.filter(r => r.category === filter);

  const handleExport = (report, format) => toast.success(`${report.name} exported as ${format}`);
  const handleEmail = (report) => toast.success(`${report.name} sent via email`);
  const handleSchedule = (report) => toast.info(`${report.name} scheduled for weekly generation`);

  const openPreview = async (report) => {
    setPreview(report);
    setPreviewData(null);
    setPreviewSource('mock');
    if (!LIVE_REPORT_IDS.has(report.id)) return;

    const from = new Date(dateRange.from);
    const month = from.getMonth() + 1;
    const year = from.getFullYear();

    setPreviewLoading(true);
    try {
      if (report.id === 1) {
        const data = await reportsApi.getAttendanceReport(month, year);
        setPreviewData(data);
        setPreviewSource('live');
      } else if (report.id === 2) {
        const data = await reportsApi.getPayrollReport(month, year);
        setPreviewData(data);
        setPreviewSource('live');
      }
    } catch (err) {
      toast.error(err.message || `Could not load live ${report.name.toLowerCase()}; showing demo preview`);
      setPreviewSource('mock');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Reports' }]} />
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-text">Reports</h1><p className="text-sm text-text-secondary">Generate and download reports</p></div>
        <div className="flex items-center gap-3">
          <Input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))} className="w-36" />
          <span className="text-text-secondary text-sm">to</span>
          <Input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))} className="w-36" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(c => <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === c ? 'bg-primary text-white' : 'bg-surface-3 text-text-secondary hover:text-text'}`}>{c}</button>)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(r => (
          <Card key={r.id} hoverable>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><r.icon size={18} className="text-primary" /></div>
              <div><h3 className="text-sm font-semibold text-text">{r.name}</h3><p className="text-xs text-text-secondary mt-0.5">{r.description}</p></div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Button size="sm" variant="ghost" icon={Eye} onClick={() => openPreview(r)}>Preview</Button>
              <Button size="sm" variant="ghost" icon={FileText} onClick={() => handleExport(r, 'PDF')}>PDF</Button>
              <Button size="sm" variant="ghost" icon={FileSpreadsheet} onClick={() => handleExport(r, 'Excel')}>Excel</Button>
              <Button size="sm" variant="ghost" icon={Download} onClick={() => handleExport(r, 'CSV')}>CSV</Button>
              <Button size="sm" variant="ghost" icon={Printer} onClick={() => handleExport(r, 'Print')}>Print</Button>
              <Button size="sm" variant="ghost" icon={Mail} onClick={() => handleEmail(r)}>Email</Button>
              <Button size="sm" variant="ghost" icon={Calendar} onClick={() => handleSchedule(r)}>Schedule</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={`${preview?.name} - Preview`} size="xl">
        {preview && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-3 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary mb-1">Report Period</p>
                <p className="text-sm font-medium text-text">{dateRange.from} to {dateRange.to}</p>
              </div>
              {LIVE_REPORT_IDS.has(preview.id) && !previewLoading && (
                <span className={`text-xs ${previewSource === 'live' ? 'text-success' : 'text-warning'}`}>
                  {previewSource === 'live' ? 'Live data' : '(demo data)'}
                </span>
              )}
            </div>

            {previewLoading && (
              <div className="p-12 bg-surface-3 rounded-xl text-center">
                <p className="text-sm text-text-secondary">Loading report...</p>
              </div>
            )}

            {!previewLoading && previewSource === 'live' && preview.id === 1 && (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-3 text-text-secondary text-xs">
                    <tr>
                      <th className="text-left p-2.5">Employee</th>
                      <th className="text-left p-2.5">Present</th>
                      <th className="text-left p-2.5">Absent</th>
                      <th className="text-left p-2.5">Half Days</th>
                      <th className="text-left p-2.5">Leave</th>
                      <th className="text-left p-2.5">Avg Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewData || []).length === 0 && (
                      <tr><td colSpan={6} className="p-4 text-center text-text-secondary">No attendance data for this period</td></tr>
                    )}
                    {(previewData || []).map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-2.5 text-text">{row.employeeName} <span className="text-text-secondary text-xs">({row.employeeId})</span></td>
                        <td className="p-2.5 text-text">{row.presentDays}</td>
                        <td className="p-2.5 text-text">{row.absentDays}</td>
                        <td className="p-2.5 text-text">{row.halfDays}</td>
                        <td className="p-2.5 text-text">{row.leaveDays}</td>
                        <td className="p-2.5 text-text">{row.avgWorkingHours?.toFixed?.(1) ?? row.avgWorkingHours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!previewLoading && previewSource === 'live' && preview.id === 2 && previewData && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[['Gross Pay', previewData.totalGrossPay], ['Net Pay', previewData.totalNetPay], ['PF', previewData.totalPF], ['ESI', previewData.totalESI], ['TDS', previewData.totalTDS]].map(([label, val]) => (
                  <div key={label} className="p-4 bg-surface-3 rounded-xl">
                    <p className="text-xs text-text-secondary">{label}</p>
                    <p className="text-lg font-semibold text-text mt-1">₹{Number(val || 0).toLocaleString()}</p>
                  </div>
                ))}
                {Object.keys(previewData.departmentWiseCost || {}).length > 0 && (
                  <div className="col-span-full p-4 bg-surface-3 rounded-xl">
                    <p className="text-xs text-text-secondary mb-2">Department-wise Cost</p>
                    <div className="space-y-1.5">
                      {Object.entries(previewData.departmentWiseCost).map(([dept, cost]) => (
                        <div key={dept} className="flex justify-between text-sm"><span className="text-text-secondary">{dept}</span><span className="text-text font-medium">₹{Number(cost).toLocaleString()}</span></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!previewLoading && previewSource !== 'live' && (
              <div className="p-12 bg-surface-3 rounded-xl text-center border-2 border-dashed border-border">
                <preview.icon size={48} className="mx-auto text-text-secondary mb-3" />
                <p className="text-lg font-semibold text-text">{preview.name}</p>
                <p className="text-sm text-text-secondary mt-1">{preview.description}</p>
                <p className="text-xs text-text-secondary mt-4">Report preview with charts and data tables will render here.</p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" icon={FileText} onClick={() => handleExport(preview, 'PDF')}>Download PDF</Button>
              <Button variant="secondary" icon={FileSpreadsheet} onClick={() => handleExport(preview, 'Excel')}>Download Excel</Button>
              <Button icon={Mail} onClick={() => handleEmail(preview)}>Email Report</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
