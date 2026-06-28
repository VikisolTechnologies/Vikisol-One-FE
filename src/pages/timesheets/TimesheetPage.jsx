import { useState, useMemo } from 'react';
import { Check, X, ChevronLeft, ChevronRight, Save, Send, Lock, Unlock } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SearchFilter from '../../components/ui/SearchFilter';
import Tabs from '../../components/ui/Tabs';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { TIMESHEET_DATA } from '../../data/mock';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TimesheetPage() {
  const { data, timesheets } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const isManager = ['ceo', 'hr_manager', 'manager', 'admin'].includes(user?.role);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [myData, setMyData] = useState(TIMESHEET_DATA);
  const [selected, setSelected] = useState([]);

  const allTs = data.timesheets;
  const filtered = useMemo(() => {
    return allTs.filter(t => {
      const s = search.toLowerCase();
      const matchSearch = !s || t.empName.toLowerCase().includes(s) || t.empId.toLowerCase().includes(s) || t.project.toLowerCase().includes(s);
      const matchStatus = !filters.status || filters.status === 'All' || t.status === filters.status;
      const matchDept = !filters.department || filters.department === 'All' || t.department === filters.department;
      return matchSearch && matchStatus && matchDept;
    });
  }, [allTs, search, filters]);

  const handleApprove = (ts) => { timesheets.update(ts.id, { status: 'Approved' }); toast.success(`Timesheet approved for ${ts.empName}`); };
  const handleReject = async (ts) => {
    const ok = await confirm({ title: 'Reject Timesheet?', message: `Reject timesheet for ${ts.empName}?`, type: 'warning', confirmText: 'Reject' });
    if (ok) { timesheets.update(ts.id, { status: 'Rejected' }); toast.warning(`Timesheet rejected for ${ts.empName}`); }
  };

  const handleBulkApprove = () => {
    const pending = filtered.filter(t => t.status === 'Submitted' || t.status === 'Pending');
    if (pending.length === 0) { toast.info('No pending timesheets to approve'); return; }
    pending.forEach(t => timesheets.update(t.id, { status: 'Approved' }));
    toast.success(`${pending.length} timesheets approved`);
  };

  const updateHour = (pi, di, val) => {
    setMyData(prev => ({ ...prev, projects: prev.projects.map((p, i) => {
      if (i !== pi) return p;
      const hours = [...p.hours]; hours[di] = Math.max(0, Math.min(24, parseInt(val) || 0));
      return { ...p, hours, total: hours.reduce((a, b) => a + b, 0) };
    })}));
  };

  const handleSaveDraft = () => toast.info('Timesheet saved as draft');
  const handleSubmit = () => toast.success('Timesheet submitted for approval');

  const grandTotal = myData.projects.reduce((sum, p) => sum + p.total, 0);

  const columns = [
    { key: 'empName', label: 'Employee', render: (v, row) => <div><p className="font-medium text-text text-sm">{v}</p><p className="text-xs text-text-secondary">{row.empId}</p></div> },
    { key: 'project', label: 'Project' },
    { key: 'task', label: 'Task' },
    { key: 'total', label: 'Hours', render: (v) => <span className="font-semibold text-primary">{v}h</span> },
    { key: 'weekStart', label: 'Week' },
    { key: 'status', label: 'Status', render: (v) => <Badge dot>{v}</Badge> },
    ...(isManager ? [{ key: 'actions', label: '', sortable: false, render: (_, row) => (
      <div className="flex gap-1">
        {(row.status === 'Submitted' || row.status === 'Pending') && (
          <>
            <button onClick={(e) => { e.stopPropagation(); handleApprove(row); }} className="p-1.5 rounded-lg hover:bg-success/10 text-success"><Check size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); handleReject(row); }} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger"><X size={14} /></button>
          </>
        )}
      </div>
    )}] : []),
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Timesheets' }]} />
      <Tabs tabs={[
        { id: 'my', label: 'My Timesheet', content: (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button className="p-1 hover:bg-surface-3 rounded text-text-secondary"><ChevronLeft size={16} /></button>
                <span className="text-sm text-text font-medium">{myData.week}</span>
                <button className="p-1 hover:bg-surface-3 rounded text-text-secondary"><ChevronRight size={16} /></button>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" icon={Save} size="sm" onClick={handleSaveDraft}>Save Draft</Button>
                <Button icon={Send} size="sm" onClick={handleSubmit}>Submit</Button>
              </div>
            </div>
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary w-64">Project / Task</th>
                    {days.map(d => <th key={d} className="text-center py-3 px-2 text-xs font-semibold text-text-secondary w-16">{d}</th>)}
                    <th className="text-center py-3 px-4 text-xs font-semibold text-text-secondary">Total</th>
                  </tr></thead>
                  <tbody>
                    {myData.projects.map((p, pi) => (
                      <tr key={pi} className="border-b border-border/50">
                        <td className="py-3 px-4"><p className="font-medium text-text">{p.name}</p><p className="text-xs text-text-secondary">{p.task}</p></td>
                        {p.hours.map((h, di) => (
                          <td key={di} className="py-2 px-1 text-center">
                            <input type="number" value={h} onChange={e => updateHour(pi, di, e.target.value)} className="w-12 h-9 bg-surface-3 border border-border rounded-lg text-center text-sm text-text focus:outline-none focus:border-primary mx-auto" min="0" max="24" />
                          </td>
                        ))}
                        <td className="py-3 px-4 text-center font-semibold text-text">{p.total}h</td>
                      </tr>
                    ))}
                    <tr className="bg-surface-3/50">
                      <td className="py-3 px-4 font-semibold text-text">Total</td>
                      {days.map((_, di) => <td key={di} className="py-3 px-2 text-center font-semibold text-text">{myData.projects.reduce((s, p) => s + p.hours[di], 0)}h</td>)}
                      <td className="py-3 px-4 text-center font-bold text-primary text-lg">{grandTotal}h</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )},
        ...(isManager ? [{ id: 'all', label: 'All Timesheets', content: (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <SearchFilter searchValue={search} onSearch={setSearch} filters={[
                { key: 'status', label: 'Status', options: ['Submitted', 'Approved', 'Rejected', 'Draft', 'Pending'] },
                { key: 'department', label: 'Department', options: data.departments },
              ]} activeFilters={filters} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClearFilters={() => setFilters({})} />
              <Button size="sm" onClick={handleBulkApprove}>Bulk Approve</Button>
            </div>
            <Card padding={false}><DataTable columns={columns} data={filtered} pageSize={12} /></Card>
          </div>
        )}] : []),
      ]} />
    </div>
  );
}
