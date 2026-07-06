import { useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Select, Textarea } from '../../components/ui/Input';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Tabs from '../../components/ui/Tabs';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import {
  getPolicies, createPolicy, updatePolicy, disablePolicy,
  recordPolicyView, acceptPolicy, getAcknowledgementStatus, getPolicyAcknowledgements,
} from '../../api/policies';
import { FileText, Plus, ShieldCheck, Eye, CheckCircle2, Pencil, Ban, ClipboardList } from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'LEAVE', label: 'Leave' },
  { value: 'ATTENDANCE', label: 'Attendance' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'WFH', label: 'Work From Home' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'NDA', label: 'NDA' },
  { value: 'CODE_OF_CONDUCT', label: 'Code of Conduct' },
  { value: 'IT', label: 'IT' },
  { value: 'POSH', label: 'POSH' },
  { value: 'OTHER', label: 'Other' },
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORY_OPTIONS.map(c => [c.value, c.label]));

const STATUS_BADGE = {
  NOT_VIEWED: { variant: 'default', label: 'Not Viewed' },
  VIEWED: { variant: 'warning', label: 'Viewed' },
  ACCEPTED: { variant: 'success', label: 'Accepted' },
};

export default function PoliciesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = ['ceo', 'hr_manager', 'admin'].includes(user?.role);

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null); // policy being created/edited, or {} for new
  const [reportPolicy, setReportPolicy] = useState(null); // policy whose acknowledgement report is open

  const load = async () => {
    setLoading(true);
    try {
      const result = await getPolicies(canManage);
      setPolicies(result || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [canManage]);

  const filtered = useMemo(
    () => categoryFilter === 'ALL' ? policies : policies.filter(p => p.category === categoryFilter),
    [policies, categoryFilter]
  );

  const tabs = [
    { id: 'ALL', label: 'All Policies' },
    ...CATEGORY_OPTIONS.filter(c => policies.some(p => p.category === c.value)).map(c => ({ id: c.value, label: c.label })),
  ];

  const handleDisable = async (policy) => {
    try {
      await disablePolicy(policy.id);
      toast.success('Policy disabled');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to disable policy');
    }
  };

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Policies' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Company Policies</h1>
          <p className="text-sm text-text-secondary">Read and acknowledge company policies. HR/CEO can publish and track compliance here.</p>
        </div>
        {canManage && <Button icon={Plus} onClick={() => setEditing({})}>New Policy</Button>}
      </div>

      <Tabs tabs={tabs} active={categoryFilter} onChange={setCategoryFilter} />

      {loading ? (
        <Card><p className="text-sm text-text-secondary">Loading policies...</p></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState title="No policies found" description="No policies have been published in this category yet." /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(policy => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              canManage={canManage}
              onOpen={() => setSelected(policy)}
              onEdit={() => setEditing(policy)}
              onDisable={() => handleDisable(policy)}
              onViewReport={() => setReportPolicy(policy)}
            />
          ))}
        </div>
      )}

      {selected && (
        <PolicyDetailModal
          policy={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {editing && (
        <PolicyFormModal
          policy={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {reportPolicy && (
        <AcknowledgementReportModal
          policy={reportPolicy}
          onClose={() => setReportPolicy(null)}
        />
      )}
    </div>
  );
}

function PolicyCard({ policy, canManage, onOpen, onEdit, onDisable, onViewReport }) {
  return (
    <Card hoverable className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text leading-tight">{policy.title}</p>
            <p className="text-[11px] text-text-secondary">{CATEGORY_LABEL[policy.category] || policy.category} · v{policy.version}</p>
          </div>
        </div>
        {!policy.active && <Badge variant="default">Disabled</Badge>}
      </div>

      {policy.effectiveDate && (
        <p className="text-[11px] text-text-secondary">Effective {policy.effectiveDate}</p>
      )}

      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
        <Button size="sm" variant="secondary" icon={Eye} onClick={onOpen} className="flex-1">Open</Button>
        {canManage && (
          <>
            <Button size="sm" variant="ghost" icon={ClipboardList} onClick={onViewReport} title="Acknowledgement Report" />
            <Button size="sm" variant="ghost" icon={Pencil} onClick={onEdit} title="Edit" />
            {policy.active && <Button size="sm" variant="ghost" icon={Ban} onClick={onDisable} title="Disable" />}
          </>
        )}
      </div>
    </Card>
  );
}

function PolicyDetailModal({ policy, onClose }) {
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [signature, setSignature] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Opening the modal counts as the View step - fires automatically once.
        await recordPolicyView(policy.id);
        const s = await getAcknowledgementStatus(policy.id);
        if (!cancelled) setStatus(s);
      } catch (err) {
        if (!cancelled) toast.error(err.message || 'Failed to load acknowledgement status');
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    })();
    return () => { cancelled = true; };
  }, [policy.id]);

  const handleAccept = async () => {
    if (!signature.trim()) return;
    setAccepting(true);
    try {
      const result = await acceptPolicy(policy.id, signature.trim());
      setStatus(result);
      toast.success('Policy accepted');
    } catch (err) {
      toast.error(err.message || 'Failed to accept policy');
    } finally {
      setAccepting(false);
    }
  };

  const badge = status ? STATUS_BADGE[status.status] : null;

  return (
    <Modal open onClose={onClose} title={policy.title} size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="info">{CATEGORY_LABEL[policy.category] || policy.category}</Badge>
          <Badge variant="default">Version {policy.version}</Badge>
          {policy.effectiveDate && <Badge variant="default">Effective {policy.effectiveDate}</Badge>}
          {badge && <Badge variant={badge.variant} dot>{badge.label}</Badge>}
        </div>

        <div className="prose prose-sm max-w-none text-text bg-surface-3 rounded-xl p-4 max-h-[40vh] overflow-y-auto"
             dangerouslySetInnerHTML={{ __html: policy.content || '<p class="text-text-secondary">No content provided.</p>' }} />

        {policy.requiresAcknowledgement && !loadingStatus && (
          <div className="border-t border-border pt-4">
            {status?.status === 'ACCEPTED' ? (
              <div className="flex items-center gap-2 text-success text-sm">
                <CheckCircle2 size={16} />
                <span>Accepted on {status.acceptedAt ? new Date(status.acceptedAt).toLocaleString() : ''}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-text-secondary">Type your full name below to digitally sign and accept this policy.</p>
                <div className="flex items-end gap-2">
                  <Input className="flex-1" label="Digital Signature" placeholder="Type your full name" value={signature} onChange={e => setSignature(e.target.value)} />
                  <Button icon={ShieldCheck} disabled={!signature.trim() || accepting} onClick={handleAccept}>
                    {accepting ? 'Accepting...' : 'Accept'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function PolicyFormModal({ policy, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !policy.id;
  const [form, setForm] = useState({
    title: policy.title || '',
    category: policy.category || 'OTHER',
    content: policy.content || '',
    version: policy.version || '1.0',
    effectiveDate: policy.effectiveDate || '',
    active: policy.active ?? true,
    requiresAcknowledgement: policy.requiresAcknowledgement ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, effectiveDate: form.effectiveDate || null };
      if (isNew) await createPolicy(payload);
      else await updatePolicy(policy.id, payload);
      toast.success(isNew ? 'Policy created' : 'Policy updated');
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={isNew ? 'New Policy' : `Edit ${policy.title}`} size="lg">
      <div className="space-y-4">
        <Input label="Title" value={form.title} onChange={set('title')} placeholder="e.g. Leave Policy" />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Category" value={form.category} onChange={set('category')} options={CATEGORY_OPTIONS} />
          <Input label="Version" value={form.version} onChange={set('version')} placeholder="1.0" />
        </div>
        <Input type="date" label="Effective Date" value={form.effectiveDate || ''} onChange={set('effectiveDate')} />
        <Textarea label="Content (HTML supported)" rows={8} value={form.content} onChange={set('content')} placeholder="<p>Policy content...</p>" />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" className="rounded accent-primary" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" className="rounded accent-primary" checked={form.requiresAcknowledgement} onChange={e => setForm(f => ({ ...f, requiresAcknowledgement: e.target.checked }))} />
            Requires Acknowledgement
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Policy'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function AcknowledgementReportModal({ policy, onClose }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getPolicyAcknowledgements(policy.id);
        if (!cancelled) setRows(result || []);
      } catch (err) {
        if (!cancelled) toast.error(err.message || 'Failed to load acknowledgement report');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [policy.id]);

  const columns = [
    { key: 'employeeName', label: 'Employee' },
    { key: 'employeeCode', label: 'Employee ID' },
    { key: 'department', label: 'Department' },
    { key: 'status', label: 'Status', render: (v) => {
      const b = STATUS_BADGE[v] || STATUS_BADGE.NOT_VIEWED;
      return <Badge variant={b.variant} dot>{b.label}</Badge>;
    } },
    { key: 'acceptedAt', label: 'Accepted On', render: (v) => v ? new Date(v).toLocaleString() : '-' },
  ];

  return (
    <Modal open onClose={onClose} title={`Acknowledgement Report - ${policy.title}`} size="xl">
      {loading ? (
        <p className="text-sm text-text-secondary">Loading...</p>
      ) : (
        <DataTable columns={columns} data={rows.map(r => ({ ...r, id: r.employeeId }))} pageSize={15} />
      )}
    </Modal>
  );
}
