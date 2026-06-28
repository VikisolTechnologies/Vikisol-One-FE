import { useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, FileText, TrendingUp, Printer, Mail, Calendar, Eye } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { useToast } from '../../components/ui/Toast';

const reports = [
  { id: 1, name: 'Attendance Report', description: 'Monthly attendance summary', category: 'Attendance', icon: BarChart3 },
  { id: 2, name: 'Payroll Report', description: 'Monthly payroll breakdown', category: 'Payroll', icon: FileSpreadsheet },
  { id: 3, name: 'Leave Report', description: 'Leave utilization and balance', category: 'Leave', icon: FileText },
  { id: 4, name: 'Recruitment Report', description: 'Hiring pipeline metrics', category: 'Recruitment', icon: TrendingUp },
  { id: 5, name: 'Performance Report', description: 'Performance ratings summary', category: 'Performance', icon: BarChart3 },
  { id: 6, name: 'Timesheet Report', description: 'Weekly/monthly timesheet summary', category: 'Timesheets', icon: FileSpreadsheet },
  { id: 7, name: 'Attrition Report', description: 'Employee attrition trends', category: 'HR', icon: TrendingUp },
  { id: 8, name: 'Project Report', description: 'Project status and allocation', category: 'Projects', icon: BarChart3 },
  { id: 9, name: 'Asset Report', description: 'Asset inventory and allocation', category: 'Assets', icon: FileSpreadsheet },
  { id: 10, name: 'Department Report', description: 'Department-wise analytics', category: 'HR', icon: BarChart3 },
  { id: 11, name: 'Revenue Report', description: 'Monthly revenue analysis', category: 'Finance', icon: TrendingUp },
  { id: 12, name: 'Employee Report', description: 'Employee demographics overview', category: 'HR', icon: FileText },
];

export default function ReportsPage() {
  const toast = useToast();
  const [preview, setPreview] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '2024-01-01', to: '2024-05-31' });
  const [filter, setFilter] = useState('All');

  const categories = ['All', ...new Set(reports.map(r => r.category))];
  const filtered = filter === 'All' ? reports : reports.filter(r => r.category === filter);

  const handleExport = (report, format) => toast.success(`${report.name} exported as ${format}`);
  const handleEmail = (report) => toast.success(`${report.name} sent via email`);
  const handleSchedule = (report) => toast.info(`${report.name} scheduled for weekly generation`);

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
              <Button size="sm" variant="ghost" icon={Eye} onClick={() => setPreview(r)}>Preview</Button>
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
            <div className="p-4 bg-surface-3 rounded-xl">
              <p className="text-xs text-text-secondary mb-1">Report Period</p>
              <p className="text-sm font-medium text-text">{dateRange.from} to {dateRange.to}</p>
            </div>
            <div className="p-12 bg-surface-3 rounded-xl text-center border-2 border-dashed border-border">
              <preview.icon size={48} className="mx-auto text-text-secondary mb-3" />
              <p className="text-lg font-semibold text-text">{preview.name}</p>
              <p className="text-sm text-text-secondary mt-1">{preview.description}</p>
              <p className="text-xs text-text-secondary mt-4">Report preview with charts and data tables will render here.</p>
            </div>
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
