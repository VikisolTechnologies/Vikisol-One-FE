import { useState, useEffect } from 'react';
import { History } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Select, Textarea } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import EmployeeAutocomplete from '../../components/ui/EmployeeAutocomplete';
import { useToast } from '../../components/ui/Toast';
import { updateCandidateFull, getCandidateFieldHistory } from '../../api/recruitment';

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERN'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STAGES = ['Applied', 'Screening', 'Technical', 'Manager', 'HR', 'Offered', 'Hired', 'Rejected'];

// Full candidate profile editor - Personal/Professional/Recruitment tabs plus the change-history
// view for the fields that need it, replacing what used to be a read-only details grid. Recruiter/
// HR should never have to leave this modal to update a candidate.
export default function CandidateEditModal({ open, onClose, candidate, employees, jobPostings, onUpdated }) {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [history, setHistory] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!candidate) return;
    setForm({ ...candidate });
    getCandidateFieldHistory(candidate.id).then(setHistory).catch(() => setHistory([]));
  }, [candidate]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await updateCandidateFull(candidate.id, form);
      toast.success('Candidate profile updated');
      onUpdated?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to update candidate');
    } finally {
      setSubmitting(false);
    }
  };

  if (!candidate || !form) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Edit Candidate - ${candidate.name}`} size="xl">
      <div className="space-y-4">
        <Tabs tabs={[
          { id: 'personal', label: 'Personal', content: (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Full Name" value={form.name || ''} onChange={e => set('name', e.target.value)} />
              <Input label="Personal Email" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
              <Input label="Personal Mobile" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
              <Input label="Alternate Mobile" value={form.alternateMobile || ''} onChange={e => set('alternateMobile', e.target.value)} />
              <Input label="Current Address" className="col-span-2" value={form.currentAddress || ''} onChange={e => set('currentAddress', e.target.value)} />
              <Input label="City" value={form.city || ''} onChange={e => set('city', e.target.value)} />
              <Input label="State" value={form.state || ''} onChange={e => set('state', e.target.value)} />
              <Input label="Country" value={form.country || ''} onChange={e => set('country', e.target.value)} />
              <Input label="LinkedIn" value={form.linkedinUrl || ''} onChange={e => set('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/..." />
              <Input label="GitHub" value={form.githubUrl || ''} onChange={e => set('githubUrl', e.target.value)} placeholder="https://github.com/..." />
              <Input label="Portfolio" value={form.portfolioUrl || ''} onChange={e => set('portfolioUrl', e.target.value)} placeholder="https://..." />
              <Input label="Resume URL" value={form.resume || ''} onChange={e => set('resume', e.target.value)} />
            </div>
          )},
          { id: 'professional', label: 'Professional', content: (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Current Company" value={form.currentCompany || ''} onChange={e => set('currentCompany', e.target.value)} />
              <Input label="Current Designation" value={form.currentDesignation || ''} onChange={e => set('currentDesignation', e.target.value)} />
              <Select label="Employment Type" value={form.employmentType || ''} onChange={e => set('employmentType', e.target.value)} options={EMPLOYMENT_TYPES.map(t => ({ value: t, label: t.replace('_', ' ') }))} placeholder="Select type" />
              <Input label="Total Experience (years)" type="number" step="0.5" value={form.experienceYears ?? ''} onChange={e => set('experienceYears', e.target.value)} />
              <Input label="Relevant Experience (years)" type="number" step="0.5" value={form.relevantExperienceYears ?? ''} onChange={e => set('relevantExperienceYears', e.target.value)} />
              <Input label="Current CTC (₹)" type="number" value={form.currentCtcRaw ?? ''} onChange={e => set('currentCtcRaw', e.target.value)} />
              <Input label="Expected CTC (₹)" type="number" value={form.expectedSalary ?? ''} onChange={e => set('expectedSalary', e.target.value)} />
              <Input label="Notice Period (days)" type="number" value={form.noticePeriodRaw ?? ''} onChange={e => set('noticePeriodRaw', e.target.value)} />
              <Input label="Current Location" value={form.currentLocation || ''} onChange={e => set('currentLocation', e.target.value)} />
              <Input label="Preferred Location" value={form.preferredLocation || ''} onChange={e => set('preferredLocation', e.target.value)} />
              <Input label="Skills (comma separated)" className="col-span-2" value={Array.isArray(form.skills) ? form.skills.join(', ') : (form.skills || '')} onChange={e => set('skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
              <Textarea label="Certifications" className="col-span-2" value={form.certifications || ''} onChange={e => set('certifications', e.target.value)} />
            </div>
          )},
          { id: 'recruitment', label: 'Recruitment', content: (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><EmployeeAutocomplete label="Assigned Recruiter" employees={employees} value={form.assignedRecruiterId || ''} onChange={id => set('assignedRecruiterId', id)} /></div>
                <div><EmployeeAutocomplete label="Hiring Manager" employees={employees} value={form.hiringManagerId || ''} onChange={id => set('hiringManagerId', id)} /></div>
                <Select label="Position Applied" value={form.jobPostingId || ''} onChange={e => set('jobPostingId', e.target.value)}
                  options={(jobPostings || []).map(j => ({ value: j.id, label: j.title }))} placeholder="Select job posting" />
                <Input label="Business Unit" value={form.businessUnit || ''} onChange={e => set('businessUnit', e.target.value)} />
                <Select label="Priority" value={form.priority || 'MEDIUM'} onChange={e => set('priority', e.target.value)} options={PRIORITIES.map(p => ({ value: p, label: p }))} />
                <Select label="Source" value={form.source || ''} onChange={e => set('source', e.target.value)} options={['LinkedIn', 'Naukri', 'Indeed', 'Referral', 'Company Website', 'Campus'].map(s => ({ value: s, label: s }))} />
                <Select label="Hiring Stage" value={form.stage || ''} onChange={e => set('stage', e.target.value)} options={STAGES.map(s => ({ value: s, label: s }))} />
              </div>
              <Textarea label="Remarks" value={form.feedback || ''} onChange={e => set('feedback', e.target.value)} />
            </div>
          )},
          { id: 'history', label: 'Change History', content: (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5"><History size={13} /> Field Changes</p>
              {history === null && <p className="text-xs text-text-secondary">Loading...</p>}
              {history?.length === 0 && <p className="text-xs text-text-secondary">No changes recorded yet.</p>}
              {history?.map(h => (
                <div key={h.id} className="flex items-center justify-between px-3 py-2 bg-surface-3 rounded-lg text-xs">
                  <div><span className="font-medium text-text">{h.fieldName}</span><span className="text-text-secondary"> : {h.previousValue || '-'} &rarr; {h.newValue}</span></div>
                  <div className="text-text-secondary text-right flex-shrink-0 ml-2"><div>{h.modifiedByName}</div><div>{h.modifiedAt ? new Date(h.modifiedAt).toLocaleString() : ''}</div></div>
                </div>
              ))}
            </div>
          )},
        ]} />

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={submitting}>{submitting ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </div>
    </Modal>
  );
}
