import { useState, useMemo, useEffect } from 'react';
import { Check, X, Save, Send, Eye } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input, { Select } from '../../components/ui/Input';
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
const WORK_LOCATIONS = ['Office', 'Remote', 'Client Location'];

function computeHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  const mins = (outH * 60 + outM) - (inH * 60 + inM);
  return mins > 0 ? Math.round((mins / 60) * 100) / 100 : 0;
}

// Formats decimal hours as HH:MM (e.g. 7.5 -> "07:30") instead of "0h"/"7.5h" decimal notation
function formatHoursHM(decimalHours) {
  const totalMinutes = Math.round((decimalHours || 0) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

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

  // This week's Mon-Sun range (also reused by the manager compliance view below)
  const weekRange = useMemo(() => {
    const now = new Date();
    const dow = now.getDay(); // 0=Sun..6=Sat
    const monday = new Date(now); monday.setDate(now.getDate() - ((dow + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return { start: monday, end: sunday };
  }, []);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekRange.start); d.setDate(weekRange.start.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [weekRange]);

  // Only active projects can be logged against; empty projectId ('') means Bench (non-billable)
  const activeProjects = useMemo(() => data.projects.filter(p => p.isActive !== false), [data.projects]);
  const projectOptions = useMemo(() => [
    { value: '', label: 'Bench (Non-Billable)' },
    ...activeProjects.map(p => ({ value: p.id, label: p.code ? `${p.code} — ${p.name}` : p.name })),
  ], [activeProjects]);

  // Employee's own timesheet - one punch-based row per day of the current week
  const [myWeekRows, setMyWeekRows] = useState(() => weekDates.map(date => ({
    date, id: null, projectId: '', checkInTime: '', checkOutTime: '', reason: '', workLocation: 'Office', status: 'Draft', dirty: false,
  })));
  const [savingRow, setSavingRow] = useState(null);
  const [submittingWeek, setSubmittingWeek] = useState(false);

  // Re-sync from the real backend entries whenever they load/change, without clobbering unsaved edits
  useEffect(() => {
    setMyWeekRows(prev => weekDates.map((date, i) => {
      const existing = data.timesheets.find(t => t.date === date && t.status !== 'Rejected');
      if (existing) {
        return { date, id: existing.id, projectId: existing.projectId || '', checkInTime: existing.checkInTime || '', checkOutTime: existing.checkOutTime || '', reason: existing.reason || '', workLocation: existing.workLocation || 'Office', status: existing.status, dirty: false };
      }
      return prev[i]?.dirty ? prev[i] : { date, id: null, projectId: '', checkInTime: '', checkOutTime: '', reason: '', workLocation: 'Office', status: 'Draft', dirty: false };
    }));
  }, [data.timesheets, weekDates]);

  const updateRow = (date, field, value) => {
    setMyWeekRows(prev => prev.map(r => r.date === date && (r.status === 'Draft' || r.status === 'Rejected') ? { ...r, [field]: value, dirty: true } : r));
  };

  const grandTotal = myWeekRows.reduce((sum, r) => sum + computeHours(r.checkInTime, r.checkOutTime), 0);

  const handleCopyToWeek = (sourceRow) => {
    setMyWeekRows(prev => prev.map(r => {
      if (r.date === sourceRow.date) return r;
      if (r.status !== 'Draft' && r.status !== 'Rejected') return r;
      return { ...r, projectId: sourceRow.projectId, checkInTime: sourceRow.checkInTime, checkOutTime: sourceRow.checkOutTime, workLocation: sourceRow.workLocation, reason: sourceRow.reason, dirty: true };
    }));
    toast.success(`Copied ${new Date(sourceRow.date).toLocaleDateString('en-GB', { weekday: 'short' })}'s entry to the rest of the week`);
  };

  const handleSaveRow = async (row) => {
    if (!row.checkInTime || !row.checkOutTime) { toast.error('Punch in and punch out are required'); return; }
    setSavingRow(row.date);
    try {
      const payload = { projectId: row.projectId, date: row.date, checkInTime: row.checkInTime, checkOutTime: row.checkOutTime, reason: row.reason, workLocation: row.workLocation };
      if (row.id) await timesheets.update(row.id, payload);
      else await timesheets.create(payload);
      toast.success(`Saved ${new Date(row.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}`);
    } catch (err) {
      toast.error(err.message || 'Failed to save timesheet entry');
    } finally {
      setSavingRow(null);
    }
  };

  const handleSubmitWeek = async () => {
    const readyRows = myWeekRows.filter(r => r.checkInTime && r.checkOutTime);
    if (readyRows.length === 0) { toast.error('Log at least one day before submitting'); return; }
    const ok = await confirm({ title: 'Submit Timesheet?', message: `Submit ${grandTotal.toFixed(1)} hours for this week? Your manager will be notified for approval.`, type: 'info', confirmText: 'Submit' });
    if (!ok) return;
    setSubmittingWeek(true);
    try {
      // Save any unsaved rows first so they exist as entries the backend can submit
      for (const row of readyRows.filter(r => r.dirty || !r.id)) {
        const payload = { projectId: row.projectId, date: row.date, checkInTime: row.checkInTime, checkOutTime: row.checkOutTime, reason: row.reason, workLocation: row.workLocation };
        if (row.id) await timesheets.update(row.id, payload);
        else await timesheets.create(payload);
      }
      const draftIds = data.timesheets.filter(t => t.status === 'Draft' && weekDates.includes(t.date)).map(t => t.id);
      if (draftIds.length > 0) await timesheets.submit(draftIds);
      toast.success('Timesheet submitted for manager approval');
    } catch (err) {
      toast.error(err.message || 'Failed to submit timesheet');
    } finally {
      setSubmittingWeek(false);
    }
  };

  // Team timesheets (for managers)
  const teamTimesheets = useMemo(() => {
    if (isEmployee) return [];
    return data.timesheets;
  }, [data.timesheets, isEmployee]);

  const teamRoster = useMemo(() => {
    if (isEmployee) return [];
    return data.employees.filter(e => e.manager === user?.name);
  }, [data.employees, isEmployee, user]);

  const weeklyCompliance = useMemo(() => {
    if (teamRoster.length === 0) return { raised: [], notRaised: [] };
    const raisedIds = new Set(
      teamTimesheets
        .filter(t => t.status !== 'Draft' && t.weekStart)
        .filter(t => { const d = new Date(t.weekStart); return d >= weekRange.start && d <= weekRange.end; })
        .map(t => t.empId)
    );
    const raised = teamRoster.filter(e => raisedIds.has(e.id));
    const notRaised = teamRoster.filter(e => !raisedIds.has(e.id));
    return { raised, notRaised };
  }, [teamRoster, teamTimesheets, weekRange]);

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
    { key: 'total', label: 'Hours', render: (v) => <span className="font-semibold text-primary">{formatHoursHM(v)}</span> },
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
  const weekAllSubmittedOrApproved = myWeekRows.every(r => !r.checkInTime || r.status === 'Submitted' || r.status === 'Approved');

  const tabs = [];

  // Employee always sees their timesheet
  if (isEmployee || user?.role === 'manager') {
    tabs.push({ id: 'my', label: 'My Timesheet', content: (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text font-medium">
                {weekRange.start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {weekRange.end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">Total this week: <span className="text-text font-semibold">{formatHoursHM(grandTotal)}</span></p>
          </div>
          <Button icon={Send} size="sm" onClick={handleSubmitWeek} disabled={submittingWeek || weekAllSubmittedOrApproved}>
            {submittingWeek ? 'Submitting...' : 'Submit Week for Approval'}
          </Button>
        </div>

        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left py-3 px-3 text-xs font-semibold text-text-secondary">Day</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-text-secondary">Project</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-text-secondary">Punch In</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-text-secondary">Punch Out</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-text-secondary">Location</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-text-secondary">Reason</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-text-secondary">Hours</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-text-secondary">Status</th>
                <th className="py-3 px-3"></th>
              </tr></thead>
              <tbody>
                {myWeekRows.map((row, i) => {
                  const editable = row.status === 'Draft' || row.status === 'Rejected';
                  const hrs = computeHours(row.checkInTime, row.checkOutTime);
                  const billable = !!row.projectId;
                  return (
                    <tr key={row.date} className="border-b border-border/50">
                      <td className="py-2 px-3"><p className="font-medium text-text">{days[i]}</p><p className="text-[10px] text-text-secondary">{row.date}</p></td>
                      <td className="py-2 px-3">
                        <Select value={row.projectId} disabled={!editable} onChange={e => updateRow(row.date, 'projectId', e.target.value)}
                          options={projectOptions} className="w-48" />
                        <Badge variant={billable ? 'success' : 'default'} className="mt-1">{billable ? 'Billable' : 'Non-Billable'}</Badge>
                      </td>
                      <td className="py-2 px-3"><input type="time" value={row.checkInTime} disabled={!editable} onChange={e => updateRow(row.date, 'checkInTime', e.target.value)} className="bg-surface-3 border border-border rounded-lg px-2 py-1.5 text-sm text-text disabled:opacity-50" /></td>
                      <td className="py-2 px-3"><input type="time" value={row.checkOutTime} disabled={!editable} onChange={e => updateRow(row.date, 'checkOutTime', e.target.value)} className="bg-surface-3 border border-border rounded-lg px-2 py-1.5 text-sm text-text disabled:opacity-50" /></td>
                      <td className="py-2 px-3">
                        <Select value={row.workLocation} disabled={!editable} onChange={e => updateRow(row.date, 'workLocation', e.target.value)}
                          options={WORK_LOCATIONS.map(l => ({ value: l, label: l }))} className="w-32" />
                      </td>
                      <td className="py-2 px-3"><Input value={row.reason} disabled={!editable} onChange={e => updateRow(row.date, 'reason', e.target.value)} placeholder="Optional" className="w-36" /></td>
                      <td className="py-2 px-3 text-center font-semibold text-text">{formatHoursHM(hrs)}</td>
                      <td className="py-2 px-3 text-center"><Badge variant={statusColors[row.status]}>{row.status}</Badge></td>
                      <td className="py-2 px-3">
                        {editable && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" icon={Save} onClick={() => handleSaveRow(row)} disabled={savingRow === row.date}>{savingRow === row.date ? '...' : 'Save'}</Button>
                            {row.checkInTime && row.checkOutTime && (
                              <Button size="sm" variant="secondary" onClick={() => handleCopyToWeek(row)} title="Copy this entry to the rest of the week">Copy to Week</Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

        {teamRoster.length > 0 && (
          <Card title="This Week's Submission Status" subtitle={`${weekRange.start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${weekRange.end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-success uppercase mb-2">Raised ({weeklyCompliance.raised.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {weeklyCompliance.raised.length === 0 && <span className="text-xs text-text-secondary">No one yet</span>}
                  {weeklyCompliance.raised.map(e => <span key={e.id} className="px-2.5 py-1 bg-success/10 text-success text-xs rounded-full font-medium">{e.name}</span>)}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-danger uppercase mb-2">Not Raised ({weeklyCompliance.notRaised.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {weeklyCompliance.notRaised.length === 0 && <span className="text-xs text-text-secondary">Everyone's submitted</span>}
                  {weeklyCompliance.notRaised.map(e => <span key={e.id} className="px-2.5 py-1 bg-danger/10 text-danger text-xs rounded-full font-medium">{e.name}</span>)}
                </div>
              </div>
            </div>
          </Card>
        )}

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
