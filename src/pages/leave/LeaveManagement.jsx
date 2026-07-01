import { useState, useMemo } from 'react';
import { Plus, Check, X, Calendar, Eye } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SelectableTable from '../../components/ui/SelectableTable';
import BulkActions from '../../components/ui/BulkActions';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Select, Textarea } from '../../components/ui/Input';
import ProgressBar from '../../components/ui/ProgressBar';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SearchFilter from '../../components/ui/SearchFilter';
import ApprovalTimeline from '../../components/ui/ApprovalTimeline';
import { useData } from '../../context/DataContext';
import { useApproval } from '../../context/ApprovalEngine';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

export default function LeaveManagement() {
  const { data, leaveRequests, holidays, leaveRequestsSource, leaveRequestsLoading, leaveTypes, leaveBalances } = useData();
  const { approve, reject, bulkApprove, bulkReject, isCEO, isManager } = useApproval();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();

  const isEmployee = user?.role === 'employee';
  const isLive = leaveRequestsSource === 'live';

  const [showApply, setShowApply] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState({ type: 'Casual Leave', leaveTypeId: '', from: '', to: '', reason: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);

  const allLeaves = useMemo(() => {
    if (isEmployee) {
      return data.leaveRequests.filter(l => l.empName === user?.name || l.empId === user?.empId);
    }
    return data.leaveRequests;
  }, [data.leaveRequests, isEmployee, user]);

  const filtered = useMemo(() => allLeaves.filter(l => {
    const s = search.toLowerCase();
    const matchSearch = !s || l.empName.toLowerCase().includes(s) || l.empId.toLowerCase().includes(s);
    const matchType = !filters.type || filters.type === 'All' || l.type === filters.type;
    const matchStatus = !filters.status || filters.status === 'All' || l.status === filters.status;
    const matchDept = !filters.department || filters.department === 'All' || l.department === filters.department;
    return matchSearch && matchType && matchStatus && matchDept;
  }), [allLeaves, search, filters]);

  const handleApply = async () => {
    if (!form.from || !form.to) { toast.error('Please select dates'); return; }
    if (!form.reason) { toast.error('Please enter a reason'); return; }
    const days = Math.max(1, Math.ceil((new Date(form.to) - new Date(form.from)) / 86400000) + 1);
    try {
      if (isLive) {
        await leaveRequests.create(form);
      } else {
        leaveRequests.create({
          empName: user.name, empId: user.empId || 'VKS001', department: user.department || 'Management',
          type: form.type, from: form.from, to: form.to, days, reason: form.reason,
          status: 'Pending', appliedOn: new Date().toISOString().split('T')[0],
          approver: 'HR Manager',
          approvalHistory: [{ id: Date.now(), action: 'Submitted', by: user.name, designation: user.designation, role: user.role, timestamp: new Date().toISOString(), reason: '' }],
        });
      }
      toast.success('Leave request submitted');
      setShowApply(false);
      setForm({ type: 'Casual Leave', leaveTypeId: '', from: '', to: '', reason: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to submit leave request');
    }
  };

  const handleApprove = async (leave) => {
    try {
      await approve(leave, 'leaveRequests', leaveRequests.update);
    } catch (err) {
      toast.error(err.message || 'Failed to approve leave');
    }
  };
  const handleReject = (leave) => { setShowRejectModal(leave); };
  const confirmReject = async () => {
    try {
      await reject(showRejectModal, 'leaveRequests', leaveRequests.update, rejectReason);
    } catch (err) {
      toast.error(err.message || 'Failed to reject leave');
    } finally {
      setShowRejectModal(null);
      setRejectReason('');
    }
  };
  const handleCancel = async (leave) => {
    const ok = await confirm({ title: 'Cancel Leave?', message: 'Cancel this leave request?', type: 'warning', confirmText: 'Cancel Leave' });
    if (!ok) return;
    try {
      await leaveRequests.update(leave.id, { status: 'Cancelled' });
      toast.info('Leave cancelled');
    } catch (err) {
      toast.error(err.message || 'Failed to cancel leave');
    }
  };

  const handleBulkApprove = async () => {
    const items = filtered.filter(l => selectedIds.includes(l.id) && l.status === 'Pending');
    if (items.length === 0) { toast.info('No pending leaves selected'); return; }
    try {
      await bulkApprove(items, leaveRequests.update);
    } catch (err) {
      toast.error(err.message || 'Failed to bulk approve');
    } finally {
      setSelectedIds([]);
    }
  };
  const handleBulkReject = async () => {
    const items = filtered.filter(l => selectedIds.includes(l.id) && l.status === 'Pending');
    if (items.length === 0) { toast.info('No pending leaves selected'); return; }
    try {
      await bulkReject(items, leaveRequests.update, 'Bulk rejected');
    } catch (err) {
      toast.error(err.message || 'Failed to bulk reject');
    } finally {
      setSelectedIds([]);
    }
  };

  const leaveStats = useMemo(() => ({
    total: allLeaves.length,
    pending: allLeaves.filter(l => l.status === 'Pending').length,
    approved: allLeaves.filter(l => l.status === 'Approved').length,
    rejected: allLeaves.filter(l => l.status === 'Rejected').length,
  }), [allLeaves]);

  const columns = [
    ...(!isEmployee ? [{ key: 'empName', label: 'Employee', render: (v, row) => <div><p className="font-medium text-text text-sm">{v}</p><p className="text-[10px] text-text-secondary">{row.empId} · {row.department}</p></div> }] : []),
    { key: 'type', label: 'Type' },
    { key: 'from', label: 'From' },
    { key: 'to', label: 'To' },
    { key: 'days', label: 'Days', render: (v) => <span className="font-semibold">{v}</span> },
    { key: 'reason', label: 'Reason', render: (v) => <span className="truncate max-w-[120px] block text-text-secondary">{v}</span> },
    { key: 'status', label: 'Status', render: (v) => <Badge dot>{v}</Badge> },
    { key: 'actions', label: '', sortable: false, render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); setShowDetail(row); }} className="p-1 rounded hover:bg-surface-3 text-text-secondary"><Eye size={14} /></button>
        {row.status === 'Pending' && isManager && (
          <>
            <button onClick={(e) => { e.stopPropagation(); handleApprove(row); }} className="p-1 rounded hover:bg-success/10 text-success"><Check size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); handleReject(row); }} className="p-1 rounded hover:bg-danger/10 text-danger"><X size={14} /></button>
          </>
        )}
        {row.status === 'Pending' && isEmployee && (
          <button onClick={(e) => { e.stopPropagation(); handleCancel(row); }} className="text-[10px] px-2 py-1 rounded hover:bg-surface-3 text-text-secondary">Cancel</button>
        )}
      </div>
    )},
  ];

  // Employee leave balance - prefer live balances from the backend, fall back to mock values
  const balanceColors = ['primary', 'danger', 'success', 'info', 'warning'];
  const leaveBalance = isLive && leaveBalances.length
    ? leaveBalances.map((b, i) => ({ type: b.type, used: b.used, total: b.total, color: balanceColors[i % balanceColors.length] }))
    : [
        { type: 'Casual Leave', used: 4, total: 12, color: 'primary' },
        { type: 'Sick Leave', used: 2, total: 8, color: 'danger' },
        { type: 'Earned Leave', used: 3, total: 15, color: 'success' },
        { type: 'Comp Off', used: 1, total: 5, color: 'info' },
      ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: isEmployee ? 'My Leave' : 'Leave Management' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">{isEmployee ? 'My Leave' : 'Leave Management'}</h1>
          <p className="text-sm text-text-secondary">
            {leaveRequestsLoading ? 'Loading from server...' : `${leaveStats.pending} pending · ${leaveStats.approved} approved`}
            {!leaveRequestsLoading && !isLive && <span className="ml-2 text-warning">(demo data)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Calendar} size="sm" onClick={() => setShowHolidays(true)}>Holidays</Button>
          {(isEmployee || user?.role === 'manager') && <Button icon={Plus} size="sm" onClick={() => setShowApply(true)}>Apply Leave</Button>}
        </div>
      </div>

      {/* Employee: Leave Balance */}
      {isEmployee && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {leaveBalance.map(l => (
            <Card key={l.type}>
              <p className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider">{l.type}</p>
              <div className="flex items-end justify-between mt-2">
                <p className="text-2xl font-bold text-text">{l.total - l.used}</p>
                <p className="text-xs text-text-secondary">of {l.total}</p>
              </div>
              <ProgressBar value={l.used} max={l.total} color={l.color} className="mt-2" />
            </Card>
          ))}
        </div>
      )}

      {/* Manager: Stats */}
      {isManager && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Requests', value: leaveStats.total, color: 'text-text' },
            { label: 'Pending', value: leaveStats.pending, color: 'text-warning' },
            { label: 'Approved', value: leaveStats.approved, color: 'text-success' },
            { label: 'Rejected', value: leaveStats.rejected, color: 'text-danger' },
          ].map(s => (
            <Card key={s.label}><p className="text-[10px] text-text-secondary font-medium uppercase">{s.label}</p><p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p></Card>
          ))}
        </div>
      )}

      {!isEmployee && (
        <SearchFilter searchValue={search} onSearch={setSearch} filters={[
          { key: 'type', label: 'Leave Type', options: ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Comp Off', 'Work From Home', 'Half Day'] },
          { key: 'status', label: 'Status', options: ['Pending', 'Approved', 'Rejected', 'Cancelled'] },
          { key: 'department', label: 'Department', options: data.departments },
        ]} activeFilters={filters} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClearFilters={() => setFilters({})} />
      )}

      <Card title={isEmployee ? 'My Leave Requests' : 'Leave Requests'} padding={false}>
        <SelectableTable columns={columns} data={filtered} pageSize={10} selected={isManager ? selectedIds : []} onSelectChange={isManager ? setSelectedIds : () => {}} onRowClick={setShowDetail} />
      </Card>

      {isManager && <BulkActions selectedCount={selectedIds.length} onApprove={handleBulkApprove} onReject={handleBulkReject} onExport={() => { toast.success('Exported'); setSelectedIds([]); }} onClear={() => setSelectedIds([])} />}

      {/* Detail Modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Leave Request Details" size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[['Employee', showDetail.empName], ['Employee ID', showDetail.empId], ['Department', showDetail.department], ['Leave Type', showDetail.type], ['From', showDetail.from], ['To', showDetail.to], ['Days', showDetail.days], ['Applied On', showDetail.appliedOn], ['Status', showDetail.status]].map(([k, v]) => (
                <div key={k}><p className="text-xs text-text-secondary">{k}</p><p className="text-text font-medium">{v}</p></div>
              ))}
            </div>
            {showDetail.reason && <div className="p-3 bg-surface-3 rounded-lg"><p className="text-xs text-text-secondary mb-1">Reason</p><p className="text-sm text-text">{showDetail.reason}</p></div>}
            {showDetail.approvedBy && <div className="p-3 bg-success/5 border border-success/20 rounded-lg"><p className="text-xs text-success mb-1">Approved by</p><p className="text-sm font-medium text-text">{showDetail.approvedBy}</p><p className="text-xs text-text-secondary">{showDetail.approvedByDesignation} · {showDetail.approvedAt ? new Date(showDetail.approvedAt).toLocaleString('en-IN') : ''}</p></div>}
            {showDetail.rejectedBy && <div className="p-3 bg-danger/5 border border-danger/20 rounded-lg"><p className="text-xs text-danger mb-1">Rejected by</p><p className="text-sm font-medium text-text">{showDetail.rejectedBy}</p>{showDetail.rejectedReason && <p className="text-xs text-text-secondary mt-1">Reason: {showDetail.rejectedReason}</p>}</div>}
            {showDetail.approvalHistory && showDetail.approvalHistory.length > 0 && (
              <div><h4 className="text-sm font-semibold text-text mb-3">Approval Timeline</h4><ApprovalTimeline history={showDetail.approvalHistory} /></div>
            )}
            <div className="flex gap-2 border-t border-border pt-4">
              {showDetail.status === 'Pending' && isManager && (
                <><Button icon={Check} onClick={() => { handleApprove(showDetail); setShowDetail(null); }}>Approve</Button><Button variant="danger" icon={X} onClick={() => { handleReject(showDetail); setShowDetail(null); }}>Reject</Button></>
              )}
              {showDetail.status === 'Pending' && isEmployee && <Button variant="secondary" onClick={() => { handleCancel(showDetail); setShowDetail(null); }}>Cancel Request</Button>}
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Reason */}
      <Modal open={!!showRejectModal} onClose={() => setShowRejectModal(null)} title="Reject Leave" size="sm">
        <div className="space-y-4">
          <Textarea label="Reason for rejection *" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter reason..." />
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowRejectModal(null)}>Cancel</Button><Button variant="danger" onClick={confirmReject}>Reject</Button></div>
        </div>
      </Modal>

      {/* Apply Leave */}
      <Modal open={showApply} onClose={() => setShowApply(false)} title="Apply Leave">
        <div className="space-y-4">
          {isLive && leaveTypes.length ? (
            <Select label="Leave Type" value={form.leaveTypeId} onChange={e => setForm(p => ({ ...p, leaveTypeId: e.target.value }))} options={leaveTypes.map(t => ({ value: t.id, label: t.name }))} />
          ) : (
            <Select label="Leave Type" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} options={['Casual Leave','Sick Leave','Earned Leave','Comp Off','Work From Home','Half Day'].map(t => ({ value: t, label: t }))} />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="From Date *" type="date" value={form.from} onChange={e => setForm(p => ({ ...p, from: e.target.value }))} />
            <Input label="To Date *" type="date" value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))} />
          </div>
          <Textarea label="Reason *" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Reason for leave..." />
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowApply(false)}>Cancel</Button><Button onClick={handleApply}>Submit</Button></div>
        </div>
      </Modal>

      {/* Holidays */}
      <Modal open={showHolidays} onClose={() => setShowHolidays(false)} title="Holiday Calendar 2024" size="lg">
        <div className="space-y-2">{data.holidays.map(h => (
          <div key={h.id} className="flex items-center justify-between p-3 bg-surface-3 rounded-lg">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Calendar size={16} className="text-primary" /></div><div><p className="text-sm font-medium text-text">{h.name}</p><p className="text-xs text-text-secondary">{h.date}</p></div></div>
            <div className="flex gap-2"><Badge variant={h.optional ? 'warning' : 'success'}>{h.optional ? 'Optional' : 'Mandatory'}</Badge><Badge variant="default">{h.type}</Badge></div>
          </div>
        ))}</div>
      </Modal>
    </div>
  );
}
