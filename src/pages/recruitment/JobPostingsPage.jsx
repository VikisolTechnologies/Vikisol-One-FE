import { useState, useEffect, useMemo } from 'react';
import { Briefcase, Plus, Edit3, Trash2, Users, MapPin, IndianRupee } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input, { Select, Textarea } from '../../components/ui/Input';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SearchFilter from '../../components/ui/SearchFilter';
import EmptyState from '../../components/ui/EmptyState';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { getAllJobPostings, createJobPosting, updateJobPosting, deleteJobPosting } from '../../api/recruitment';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'FILLED', label: 'Filled' },
];
const STATUS_COLOR = { DRAFT: 'default', OPEN: 'success', ON_HOLD: 'warning', CLOSED: 'default', FILLED: 'info' };
const EMPLOYMENT_TYPES = ['Full Time', 'Part Time', 'Contract', 'Intern'].map(v => ({ value: v, label: v }));

const EMPTY_FORM = {
  title: '', description: '', departmentId: '', designationId: '', location: '',
  employmentType: 'Full Time', experienceMin: '', experienceMax: '', salaryMin: '', salaryMax: '',
  skills: '', numberOfPositions: 1, status: 'OPEN', closingDate: '',
};

// CEO/HR Manager can create and manage job postings (title, JD, tech stack/skills, headcount) so
// candidates can be tagged against a real requirement instead of only free-text role/skills - see
// RecruitmentPage.jsx's Add Candidate flow and the candidate profile's "Applied For" section for
// where this data surfaces on the candidate side. Every recruiter is notified the moment a new
// posting goes live (see RecruitmentService.notifyRecruitersOfNewJobPosting on the backend).
export default function JobPostingsPage() {
  const { data, employeesSource, lookups } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const canManage = ['ceo', 'hr_manager', 'admin'].includes((user?.role || '').toLowerCase());

  const [postings, setPostings] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    getAllJobPostings({ size: 200 }).then(r => setPostings(r.items)).catch(() => { toast.error('Could not load job postings'); setPostings([]); });
  };
  useEffect(() => { load(); }, []);

  const deptOptions = employeesSource === 'live' && lookups.departments.length
    ? lookups.departments.map(d => ({ value: d.id, label: d.name }))
    : (data.departments || []).map(d => ({ value: d, label: d }));
  const desigOptions = employeesSource === 'live' && lookups.designations.length
    ? lookups.designations.map(d => ({ value: d.id, label: d.title }))
    : null;

  const filtered = useMemo(() => {
    if (!postings) return [];
    return postings.filter(p => {
      const s = search.toLowerCase();
      const matchSearch = !s || p.title.toLowerCase().includes(s) || (p.department || '').toLowerCase().includes(s) || p.skills.some(sk => sk.toLowerCase().includes(s));
      const matchStatus = !filters.status || filters.status === 'All' || p.status === filters.status;
      return matchSearch && matchStatus;
    });
  }, [postings, search, filters]);

  const candidateCount = (jobId) => data.candidates.filter(c => c.jobPostingId === jobId).length;

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      title: p.title, description: p.description || '', departmentId: p.departmentId || '', designationId: p.designationId || '',
      location: p.location || '', employmentType: p.employmentType, experienceMin: p.experienceMin ?? '', experienceMax: p.experienceMax ?? '',
      salaryMin: p.salaryMin ?? '', salaryMax: p.salaryMax ?? '', skills: p.skills.join(', '), numberOfPositions: p.numberOfPositions,
      status: p.status, closingDate: p.closingDate || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Job title is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateJobPosting(editing.id, form);
        toast.success('Job posting updated');
      } else {
        await createJobPosting(form);
        toast.success(`"${form.title}" posted - every recruiter has been notified`);
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save job posting');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    const ok = await confirm({ title: 'Delete Job Posting?', message: `Delete "${p.title}"? This cannot be undone.`, type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await deleteJobPosting(p.id);
      toast.success('Job posting deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete job posting');
    }
  };

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Job Postings' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Job Postings</h1>
          <p className="text-sm text-text-secondary">
            {canManage ? 'Create requirements and tag candidates against real openings - every recruiter is notified when a new one goes live.' : 'Open requirements to tag candidates against during the interview process.'}
          </p>
        </div>
        {canManage && <Button icon={Plus} onClick={openCreate}>New Job Posting</Button>}
      </div>

      <SearchFilter searchValue={search} onSearch={setSearch} filters={[
        { key: 'status', label: 'Status', options: STATUS_OPTIONS.map(o => o.label) },
      ]} activeFilters={filters} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: STATUS_OPTIONS.find(o => o.label === v)?.value || v }))} onClearFilters={() => setFilters({})} />

      {postings === null ? (
        <Card><p className="text-sm text-text-secondary">Loading...</p></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={Briefcase} title="No job postings yet" description={canManage ? 'Create your first requirement so candidates can be tagged against it during interviews.' : 'HR has not posted any openings yet.'} action={canManage ? openCreate : undefined} actionLabel="New Job Posting" /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Card key={p.id} hoverable>
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-text truncate">{p.title}</h3>
                  <p className="text-xs text-text-secondary">{p.department}{p.designation ? ` · ${p.designation}` : ''}</p>
                </div>
                <Badge variant={STATUS_COLOR[p.status]}>{p.status.replace('_', ' ')}</Badge>
              </div>
              {p.description && <p className="text-xs text-text-secondary line-clamp-2 mb-2">{p.description}</p>}
              <div className="flex flex-wrap gap-1 my-2">
                {p.skills.slice(0, 5).map(s => <span key={s} className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">{s}</span>)}
              </div>
              <div className="space-y-1 text-xs text-text-secondary">
                {p.location && <div className="flex items-center gap-1"><MapPin size={12} /> {p.location}</div>}
                <div className="flex items-center gap-1"><Users size={12} /> {p.numberOfPositions} position(s) · {candidateCount(p.id)} candidate(s) tagged</div>
                {(p.salaryMin || p.salaryMax) && <div className="flex items-center gap-1"><IndianRupee size={12} /> {p.salaryMin || '?'} - {p.salaryMax || '?'} LPA</div>}
              </div>
              {canManage && (
                <div className="flex gap-1.5 mt-3 pt-3 border-t border-border">
                  <Button size="sm" variant="secondary" icon={Edit3} onClick={() => openEdit(p)} className="flex-1">Edit</Button>
                  <Button size="sm" variant="ghost" icon={Trash2} onClick={() => handleDelete(p)} className="text-danger" />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Job Posting' : 'New Job Posting'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Job Title *" className="col-span-2" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Senior React Developer" />
          <Textarea label="Job Description" className="col-span-2" rows={4} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Responsibilities, requirements, what the role owns..." />
          <Select label="Department" value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))} options={deptOptions} placeholder="Select department" />
          {desigOptions ? (
            <Select label="Designation" value={form.designationId} onChange={e => setForm(p => ({ ...p, designationId: e.target.value }))} options={desigOptions} placeholder="Select designation" />
          ) : (
            <Input label="Designation" value={form.designationId} onChange={e => setForm(p => ({ ...p, designationId: e.target.value }))} />
          )}
          <Input label="Location" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Hyderabad / Remote" />
          <Select label="Employment Type" value={form.employmentType} onChange={e => setForm(p => ({ ...p, employmentType: e.target.value }))} options={EMPLOYMENT_TYPES} />
          <Input label="Experience Min (years)" type="number" min="0" value={form.experienceMin} onChange={e => setForm(p => ({ ...p, experienceMin: e.target.value }))} />
          <Input label="Experience Max (years)" type="number" min="0" value={form.experienceMax} onChange={e => setForm(p => ({ ...p, experienceMax: e.target.value }))} />
          <Input label="Salary Min (LPA)" type="number" min="0" value={form.salaryMin} onChange={e => setForm(p => ({ ...p, salaryMin: e.target.value }))} />
          <Input label="Salary Max (LPA)" type="number" min="0" value={form.salaryMax} onChange={e => setForm(p => ({ ...p, salaryMax: e.target.value }))} />
          <Input label="Number of Positions" type="number" min="1" value={form.numberOfPositions} onChange={e => setForm(p => ({ ...p, numberOfPositions: e.target.value }))} />
          <Select label="Status" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} options={STATUS_OPTIONS} />
          <Input label="Tech Stack / Skills (comma-separated)" className="col-span-2" value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} placeholder="React, Node.js, PostgreSQL" />
          <Input label="Closing Date" type="date" value={form.closingDate} onChange={e => setForm(p => ({ ...p, closingDate: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Post Job & Notify Recruiters'}</Button>
        </div>
      </Modal>
    </div>
  );
}
