import { useState, useMemo, useEffect } from 'react';
import { Plus, Filter, Eye, Edit3, Trash2, Mail, Calendar, MoreVertical, UserCheck, XCircle, FileText, Send } from 'lucide-react';
import { previewCtcBreakup } from '../../api/payroll';
import { getManagerOptions } from '../../api/employees';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Select, Textarea } from '../../components/ui/Input';
import ProgressBar from '../../components/ui/ProgressBar';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SearchFilter from '../../components/ui/SearchFilter';
import Tabs from '../../components/ui/Tabs';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';

const stages = ['Applied', 'Screening', 'Technical', 'Manager', 'HR', 'Offered', 'Hired', 'Rejected'];

export default function RecruitmentPage() {
  const { data, candidates, candidatesSource, candidatesLoading, lookups } = useData();
  const toast = useToast();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [view, setView] = useState('kanban');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: '', experience: '', currentCTC: '', expectedCTC: '', source: 'LinkedIn', phone: '' });
  const [offerCandidate, setOfferCandidate] = useState(null);
  const [offerForm, setOfferForm] = useState({ designationId: '', departmentId: '', offeredCtc: '', dateOfJoining: '', reportingManagerId: '' });
  const [offerBreakup, setOfferBreakup] = useState(null);
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [managerOptions, setManagerOptions] = useState([]);

  useEffect(() => {
    getManagerOptions().then(setManagerOptions).catch(() => setManagerOptions([]));
  }, []);

  useEffect(() => {
    if (!offerForm.offeredCtc || Number(offerForm.offeredCtc) <= 0) { setOfferBreakup(null); return; }
    const t = setTimeout(() => {
      previewCtcBreakup(Number(offerForm.offeredCtc)).then(setOfferBreakup).catch(() => setOfferBreakup(null));
    }, 300);
    return () => clearTimeout(t);
  }, [offerForm.offeredCtc]);

  const openOfferModal = (candidate) => {
    setOfferForm({
      designationId: candidate.offeredDesignationId || '',
      departmentId: candidate.offeredDepartmentId || '',
      offeredCtc: candidate.offeredCtc || candidate.expectedSalary || '',
      dateOfJoining: candidate.offeredDateOfJoining || '',
      reportingManagerId: candidate.offeredReportingManagerId || '',
    });
    setOfferBreakup(null);
    setOfferCandidate(candidate);
  };

  const handleProposeSelection = async () => {
    if (candidatesSource !== 'live') { toast.error('Connect to the live backend to submit offer proposals'); return; }
    if (!offerForm.designationId || !offerForm.departmentId || !offerForm.offeredCtc || !offerForm.dateOfJoining) {
      toast.error('Designation, department, CTC and date of joining are required');
      return;
    }
    setOfferSubmitting(true);
    try {
      await candidates.proposeSelection(offerCandidate.id, offerForm);
      toast.success(`${offerCandidate.name}'s offer proposal submitted for manager approval`);
      setOfferCandidate(null);
      setSelected(null);
    } catch (err) {
      toast.error(err.message || 'Failed to submit offer proposal');
    } finally {
      setOfferSubmitting(false);
    }
  };

  const allCandidates = data.candidates;
  const filtered = useMemo(() => {
    return allCandidates.filter(c => {
      const s = search.toLowerCase();
      const matchSearch = !s || c.name.toLowerCase().includes(s) || c.role.toLowerCase().includes(s) || c.email.toLowerCase().includes(s);
      const matchStage = !filters.stage || filters.stage === 'All' || c.stage === filters.stage;
      const matchRole = !filters.role || filters.role === 'All' || c.role === filters.role;
      return matchSearch && matchStage && matchRole;
    });
  }, [allCandidates, search, filters]);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.role) { toast.error('Name, email and role are required'); return; }
    try {
      await candidates.create({ ...form, stage: 'Applied', score: Math.floor(Math.random() * 40 + 60), appliedDate: new Date().toISOString().split('T')[0], skills: [], status: 'Active', location: 'Hyderabad', noticePeriod: '30 days', currentCompany: '-', interviewer: '-', feedback: null, resume: 'resume.pdf' });
      toast.success(`Candidate ${form.name} added successfully`);
      setShowAdd(false);
      setForm({ name: '', email: '', role: '', experience: '', currentCTC: '', expectedCTC: '', source: 'LinkedIn', phone: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to add candidate');
    }
  };

  const moveStage = async (candidate, newStage) => {
    try {
      await candidates.update(candidate.id, { stage: newStage });
      toast.success(`${candidate.name} moved to ${newStage}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update candidate stage');
    }
  };

  const handleReject = async (candidate) => {
    const ok = await confirm({ title: 'Reject Candidate?', message: `Reject ${candidate.name}?`, type: 'danger', confirmText: 'Reject' });
    if (!ok) return;
    try {
      await candidates.update(candidate.id, { stage: 'Rejected', status: 'Rejected' });
      toast.warning(`${candidate.name} has been rejected`);
    } catch (err) {
      toast.error(err.message || 'Failed to reject candidate');
    }
  };

  const handleDelete = async (candidate) => {
    const ok = await confirm({ title: 'Delete Candidate?', message: `Delete ${candidate.name} from the pipeline?`, type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await candidates.remove(candidate.id);
      toast.success('Candidate deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete candidate');
    }
  };

  const handleScheduleInterview = (candidate) => {
    toast.success(`Interview scheduled for ${candidate.name}`);
  };

  const stageData = stages.slice(0, 6).map(s => ({ stage: s, count: allCandidates.filter(c => c.stage === s).length }));
  const roles = [...new Set(allCandidates.map(c => c.role))];

  const columns = [
    { key: 'name', label: 'Candidate', render: (_, row) => <div className="flex items-center gap-2"><Avatar name={row.name} size="sm" /><div><p className="font-medium text-text text-sm">{row.name}</p><p className="text-xs text-text-secondary">{row.email}</p></div></div> },
    { key: 'role', label: 'Role' },
    { key: 'experience', label: 'Experience' },
    { key: 'stage', label: 'Stage', render: (v) => <Badge>{v}</Badge> },
    { key: 'score', label: 'Score', render: (v) => <div className="flex items-center gap-2"><ProgressBar value={v} max={100} size="sm" color={v >= 80 ? 'success' : v >= 60 ? 'warning' : 'danger'} /><span className="text-xs font-semibold">{v}%</span></div> },
    { key: 'source', label: 'Source' },
    { key: 'actions', label: '', sortable: false, render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); setSelected(row); }} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary"><Eye size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); handleScheduleInterview(row); }} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary" title="Schedule Interview"><Calendar size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); handleDelete(row); }} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Recruitment' }]} />
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-text">Recruitment Pipeline</h1><p className="text-sm text-text-secondary">{allCandidates.length} candidates</p></div>
        <div className="flex gap-2">
          <div className="flex bg-surface-3 rounded-lg p-0.5">
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${view === 'kanban' ? 'bg-primary text-white' : 'text-text-secondary'}`}>Kanban</button>
            <button onClick={() => setView('table')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${view === 'table' ? 'bg-primary text-white' : 'text-text-secondary'}`}>Table</button>
          </div>
          <Button icon={Plus} size="sm" onClick={() => setShowAdd(true)}>Add Candidate</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {stageData.map(s => <Card key={s.stage} hoverable><p className="text-[10px] text-text-secondary font-medium uppercase">{s.stage}</p><p className="text-2xl font-bold text-text mt-1">{s.count}</p></Card>)}
      </div>

      {view === 'table' ? (
        <>
          <SearchFilter searchValue={search} onSearch={setSearch} filters={[
            { key: 'stage', label: 'Stage', options: stages },
            { key: 'role', label: 'Role', options: roles },
          ]} activeFilters={filters} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClearFilters={() => setFilters({})} />
          <Card padding={false}><DataTable columns={columns} data={filtered} pageSize={12} onRowClick={setSelected} /></Card>
        </>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.slice(0, 6).map(stage => {
            const stageCandidates = allCandidates.filter(c => c.stage === stage).slice(0, 8);
            return (
              <div key={stage} className="min-w-[280px] flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-text">{stage}</h3><span className="text-xs px-2 py-0.5 rounded-full bg-surface-3 text-text-secondary">{allCandidates.filter(c => c.stage === stage).length}</span></div>
                </div>
                <div className="space-y-2">
                  {stageCandidates.map(c => {
                    const nextStage = stages[stages.indexOf(c.stage) + 1];
                    return (
                      <div key={c.id} className="bg-surface-2 border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-3 mb-2"><Avatar name={c.name} size="sm" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-text truncate">{c.name}</p><p className="text-xs text-text-secondary">{c.role}</p></div></div>
                        <div className="flex items-center gap-2 mb-2"><ProgressBar value={c.score} max={100} size="sm" color={c.score >= 80 ? 'success' : 'warning'} /><span className="text-xs font-semibold">{c.score}%</span></div>
                        {c.status === 'PENDING_APPROVAL' && <div className="mb-2 text-[10px] px-2 py-1 bg-warning/10 text-warning rounded-lg font-medium">Awaiting manager approval</div>}
                        {c.status === 'REVISION_REQUESTED' && <div className="mb-2 text-[10px] px-2 py-1 bg-danger/10 text-danger rounded-lg"><p className="font-medium">Manager requested changes:</p><p className="mt-0.5">{c.managerRemarks}</p></div>}
                        <div className="flex gap-1">
                          {nextStage && nextStage !== 'Hired' && nextStage !== 'Rejected' && !c.convertedEmployeeId && c.status !== 'PENDING_APPROVAL' && <button onClick={() => moveStage(c, nextStage)} className="flex-1 text-[10px] py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 font-medium">→ {nextStage}</button>}
                          {c.stage === 'HR' && !c.convertedEmployeeId && c.status !== 'PENDING_APPROVAL' && <button onClick={() => openOfferModal(c)} className="flex-1 text-[10px] py-1.5 bg-success/10 text-success rounded-lg hover:bg-success/20 font-medium">{c.status === 'REVISION_REQUESTED' ? 'Resubmit' : 'Submit for Approval'}</button>}
                          {c.convertedEmployeeId && <span className="flex-1 text-[10px] py-1.5 text-center bg-surface-3 text-text-secondary rounded-lg font-medium">{c.convertedEmployeeId}</span>}
                          <button onClick={() => handleReject(c)} className="text-[10px] py-1.5 px-2 bg-danger/10 text-danger rounded-lg hover:bg-danger/20">✕</button>
                          <button onClick={() => setSelected(c)} className="text-[10px] py-1.5 px-2 bg-surface-3 text-text-secondary rounded-lg hover:bg-surface-4">View</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Candidate" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Candidate name" />
          <Input label="Email *" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email address" />
          <Input label="Role *" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="e.g. React Developer" />
          <Input label="Experience" value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))} placeholder="e.g. 5 years" />
          <Input label="Current CTC" value={form.currentCTC} onChange={e => setForm(p => ({ ...p, currentCTC: e.target.value }))} placeholder="e.g. ₹12L" />
          <Input label="Expected CTC" value={form.expectedCTC} onChange={e => setForm(p => ({ ...p, expectedCTC: e.target.value }))} placeholder="e.g. ₹18L" />
          <Select label="Source" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))} options={['LinkedIn','Naukri','Indeed','Referral','Company Website','Campus'].map(s => ({ value: s, label: s }))} />
          <Input label="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
        </div>
        <div className="flex justify-end gap-2 mt-6"><Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={handleCreate}>Add Candidate</Button></div>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Candidate Profile" size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-surface-3 rounded-xl">
              <Avatar name={selected.name} size="lg" />
              <div className="flex-1"><h3 className="text-lg font-bold text-text">{selected.name}</h3><p className="text-sm text-primary">{selected.role}</p><p className="text-xs text-text-secondary">{selected.email} &middot; {selected.phone}</p><div className="flex gap-2 mt-2"><Badge>{selected.stage}</Badge><Badge variant="default">{selected.source}</Badge></div></div>
              <div className="flex flex-col gap-2">
                <Button size="sm" icon={Calendar} onClick={() => { handleScheduleInterview(selected); setSelected(null); }}>Schedule Interview</Button>
                <Button size="sm" variant="secondary" icon={Mail} onClick={() => { toast.info(`Email sent to ${selected.name}`); }}>Send Email</Button>
                {selected.stage === 'HR' && !selected.convertedEmployeeId && selected.status !== 'PENDING_APPROVAL' && (
                  <Button size="sm" variant="secondary" icon={FileText} onClick={() => openOfferModal(selected)}>{selected.status === 'REVISION_REQUESTED' ? 'Resubmit Proposal' : 'Submit for Approval'}</Button>
                )}
                {selected.status === 'PENDING_APPROVAL' && <Badge variant="warning">Awaiting manager approval</Badge>}
                {selected.convertedEmployeeId && <Badge variant="success">Employee {selected.convertedEmployeeId}</Badge>}
              </div>
            </div>
            {selected.status === 'REVISION_REQUESTED' && selected.managerRemarks && (
              <div className="p-3 bg-danger/5 border border-danger/20 rounded-xl">
                <p className="text-xs text-danger font-semibold">Manager requested changes</p>
                <p className="text-xs text-text-secondary mt-0.5">{selected.managerRemarks}</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[['Experience', selected.experience], ['Current CTC', selected.currentCTC], ['Expected CTC', selected.expectedCTC], ['Notice Period', selected.noticePeriod], ['Current Company', selected.currentCompany], ['Location', selected.location], ['Applied Date', selected.appliedDate], ['Score', `${selected.score}%`], ['Interviewer', selected.interviewer]].map(([k, v]) => (
                <div key={k}><p className="text-xs text-text-secondary">{k}</p><p className="text-text font-medium mt-0.5">{v || '-'}</p></div>
              ))}
            </div>
            {selected.feedback && <div className="p-3 bg-surface-3 rounded-lg"><p className="text-xs text-text-secondary mb-1">Feedback</p><p className="text-sm text-text">{selected.feedback}</p></div>}
            <div className="flex gap-2">
              {stages.slice(0, 6).filter(s => s !== selected.stage && s !== 'Rejected').map(s => (
                <button key={s} onClick={() => { moveStage(selected, s); setSelected(null); }} className="px-3 py-1.5 text-xs font-medium bg-surface-3 rounded-lg hover:bg-surface-4 text-text-secondary hover:text-text">Move to {s}</button>
              ))}
              <button onClick={() => { handleReject(selected); setSelected(null); }} className="px-3 py-1.5 text-xs font-medium bg-danger/10 rounded-lg hover:bg-danger/20 text-danger">Reject</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!offerCandidate} onClose={() => setOfferCandidate(null)} title="Submit Offer Proposal for Approval" size="lg">
        {offerCandidate && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-surface-3 rounded-xl">
              <Avatar name={offerCandidate.name} size="md" />
              <div><p className="font-medium text-text">{offerCandidate.name}</p><p className="text-xs text-text-secondary">{offerCandidate.email}</p></div>
            </div>
            {offerCandidate.status === 'REVISION_REQUESTED' && offerCandidate.managerRemarks && (
              <div className="p-3 bg-danger/5 border border-danger/20 rounded-xl">
                <p className="text-xs text-danger font-semibold">Manager requested changes</p>
                <p className="text-xs text-text-secondary mt-0.5">{offerCandidate.managerRemarks}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Select label="Designation *" value={offerForm.designationId} onChange={e => setOfferForm(p => ({ ...p, designationId: e.target.value }))}
                options={(lookups.designations || []).map(d => ({ value: d.id, label: d.title }))} placeholder="Select designation" />
              <Select label="Department *" value={offerForm.departmentId} onChange={e => setOfferForm(p => ({ ...p, departmentId: e.target.value }))}
                options={(lookups.departments || []).map(d => ({ value: d.id, label: d.name }))} placeholder="Select department" />
              <Input label="Annual CTC (₹) *" type="number" value={offerForm.offeredCtc} onChange={e => setOfferForm(p => ({ ...p, offeredCtc: e.target.value }))} placeholder="e.g. 1200000" />
              <Input label="Date of Joining *" type="date" value={offerForm.dateOfJoining} onChange={e => setOfferForm(p => ({ ...p, dateOfJoining: e.target.value }))} />
              <Select label="Reporting Manager" value={offerForm.reportingManagerId} onChange={e => setOfferForm(p => ({ ...p, reportingManagerId: e.target.value }))}
                options={managerOptions.map(m => ({ value: m.id, label: m.designation ? `${m.name} (${m.designation})` : m.name }))} placeholder="Select reporting manager" />
            </div>
            {offerBreakup && (
              <div className="p-3 bg-surface-3 rounded-lg space-y-1">
                <p className="text-xs font-semibold text-text-secondary uppercase mb-2">Monthly CTC Breakup (per CEO's standard template)</p>
                {Object.entries(offerBreakup).filter(([k]) => k !== 'ctc').map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm"><span className="text-text-secondary capitalize">{k.replace(/([A-Z])/g, ' $1')}</span><span className="text-text font-medium">₹{Number(v).toLocaleString('en-IN')}</span></div>
                ))}
              </div>
            )}
            <p className="text-xs text-text-secondary">This submits the proposal to a manager for approval. Nothing is emailed to {offerCandidate.email} until the manager approves it.</p>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOfferCandidate(null)}>Cancel</Button><Button onClick={handleProposeSelection} disabled={offerSubmitting}>{offerSubmitting ? 'Submitting...' : 'Submit for Approval'}</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
