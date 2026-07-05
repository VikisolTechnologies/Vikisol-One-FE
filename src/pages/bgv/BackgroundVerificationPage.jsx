import { useState, useMemo } from 'react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Select } from '../../components/ui/Input';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SearchFilter from '../../components/ui/SearchFilter';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import { getBackgroundChecks, updateBackgroundCheck } from '../../api/bgv';
import { TableSkeleton } from '../../components/ui/Skeleton';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const STATUS_COLOR = { PENDING: 'default', SUBMITTED: 'info', IN_REVIEW: 'warning', APPROVED: 'success', REJECTED: 'danger' };
const CHECK_LABELS = { IDENTITY: 'Identity Verification', EDUCATION: 'Education Verification', EMPLOYMENT: 'Employment Verification', ADDRESS: 'Address Verification', REFERENCE: 'Reference Check', POLICE: 'Police Verification', DRUG_TEST: 'Drug Test', VISA: 'Visa Verification' };

export default function BackgroundVerificationPage() {
  const { data, employeesLoading } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [checks, setChecks] = useState(null);
  const [loadingChecks, setLoadingChecks] = useState(false);

  const filtered = useMemo(() => data.employees.filter(e => {
    const s = search.toLowerCase();
    return !s || e.name.toLowerCase().includes(s) || e.empId.toLowerCase().includes(s) || e.department.toLowerCase().includes(s);
  }), [data.employees, search]);

  const openEmployee = async (row) => {
    setSelected(row);
    setLoadingChecks(true);
    try {
      const result = await getBackgroundChecks(row.id);
      setChecks(result);
    } catch (err) {
      toast.error(err.message || 'Failed to load background verification');
      setChecks([]);
    } finally {
      setLoadingChecks(false);
    }
  };

  const saveCheck = async (check, patch) => {
    try {
      const updated = await updateBackgroundCheck(selected.id, check.id, { status: patch.status ?? check.status, remarks: patch.remarks ?? check.remarks });
      setChecks(prev => prev.map(c => c.id === check.id ? updated : c));
      toast.success(`${CHECK_LABELS[check.checkType]} updated`);
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const columns = [
    { key: 'name', label: 'Employee', render: (v, row) => <div><p className="font-medium text-text text-sm">{v}</p><p className="text-[10px] text-text-secondary">{row.empId} · {row.department}</p></div> },
    { key: 'designation', label: 'Designation' },
    { key: 'status', label: 'Employment Status', render: (v) => <Badge dot>{v}</Badge> },
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Background Verification' }]} />
      <div>
        <h1 className="text-xl font-bold text-text">Background Verification</h1>
        <p className="text-sm text-text-secondary">Track identity, education, employment, and other pre-employment checks per employee.</p>
      </div>

      <SearchFilter searchValue={search} onSearch={setSearch} filters={[]} activeFilters={{}} onFilterChange={() => {}} onClearFilters={() => setSearch('')} placeholder="Search employee, department..." />

      <Card padding={false}>
        {employeesLoading ? <TableSkeleton rows={8} cols={3} /> : <DataTable columns={columns} data={filtered} pageSize={12} onRowClick={openEmployee} />}
      </Card>

      <Modal open={!!selected} onClose={() => { setSelected(null); setChecks(null); }} title={selected ? `Background Verification - ${selected.name}` : ''} size="lg">
        {loadingChecks && <p className="text-sm text-text-secondary">Loading...</p>}
        {!loadingChecks && checks && (
          <div className="space-y-3">
            {checks.map(c => (
              <CheckRow key={c.id} check={c} onSave={patch => saveCheck(c, patch)} />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function CheckRow({ check, onSave }) {
  const [status, setStatus] = useState(check.status);
  const [remarks, setRemarks] = useState(check.remarks || '');
  const dirty = status !== check.status || remarks !== (check.remarks || '');
  const color = STATUS_COLOR[status] || 'default';

  return (
    <div className="p-3 bg-surface-3 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text">{CHECK_LABELS[check.checkType] || check.checkType}</span>
        <Badge variant={color} dot>{STATUS_OPTIONS.find(o => o.value === status)?.label}</Badge>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1"><Select label="Status" value={status} onChange={e => setStatus(e.target.value)} options={STATUS_OPTIONS} /></div>
        <div className="flex-[2]"><Input label="Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional notes" /></div>
        <Button size="sm" onClick={() => onSave({ status, remarks })} disabled={!dirty}>Save</Button>
      </div>
      {check.reviewedByName && <p className="text-[10px] text-text-secondary mt-1.5">Last reviewed by {check.reviewedByName}</p>}
    </div>
  );
}
