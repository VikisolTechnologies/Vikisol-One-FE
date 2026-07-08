import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Select } from '../../components/ui/Input';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SearchFilter from '../../components/ui/SearchFilter';
import StatCard from '../../components/ui/StatCard';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { getBackgroundChecks, updateBackgroundCheck, addBackgroundCheckRemarks, attachBackgroundCheckDocument } from '../../api/bgv';
import { uploadDocument } from '../../api/documents';
import { downloadFile } from '../../api/client';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Clock, Loader2, FileWarning, XCircle, CheckCircle2, Users, Upload, Download } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

// Only CEO/HR Manager (and Admin, the platform superuser role) may mark a check Cleared (Approved)
// or Failed (Rejected) - recruiters can move things along up to In Review but the final compliance
// call stays HR/CEO-only, matching the backend @PreAuthorize on the update endpoint.
const FINAL_STATUSES = ['APPROVED', 'REJECTED'];

const STATUS_COLOR = { PENDING: 'default', SUBMITTED: 'info', IN_REVIEW: 'warning', APPROVED: 'success', REJECTED: 'danger' };
const CHECK_LABELS = { IDENTITY: 'Identity Verification', EDUCATION: 'Education Verification', EMPLOYMENT: 'Employment Verification', ADDRESS: 'Address Verification', REFERENCE: 'Reference Check', POLICE: 'Police Verification', DRUG_TEST: 'Drug Test', VISA: 'Visa Verification' };

