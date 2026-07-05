import { useState, useEffect, useMemo, useCallback } from 'react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import Breadcrumb from '../../components/ui/Breadcrumb';
import StatCard from '../../components/ui/StatCard';
import Tabs from '../../components/ui/Tabs';
import Avatar from '../../components/ui/Avatar';
import { TableSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import {
  listOffboardingCases, getOffboardingDashboardStats, getOffboardingCase, getOffboardingForEmployee,
  advanceOffboardingStage, updateOffboardingChecklistItem, downloadExitPackage, emailExitPackage,
} from '../../api/offboarding';
import { UserMinus, Users, Clock, CheckCircle2, ArrowRight, Download, Mail, ChevronLeft } from 'lucide-react';

const STAGES = [
  'RESIGNATION_SUBMITTED', 'MANAGER_REVIEW', 'HR_REVIEW', 'KNOWLEDGE_TRANSFER', 'ASSET_COLLECTION',
  'IT_CLEARANCE', 'FINANCE_CLEARANCE', 'BGV_EXIT_VERIFICATION', 'FINAL_HR_APPROVAL',
  'EXIT_DOCS_GENERATED', 'COMPLETED',
];

const STAGE_LABELS = {
  RESIGNATION_SUBMITTED: 'Resignation Submitted', MANAGER_REVIEW: 'Manager Review', HR_REVIEW: 'HR Review',
  KNOWLEDGE_TRANSFER: 'Knowledge Transfer', ASSET_COLLECTION: 'Asset Collection', IT_CLEARANCE: 'IT Clearance',
  FINANCE_CLEARANCE: 'Finance Clearance', BGV_EXIT_VERIFICATION: 'BGV Exit Verification',
  FINAL_HR_APPROVAL: 'Final HR Approval', EXIT_DOCS_GENERATED: 'Exit Docs Generated', COMPLETED: 'Completed',
};

const EXIT_PACKAGE_STAGES = ['FINAL_HR_APPROVAL', 'EXIT_DOCS_GENERATED', 'COMPLETED'];

const STATUS_VARIANT = { IN_PROGRESS: 'warning', COMPLETED: 'success', CANCELLED: 'danger' };

export default function OffboardingPage() {
  const { data } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const canManageGlobally = ['ceo', 'hr_manager', 'admin'].includes(user?.role);
  const isEmployeeOnly = user?.role === 'employee';

  const myEmployee = useMemo(() => data.employees.find(e => e.email === user?.email) || null, [data.employees, user]);

  const [cases, setCases] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('IN_PROGRESS');
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  const loadList = useCallback(() => {
    setLoading(true);
    Promise.all([
      listOffboardingCases({ status: statusFilter || undefined }),
      canManageGlobally ? getOffboardingDashboardStats() : Promise.resolve(null),
    ])
      .then(([caseList, dashboard]) => {
        setCases(caseList);
        setStats(dashboard);
      })
      .catch(err => toast.error(err.message || 'Failed to load offboarding cases'))
      .finally(() => setLoading(false));
  }, [statusFilter, canManageGlobally, toast]);

  useEffect(() => {
    if (isEmployeeOnly) {
      if (!myEmployee) { setLoading(false); return; }
      setLoading(true);
      getOffboardingForEmployee(myEmployee.id)
        .then(c => setSelectedCaseId(c.id))
        .catch(() => { /* employee has no offboarding case - nothing to show */ })
        .finally(() => setLoading(false));
      return;
    }
    loadList();
  }, [isEmployeeOnly, myEmployee, loadList]);

  if (isEmployeeOnly) {
    return (
      <div className="space-y-5">
        <Breadcrumb items={[{ label: 'Offboarding' }]} />
        <div>
          <h1 className="text-xl font-bold text-text">My Offboarding Status</h1>
          <p className="text-sm text-text-secondary">Track your exit process, checklist, and documents.</p>
        </div>
        {loading && <Card><p className="text-sm text-text-secondary">Loading...</p></Card>}
        {!loading && !selectedCaseId && (
          <Card><EmptyState icon={UserMinus} title="No active offboarding" description="You do not currently have an active offboarding case." /></Card>
        )}
        {!loading && selectedCaseId && (
          <CaseDetail caseId={selectedCaseId} readOnly onBack={null} onChanged={() => {}} canManage={false} />
        )}
      </div>
    );
  }

  if (selectedCaseId) {
    return (
      <div className="space-y-5">
        <Breadcrumb items={[{ label: 'Offboarding', onClick: () => setSelectedCaseId(null) }, { label: 'Case Detail' }]} />
        <Button variant="ghost" size="sm" onClick={() => setSelectedCaseId(null)}><ChevronLeft size={15} /> Back to cases</Button>
        <CaseDetail caseId={selectedCaseId} readOnly={!canManageGlobally} onBack={() => setSelectedCaseId(null)} onChanged={loadList} canManage={canManageGlobally} />
      </div>
    );
  }

  const columns = [
    { key: 'employeeName', label: 'Employee', render: (v, row) => <div><p className="font-medium text-text text-sm">{v}</p><p className="text-[10px] text-text-secondary">{row.employeeCode} · {row.department || '-'}</p></div> },
    { key: 'type', label: 'Type', render: v => <Badge variant="default">{v}</Badge> },
    { key: 'stage', label: 'Stage', render: v => <Badge variant="info" dot>{STAGE_LABELS[v] || v}</Badge> },
    { key: 'status', label: 'Status', render: v => <Badge variant={STATUS_VARIANT[v] || 'default'}>{v.replace('_', ' ')}</Badge> },
    { key: 'daysInStage', label: 'Days in Stage', render: v => `${v} day${v === 1 ? '' : 's'}` },
    { key: 'checklistCompleted', label: 'Checklist', render: (v, row) => `${v}/${row.checklistTotal}` },
    { key: 'lastWorkingDate', label: 'Last Working Day', render: v => v || '-' },
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Offboarding' }]} />
      <div>
        <h1 className="text-xl font-bold text-text">Offboarding</h1>
        <p className="text-sm text-text-secondary">Manage employee exits through resignation, clearance, and final settlement.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Active Cases" value={stats.totalActive} icon={UserMinus} color="warning" />
          <StatCard label="Completed This Month" value={stats.completedThisMonth} icon={CheckCircle2} color="success" />
          <StatCard label="Departments Affected" value={Object.keys(stats.byStage || {}).length} icon={Users} color="default" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="w-48">
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} options={[
            { value: '', label: 'All Statuses' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]} />
        </div>
      </div>

      <Card padding={false}>
        {loading ? <TableSkeleton rows={6} cols={6} /> : (
          (cases || []).length === 0
            ? <EmptyState icon={UserMinus} title="No offboarding cases" description="No employee exits match the current filter." />
            : <DataTable columns={columns} data={cases} pageSize={12} onRowClick={row => setSelectedCaseId(row.id)} />
        )}
      </Card>
    </div>
  );
}

function CaseDetail({ caseId, readOnly, onChanged, canManage }) {
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [comments, setComments] = useState('');

  const load = useCallback(() => {
    getOffboardingCase(caseId).then(setDetail).catch(err => toast.error(err.message || 'Failed to load case'));
  }, [caseId, toast]);

  useEffect(() => { load(); }, [load]);

  if (!detail) return <Card><p className="text-sm text-text-secondary">Loading case...</p></Card>;

  const stageIdx = STAGES.indexOf(detail.stage);
  const eligibleForExitPackage = EXIT_PACKAGE_STAGES.includes(detail.stage);

  const advance = async () => {
    setBusy(true);
    try {
      const updated = await advanceOffboardingStage(caseId, { comments });
      setDetail(updated);
      setComments('');
      toast.success(`Advanced to ${STAGE_LABELS[updated.stage] || updated.stage}`);
      onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Failed to advance stage');
    } finally {
      setBusy(false);
    }
  };

  const toggleChecklist = async (item) => {
    if (readOnly) return;
    try {
      const nextStatus = item.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      const updated = await updateOffboardingChecklistItem(item.id, { status: nextStatus, remarks: item.remarks });
      setDetail(prev => ({ ...prev, checklist: prev.checklist.map(c => c.id === item.id ? updated : c) }));
    } catch (err) {
      toast.error(err.message || 'Failed to update checklist item');
    }
  };

  const download = async () => {
    try {
      await downloadExitPackage(detail.employeeId, detail.employeeCode);
    } catch (err) {
      toast.error(err.message || 'Failed to download exit package');
    }
  };

  const emailPackage = async () => {
    try {
      await emailExitPackage(detail.employeeId);
      toast.success('Exit package emailed to the employee');
    } catch (err) {
      toast.error(err.message || 'Failed to email exit package');
    }
  };

  const categories = ['HR', 'IT', 'FINANCE', 'MANAGER'];

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={detail.employeeName} size="md" />
            <div>
              <h2 className="text-lg font-bold text-text">{detail.employeeName}</h2>
              <p className="text-xs text-text-secondary">{detail.employeeCode} · {detail.department || '-'} · {detail.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[detail.status] || 'default'}>{detail.status.replace('_', ' ')}</Badge>
            {detail.lastWorkingDate && <span className="text-xs text-text-secondary">Last Working Day: {detail.lastWorkingDate}</span>}
          </div>
        </div>
        {detail.reason && <p className="mt-3 text-xs text-text-secondary bg-surface-3 rounded-lg px-3 py-2">"{detail.reason}"</p>}
      </Card>

      {/* Pipeline stepper */}
      <Card>
        <h3 className="text-sm font-semibold text-text mb-4">Exit Pipeline</h3>
        <div className="flex items-center overflow-x-auto pb-2 gap-1">
          {STAGES.map((s, i) => {
            const done = i < stageIdx || detail.status === 'COMPLETED';
            const current = i === stageIdx && detail.status !== 'COMPLETED';
            const skipped = s === 'BGV_EXIT_VERIFICATION' && !detail.bgvRequired;
            return (
              <div key={s} className="flex items-center flex-shrink-0">
                <div className={`flex flex-col items-center w-24 ${skipped ? 'opacity-40' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                    done ? 'bg-success/15 border-success text-success' : current ? 'bg-primary/15 border-primary text-primary' : 'bg-surface-3 border-border text-text-secondary'
                  }`}>{i + 1}</div>
                  <span className="text-[9px] text-center mt-1 text-text-secondary leading-tight">{STAGE_LABELS[s]}{skipped ? ' (skipped)' : ''}</span>
                </div>
                {i < STAGES.length - 1 && <div className={`h-0.5 w-6 flex-shrink-0 ${done ? 'bg-success' : 'bg-border'}`} />}
              </div>
            );
          })}
        </div>

        {detail.stage === 'IT_CLEARANCE' && (
          <p className={`mt-4 text-xs ${detail.itClearanceEligible ? 'text-success' : 'text-text-secondary'}`}>
            {detail.itClearanceEligible
              ? 'All IT checklist items (asset returns + access removal) are complete - ready to advance.'
              : 'Waiting on IT checklist items (asset returns and/or access removal) before this stage can advance.'}
          </p>
        )}

        {canManage && detail.status === 'IN_PROGRESS' && (
          <div className="mt-5 flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-text-secondary block mb-1">Comments (optional)</label>
              <input className="w-full px-3 py-2 rounded-lg bg-surface-3 border border-border text-sm text-text" value={comments} onChange={e => setComments(e.target.value)} placeholder="Notes for this transition" />
            </div>
            <Button onClick={advance} disabled={busy}>
              <ArrowRight size={15} /> Advance to {STAGE_LABELS[STAGES[stageIdx + (STAGES[stageIdx + 1] === 'BGV_EXIT_VERIFICATION' && !detail.bgvRequired ? 2 : 1)]] || 'Next Stage'}
            </Button>
          </div>
        )}

        {eligibleForExitPackage && (
          <div className="mt-4 flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={download}><Download size={15} /> Download Exit Package</Button>
            {canManage && <Button variant="secondary" onClick={emailPackage}><Mail size={15} /> Email Exit Package</Button>}
          </div>
        )}
      </Card>

      <Tabs tabs={[
        {
          id: 'checklist', label: 'Checklist', content: (
            <div className="grid md:grid-cols-2 gap-4">
              {categories.map(cat => {
                const items = detail.checklist.filter(c => c.category === cat);
                if (items.length === 0) return null;
                return (
                  <Card key={cat}>
                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-3">{cat}</h4>
                    <div className="space-y-2">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-3">
                          <div className="min-w-0">
                            <p className="text-sm text-text">{item.label}</p>
                            {item.status === 'COMPLETED' && item.completedByName && (
                              <p className="text-[10px] text-text-secondary">By {item.completedByName}{item.completedAt ? ` · ${new Date(item.completedAt).toLocaleDateString('en-IN')}` : ''}</p>
                            )}
                          </div>
                          <button disabled={readOnly} onClick={() => toggleChecklist(item)}
                            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 border ${
                              item.status === 'COMPLETED' ? 'bg-success/10 text-success border-success/30' : 'bg-surface-2 text-text-secondary border-border'
                            } ${readOnly ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}`}>
                            {item.status === 'COMPLETED' ? 'Completed' : 'Pending'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        },
        {
          id: 'history', label: 'History', content: (
            <Card>
              {detail.history.length === 0 ? <p className="text-xs text-text-secondary">No history yet.</p> : (
                <div className="space-y-3">
                  {detail.history.map(h => (
                    <div key={h.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                      <Clock size={14} className="text-text-secondary mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm text-text">
                          {h.fromStage ? `${STAGE_LABELS[h.fromStage]} → ${STAGE_LABELS[h.toStage]}` : `Set to ${STAGE_LABELS[h.toStage]}`}
                        </p>
                        <p className="text-[10px] text-text-secondary">{h.changedByName || 'System'} · {new Date(h.changedAt).toLocaleString('en-IN')}</p>
                        {h.comments && <p className="text-xs text-text-secondary mt-1 bg-surface-3 rounded-lg px-2 py-1 inline-block">{h.comments}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        },
      ]} />
    </div>
  );
}
