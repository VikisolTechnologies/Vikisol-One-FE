import { useState, useMemo } from 'react';
import { Check, X, ChevronLeft, ChevronRight, Save, Send, Eye } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SelectableTable from '../../components/ui/SelectableTable';
import BulkActions from '../../components/ui/BulkActions';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SearchFilter from '../../components/ui/SearchFilter';
import Modal from '../../components/ui/Modal';
import ApprovalTimeline from '../../components/ui/ApprovalTimeline';
import Tabs from '../../components/ui/Tabs';
import { useData } from '../../context/DataContext';
import { useApproval } from '../../context/ApprovalEngine';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TimesheetPage() {
  const { data, timesheets, timesheetsSource, timesheetsLoading } = useData();
  const { approve, reject, bulkApprove, bulkReject, isManager, isCEO } = useApproval();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();

  const isEmployee = user?.role === 'employee';

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDetail, setShowDetail] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);

  // Employee's own timesheet
  const [myStatus, setMyStatus] = useState('Draft');
  const [myProjects, setMyProjects] = useState([
    { name: 'Vikisol Website Redesign', task: 'UI Development', hours: [8, 8, 8, 8, 8, 4, 0], total: 44 },
    { name: 'Mobile App Development', task: 'API Integration', hours: [0, 0, 0, 0, 0, 4, 0], total: 4 },
  ]);

  const updateHour = (pi, di, val) => {
    if (myStatus === 'Approved' || myStatus === 'Submitted') return;
    setMyProjects(prev => prev.map((p, i) => {
      if (i !== pi) return p;
      const hours = [...p.hours]; hours[di] = Math.max(0, Math.min(24, parseInt(val) || 0));
      return { ...p, hours, total: hours.reduce((a, b) => a + b, 0) };
    }));
  };

  const grandTotal = myProjects.reduce((sum, p) => sum + p.total, 0);

  const handleSaveDraft = () => { setMyStatus('Draft'); toast.info('Timesheet saved as draft'); };
  const handleSubmit = async () => {
    if (grandTotal === 0) { toast.error('Cannot submit empty timesheet'); return; }
    const ok = await confirm({ title: 'Submit Timesheet?', message: `Submit ${grandTotal} hours for this week? Your manager will be notified for approval.`, type: 'info', confirmText: 'Submit' });
    if (!ok) return;
    try {
      if (timesheetsSource === 'live') {
        // The backend models one entry per day/project; submit any of our own draft entries for this period.
        const myDraftIds = data.timesheets.filter(t => t.empId === user?.id && t.status === 'Draft').map(t => t.id);
        if (myDraftIds.length > 0) await timesheets.submit(myDraftIds);
      }
      setMyStatus('Submitted');
      toast.success('Timesheet submitted for manager approval');
    } catch (err) {
      toast.error(err.message || 'Failed to submit timesheet');
    }
  };
  const handleRecall = async () => {
    const ok = await confirm({ title: 'Recall Timesheet?', message: 'Recall this timesheet to make changes?', type: 'warning', confirmText: 'Recall' });
    if (ok) { setMyStatus('Draft'); toast.info('Timesheet recalled. You can edit and resubmit.'); }
  };

  // Team timesheets (for managers)
  const teamTimesheets = useMemo(() => {
    if (isEmployee) return [];
    return data.timesheets;
  }, [data.timesheets, isEmployee]);

  const filteredTeam = useMemo(() => teamTimesheets.filter(t => {
    const s = search.toLowerCase();
    const matchSearch = !s || t.empName.toLowerCase().includes(s) || t.empId.toLowerCase().includes(s) || t.project.toLowerCase().includes(s);
    const matchStatus = !filters.status || filters.status === 'All' || t.status === filters.status;
    const matchDept = !filters.department || filters.department === 'All' || t.department === filters.department;
    return matchSearch && matchStatus && matchDept;
  }), [teamTimesheets, search, filters]);

  const handleApprove = async (ts) => {
    try {
      await approve(ts, 'timesheets', timesheets.update);
    } catch (err) {
      toast.error(err.message || 'Failed to approve timesheet');
    }
  };
  const handleReject = (ts) => { setShowRejectModal(ts); };
  const confirmReject = async () => {
    try {
      await reject(showRejectModal, 'timesheets', timesheets.update, rejectReason);
    } catch (err) {
      toast.error(err.message || 'Failed to reject timesheet');
    } finally {
      setShowRejectModal(null); setRejectReason('');
    }
  };

  const handleBulkApprove = async () => {
    const items = filteredTeam.filter(t => selectedIds.includes(t.id) && (t.status === 'Submitted' || t.status === 'Pending'));
    if (items.length === 0) { toast.info('No pending timesheets selected'); return; }
    try {
      await bulkApprove(items, timesheets.update);
    } catch (err) {
      toast.error(err.message || 'Failed to approve timesheets');
    } finally {
      setSelectedIds([]);
    }
  };
  const handleBulkReject = async () => {
    const items = filteredTeam.filter(t => selectedIds.includes(t.id) && (t.status === 'Submitted' || t.status === 'Pending'));
    if (items.length === 0) return;
    try {
      await bulkReject(items, timesheets.update, 'Bulk rejected');
    } catch (err) {
      toast.error(err.message || 'Failed to reject timesheets');
    } finally {
      setSelectedIds([]);
    }
  };

  const teamColumns = [
    { key: 'empName', label: 'Employee', render: (v, row) => <div><p className="font-medium text-text text-sm">{v}</p><p className="text-[10px] text-text-secondary">{row.empId} · {row.department}</p></div> },
    { key: 'project', label: 'Project' },
    { key: 'task', label: 'Task' },
    { key: 'total', label: 'Hours', render: (v) => <span className="font-semibold text-primary">{v}h</span> },
    { key: 'weekStart', label: 'Week' },
    { key: 'status', label: 'Status', render: (v) => <Badge dot>{v}</Badge> },
    { key: 'actions', label: '', sortable: false, render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); setShowDetail(row); }} className="p-1 rounded hover:bg-surface-3 text-text-secondary"><Eye size={14} /></button>
        {(row.status === 'Submitted' || row.status === 'Pending') && (
          <>
            <button onClick={(e) => { e.stopPropagation(); handleApprove(row); }} className="p-1 rounded hover:bg-success/10 text-success"><Check size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); handleReject(row); }} className="p-1 rounded hover:bg-danger/10 text-danger"><X size={14} /></button>
          </>
        )}
      </div>
    )},
  ];

  const statusColors = { Draft: 'default', Submitted: 'warning', Approved: 'success', Rejected: 'danger' };
  const pendingCount = teamTimesheets.filter(t => t.status === 'Submitted' || t.status === 'Pending').length;
  const isLocked = myStatus === 'Submitted' || myStatus === 'Approved';

  const tabs = [];

  // Employee always sees their timesheet
  if (isEmployee || user?.role === 'manager') {
    tabs.push({ id: 'my', label: 'My Timesheet', content: (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <button className="p-1 hover:bg-surface-3 rounded text-text-secondary"><ChevronLeft size={16} /></button>
              <span className="text-sm text-text font-medium">23 Jun - 29 Jun 2026</span>
              <button className="p-1 hover:bg-surface-3 rounded text-text-secondary"><ChevronRight size={16} /></button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={statusColors[myStatus]}>{myStatus}</Badge>
              {myStatus === 'Submitted' && <span className="text-[10px] text-text-secondary">Waiting for manager approval</span>}
              {myStatus === 'Approved' && <span className="text-[10px] text-success">Approved by Rohit Sharma</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {myStatus === 'Draft' && <Button variant="secondary" icon={Save} size="sm" onClick={handleSaveDraft}>Save Draft</Button>}
            {myStatus === 'Draft' && <Button icon={Send} size="sm" onClick={handleSubmit}>Submit for Approval</Button>}
            {myStatus === 'Submitted' && <Button variant="secondary" size="sm" onClick={handleRecall}>Recall</Button>}
            {myStatus === 'Rejected' && <Button icon={Send} size="sm" onClick={() => { setMyStatus('Draft'); toast.info('You can now edit and resubmit'); }}>Edit & Resubmit</Button>}
          </div>
        </div>

        {myStatus === 'Rejected' && (
          <div className="p-3 bg-danger/5 border border-danger/20 rounded-xl">
            <p className="text-xs text-danger font-semibold">Rejected by Rohit Sharma</p>
            <p className="text-xs text-text-secondary mt-0.5">Reason: "Please log hours for Internal Project as well"</p>
          </div>
        )}

        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary w-64">Project / Task</th>
                {days.map(d => <th key={d} className="text-center py-3 px-2 text-xs font-semibold text-text-secondary w-16">{d}</th>)}
                <th className="text-center py-3 px-4 text-xs font-semibold text-text-secondary">Total</th>
              </tr></thead>
              <tbody>
                {myProjects.map((p, pi) => (
                  <tr key={pi} className="border-b border-border/50">
                    <td className="py-3 px-4"><p className="font-medium text-text">{p.name}</p><p className="text-xs text-text-secondary">{p.task}</p></td>
                    {p.hours.map((h, di) => (
                      <td key={di} className="py-2 px-1 text-center">
                        <input type="number" value={h} onChange={e => updateHour(pi, di, e.target.value)}
                          disabled={isLocked}
                          className={`w-12 h-9 bg-surface-3 border border-border rounded-lg text-center text-sm text-text focus:outline-none focus:border-primary mx-auto ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                          min="0" max="24" />
                      </td>
                    ))}
                    <td className="py-3 px-4 text-center font-semibold text-text">{p.total}h</td>
                  </tr>
                ))}
                <tr className="bg-surface-3/50">
                  <td className="py-3 px-4 font-semibold text-text">Total</td>
                  {days.map((_, di) => <td key={di} className="py-3 px-2 text-center font-semibold text-text">{myProjects.reduce((s, p) => s + p.hours[di], 0)}h</td>)}
                  <td className="py-3 px-4 text-center font-bold text-primary text-lg">{grandTotal}h</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )});
  }

  // Manager/CEO sees team timesheets
  if (isManager) {
    tabs.push({ id: 'team', label: `Team Timesheets ${pendingCount > 0 ? `(${pendingCount} pending)` : ''}`, content: (
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-1">
          {timesheetsLoading ? <span>Loading from server...</span> : null}
          {!timesheetsLoading && timesheetsSource === 'mock' && <span className="text-warning">(demo data)</span>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Submitted', value: teamTimesheets.filter(t => t.status === 'Submitted').length, color: 'text-warning' },
            { label: 'Pending', value: teamTimesheets.filter(t => t.status === 'Pending').length, color: 'text-info' },
            { label: 'Approved', value: teamTimesheets.filter(t => t.status === 'Approved').length, color: 'text-success' },
            { label: 'Rejected', value: teamTimesheets.filter(t => t.status === 'Rejected').length, color: 'text-danger' },
          ].map(s => (
            <Card key={s.label}><p className="text-[10px] text-text-secondary font-medium uppercase">{s.label}</p><p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p></Card>
          ))}
        </div>

        <SearchFilter searchValue={search} onSearch={setSearch} filters={[
          { key: 'status', label: 'Status', options: ['Submitted', 'Pending', 'Approved', 'Rejected', 'Draft'] },
          { key: 'department', label: 'Department', options: data.departments },
        ]} activeFilters={filters} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClearFilters={() => setFilters({})} />

        <Card padding={false}>
          <SelectableTable columns={teamColumns} data={filteredTeam} pageSize={12} selected={selectedIds} onSelectChange={setSelectedIds} onRowClick={setShowDetail} />
        </Card>

        <BulkActions selectedCount={selectedIds.length} onApprove={handleBulkApprove} onReject={handleBulkReject} onExport={() => { toast.success('Exported'); setSelectedIds([]); }} onClear={() => setSelectedIds([])} />
      </div>
    )});
  }

  // CEO: no "My Timesheet" tab, only team view
  if (isCEO && !tabs.find(t => t.id === 'my')) {
    // CEO doesn't fill timesheets, handled above
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Timesheets' }]} />
      <h1 className="text-xl font-bold text-text">Timesheets</h1>
      {tabs.length > 1 ? <Tabs tabs={tabs} /> : tabs[0]?.content}

      {/* Detail Modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Timesheet Details" size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[['Employee', showDetail.empName], ['Employee ID', showDetail.empId], ['Department', showDetail.department], ['Project', showDetail.project], ['Task', showDetail.task], ['Total Hours', `${showDetail.total}h`], ['Week', showDetail.weekStart], ['Status', showDetail.status], ['Approved By', showDetail.approvedBy || '-']].map(([k, v]) => (
                <div key={k}><p className="text-xs text-text-secondary">{k}</p><p className="text-text font-medium">{v}</p></div>
              ))}
            </div>
            {showDetail.approvalHistory && showDetail.approvalHistory.length > 0 && (
              <div><h4 className="text-sm font-semibold text-text mb-3">Approval Timeline</h4><ApprovalTimeline history={showDetail.approvalHistory} /></div>
            )}
            <div className="flex gap-2 border-t border-border pt-4">
              {(showDetail.status === 'Submitted' || showDetail.status === 'Pending') && isManager && (
                <><Button icon={Check} onClick={() => { handleApprove(showDetail); setShowDetail(null); }}>Approve</Button><Button variant="danger" icon={X} onClick={() => { handleReject(showDetail); setShowDetail(null); }}>Reject</Button></>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Reason */}
      <Modal open={!!showRejectModal} onClose={() => setShowRejectModal(null)} title="Reject Timesheet" size="sm">
        <div className="space-y-4">
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." className="w-full bg-surface-3 border border-border rounded-lg py-2.5 px-3 text-sm text-text focus:outline-none focus:border-primary resize-none" rows={3} />
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowRejectModal(null)}>Cancel</Button><Button variant="danger" onClick={confirmReject}>Reject</Button></div>
        </div>
      </Modal>
    </div>
  );
}