export default function BackgroundVerificationPage() {
  const { data, employeesLoading } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const canFinalize = ['ceo', 'hr_manager', 'admin'].includes(user?.role);
  // Recruiter can comment and upload evidence but never change status (approve/reject or move
  // stage) - matches the backend's split between PUT .../remarks (Recruiter-permitted) and
  // PUT .../{checkId} (CEO/HR/Admin-only). Previously the UI let a Recruiter try to move a check
  // to "In Review" via the same restricted endpoint everyone else used, which the backend has
  // always rejected outright (403) - that affordance never actually worked.
  const isRecruiter = user?.role === 'recruiter';
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [bgvStatusFilter, setBgvStatusFilter] = useState(null);
  const [selected, setSelected] = useState(null);
  const [checks, setChecks] = useState(null);
  const [loadingChecks, setLoadingChecks] = useState(false);
  // Per-employee overall BGV status. Previously only populated lazily when a row was opened, which
  // meant the KPI cards above (and any status-based filter) were meaningless for the ~always-large
  // majority of employees nobody had clicked into yet - real bug, this is why "Docs Pending" always
  // looked huge and the cards weren't wired to filter anything. Fetch every visible employee's
  // status up front instead.
  const [statusByEmployee, setStatusByEmployee] = useState({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(data.employees.map(e =>
      getBackgroundChecks(e.id).then(result => [e.id, overallStatus(result)]).catch(() => [e.id, null])
    )).then(pairs => {
      if (cancelled) return;
      setStatusByEmployee(prev => {
        const next = { ...prev };
        pairs.forEach(([id, status]) => { if (status) next[id] = status; });
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [data.employees]);

  const overallStatus = (empChecks) => {
    if (!empChecks || empChecks.length === 0) return 'PENDING';
    if (empChecks.some(c => c.status === 'REJECTED')) return 'REJECTED';
    if (empChecks.every(c => c.status === 'APPROVED')) return 'APPROVED';
    if (empChecks.some(c => c.status === 'IN_REVIEW' || c.status === 'SUBMITTED')) return 'IN_REVIEW';
    return 'PENDING';
  };

  const filterConfig = [
    { key: 'department', label: 'Department', options: data.departments },
    { key: 'location', label: 'Location', options: ['Hyderabad', 'Bangalore', 'Pune', 'Noida', 'Chennai', 'Mumbai', 'Remote'] },
  ];

  const filtered = useMemo(() => data.employees.filter(e => {
    const s = search.toLowerCase();
    const matchesSearch = !s || e.name.toLowerCase().includes(s) || e.empId.toLowerCase().includes(s) || e.department.toLowerCase().includes(s);
    const matchesDept = !filters.department || e.department === filters.department;
    const matchesLoc = !filters.location || e.location === filters.location;
    const empStatus = statusByEmployee[e.id];
    const matchesBgvStatus = !bgvStatusFilter || (bgvStatusFilter === 'DOCS_PENDING' ? !empStatus : empStatus === bgvStatusFilter);
    return matchesSearch && matchesDept && matchesLoc && matchesBgvStatus;
  }), [data.employees, search, filters, bgvStatusFilter, statusByEmployee]);

  const openEmployee = async (row) => {
    setSelected(row);
    setLoadingChecks(true);
    try {
      const result = await getBackgroundChecks(row.id);
      setChecks(result);
      setStatusByEmployee(prev => ({ ...prev, [row.id]: overallStatus(result) }));
    } catch (err) {
      toast.error(err.message || 'Failed to load background verification');
      setChecks([]);
    } finally {
      setLoadingChecks(false);
    }
  };

  // Deep-link from HR Task Center's "BGV Pending" list - previously navigated here with no
  // indication of which employee was clicked, so this always showed the full unfiltered list
  // instead of the specific candidate. Auto-open the matching employee's BGV modal once the
  // employee list has loaded.
  useEffect(() => {
    const employeeId = searchParams.get('employeeId');
    if (!employeeId || !data.employees.length || selected) return;
    const match = data.employees.find(e => e.id === employeeId);
    if (match) openEmployee(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, data.employees]);

  const saveCheck = async (check, patch) => {
    if (FINAL_STATUSES.includes(patch.status) && !canFinalize) {
      toast.error('Only CEO or HR Manager can mark a check as Cleared or Failed');
      return;
    }
    try {
      // Recruiter can never reach saveCheck with a status change (their row only offers a
      // remarks-only save - see CheckRow), but this guard keeps the split real from the API side too.
      const updated = isRecruiter
        ? await addBackgroundCheckRemarks(selected.id, check.id, patch.remarks ?? check.remarks)
        : await updateBackgroundCheck(selected.id, check.id, { status: patch.status ?? check.status, remarks: patch.remarks ?? check.remarks });
      setChecks(prev => {
        const next = prev.map(c => c.id === check.id ? updated : c);
        setStatusByEmployee(p => ({ ...p, [selected.id]: overallStatus(next) }));
        return next;
      });
      toast.success(`${CHECK_LABELS[check.checkType]} updated`);
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const uploadCheckDocument = async (check, file) => {
    try {
      const doc = await uploadDocument({ employeeId: selected.id, title: `${CHECK_LABELS[check.checkType]} - ${selected.name}`, category: 'Legal', file });
      const updated = await attachBackgroundCheckDocument(selected.id, check.id, doc.id);
      setChecks(prev => prev.map(c => c.id === check.id ? updated : c));
      toast.success('Document attached');
    } catch (err) {
      toast.error(err.message || 'Failed to attach document');
    }
  };

  // Counts always reflect the search/department/location filters, but never the BGV-status card
  // filter itself - otherwise clicking "Cleared" would make every other card's count collapse
  // toward zero, which reads as broken. Matches how Resource Allocation's KPI row behaves.
  const baseFiltered = useMemo(() => data.employees.filter(e => {
    const s = search.toLowerCase();
    const matchesSearch = !s || e.name.toLowerCase().includes(s) || e.empId.toLowerCase().includes(s) || e.department.toLowerCase().includes(s);
    const matchesDept = !filters.department || e.department === filters.department;
    const matchesLoc = !filters.location || e.location === filters.location;
    return matchesSearch && matchesDept && matchesLoc;
  }), [data.employees, search, filters]);

  const dashboardCounts = useMemo(() => {
    const counts = { PENDING: 0, IN_REVIEW: 0, DOCS_PENDING: 0, REJECTED: 0, APPROVED: 0 };
    baseFiltered.forEach(e => {
      const st = statusByEmployee[e.id];
      if (!st) { counts.DOCS_PENDING++; return; }
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [baseFiltered, statusByEmployee]);

  const columns = [
    { key: 'name', label: 'Employee', render: (v, row) => <div><p className="font-medium text-text text-sm">{v}</p><p className="text-[10px] text-text-secondary">{row.empId}</p></div> },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'location', label: 'Location' },
    { key: 'bgv', label: 'BGV Status', sortable: false, render: (_, row) => {
      const st = statusByEmployee[row.id];
      return st ? <Badge variant={{ PENDING: 'default', IN_REVIEW: 'warning', APPROVED: 'success', REJECTED: 'danger' }[st]} dot>{st.replace('_', ' ')}</Badge> : <span className="text-xs text-text-secondary">Not loaded</span>;
    } },
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Background Verification' }]} />
      <div>
        <h1 className="text-xl font-bold text-text">Background Verification</h1>
        <p className="text-sm text-text-secondary">Track identity, education, employment, and other pre-employment checks per employee.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className={`cursor-pointer rounded-xl transition-all ${bgvStatusFilter === 'PENDING' ? 'ring-2 ring-text-secondary' : ''}`} onClick={() => setBgvStatusFilter(f => f === 'PENDING' ? null : 'PENDING')}>
          <StatCard label="Pending" value={dashboardCounts.PENDING} icon={Clock} color="default" />
        </div>
        <div className={`cursor-pointer rounded-xl transition-all ${bgvStatusFilter === 'IN_REVIEW' ? 'ring-2 ring-warning' : ''}`} onClick={() => setBgvStatusFilter(f => f === 'IN_REVIEW' ? null : 'IN_REVIEW')}>
          <StatCard label="In Progress" value={dashboardCounts.IN_REVIEW} icon={Loader2} color="warning" />
        </div>
        <div className={`cursor-pointer rounded-xl transition-all ${bgvStatusFilter === 'DOCS_PENDING' ? 'ring-2 ring-text-secondary' : ''}`} onClick={() => setBgvStatusFilter(f => f === 'DOCS_PENDING' ? null : 'DOCS_PENDING')}>
          <StatCard label="Docs Pending" value={dashboardCounts.DOCS_PENDING} icon={FileWarning} color="default" />
        </div>
        <div className={`cursor-pointer rounded-xl transition-all ${bgvStatusFilter === 'REJECTED' ? 'ring-2 ring-danger' : ''}`} onClick={() => setBgvStatusFilter(f => f === 'REJECTED' ? null : 'REJECTED')}>
          <StatCard label="Failed" value={dashboardCounts.REJECTED} icon={XCircle} color="danger" />
        </div>
        <div className={`cursor-pointer rounded-xl transition-all ${bgvStatusFilter === 'APPROVED' ? 'ring-2 ring-success' : ''}`} onClick={() => setBgvStatusFilter(f => f === 'APPROVED' ? null : 'APPROVED')}>
          <StatCard label="Cleared" value={dashboardCounts.APPROVED} icon={CheckCircle2} color="success" />
        </div>
      </div>
      {bgvStatusFilter && (
        <button onClick={() => setBgvStatusFilter(null)} className="text-xs text-primary hover:underline">Clear BGV status filter (showing {filtered.length} of {baseFiltered.length})</button>
      )}

      <SearchFilter searchValue={search} onSearch={setSearch} filters={filterConfig} activeFilters={filters} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClearFilters={() => { setSearch(''); setFilters({}); setBgvStatusFilter(null); }} placeholder="Search employee, department..." />

      <Card padding={false}>
        {employeesLoading ? <TableSkeleton rows={8} cols={4} /> : <DataTable columns={columns} data={filtered} pageSize={12} onRowClick={openEmployee} />}
      </Card>

      <Modal open={!!selected} onClose={() => { setSelected(null); setChecks(null); }} title={selected ? `Background Verification - ${selected.name}` : ''} size="lg">
        {loadingChecks && <p className="text-sm text-text-secondary">Loading...</p>}
        {!loadingChecks && checks && (
          <div className="space-y-3">
            {!canFinalize && !isRecruiter && (
              <p className="text-xs text-text-secondary bg-surface-3 rounded-lg p-2">You can update progress up to "In Review". Only CEO or HR Manager can mark a check Cleared or Failed.</p>
            )}
            {isRecruiter && (
              <p className="text-xs text-text-secondary bg-surface-3 rounded-lg p-2">You can add remarks and upload supporting documents. Only CEO or HR Manager can change a check's status.</p>
            )}
            {checks.map(c => (
              <CheckRow key={c.id} check={c} canFinalize={canFinalize} isRecruiter={isRecruiter}
                onSave={patch => saveCheck(c, patch)} onUpload={file => uploadCheckDocument(c, file)} />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function CheckRow({ check, canFinalize, isRecruiter, onSave, onUpload }) {
  const [status, setStatus] = useState(check.status);
  const [remarks, setRemarks] = useState(check.remarks || '');
  const dirty = status !== check.status || remarks !== (check.remarks || '');
  const color = STATUS_COLOR[status] || 'default';
  const options = canFinalize ? STATUS_OPTIONS : STATUS_OPTIONS.filter(o => !FINAL_STATUSES.includes(o.value));
  const fileInputRef = useRef(null);

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <div className="p-3 bg-surface-3 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text">{CHECK_LABELS[check.checkType] || check.checkType}</span>
        <Badge variant={color} dot>{STATUS_OPTIONS.find(o => o.value === status)?.label}</Badge>
      </div>
      <div className="flex items-end gap-2">
        {!isRecruiter && <div className="flex-1"><Select label="Status" value={status} onChange={e => setStatus(e.target.value)} options={options} /></div>}
        <div className="flex-[2]"><Input label="Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional notes" /></div>
        <Button size="sm" onClick={() => onSave({ status: isRecruiter ? check.status : status, remarks })} disabled={!dirty}>Save</Button>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <label className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
          <Upload size={12} /> Upload Document
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleFilePick} />
        </label>
        {check.documentId && (
          <button onClick={() => downloadFile(`/documents/${check.documentId}/download`)} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Download size={12} /> View Document
          </button>
        )}
      </div>
      {check.reviewedByName && <p className="text-[10px] text-text-secondary mt-1.5">Last reviewed by {check.reviewedByName}</p>}
    </div>
  );
}
