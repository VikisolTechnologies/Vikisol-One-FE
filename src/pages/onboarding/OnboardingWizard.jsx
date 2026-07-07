import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft, Plus, Trash2, GraduationCap, Briefcase, Wrench, FileText, Landmark, Receipt, Users, PartyPopper, ChevronDown } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Select } from '../../components/ui/Input';
import DatePicker from '../../components/ui/DatePicker';
import ProgressBar from '../../components/ui/ProgressBar';
import Loader from '../../components/ui/Loader';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { getMyProfile, updateOwnProfile } from '../../api/employees';
import { getEducation, addEducation, deleteEducation, getEmploymentHistory, addEmploymentHistory, deleteEmploymentHistory, getSkills, addSkill, deleteSkill, getProfileCompletion } from '../../api/onboarding';
import { uploadDocument, getMyDocuments } from '../../api/documents';

const MARITAL_STATUS_OPTIONS = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Divorced', label: 'Divorced' },
  { value: 'Widowed', label: 'Widowed' },
];

const RELATION_OPTIONS = [
  { value: 'Mother', label: 'Mother' },
  { value: 'Father', label: 'Father' },
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Son', label: 'Son' },
  { value: 'Daughter', label: 'Daughter' },
  { value: 'Relative', label: 'Relative' },
  { value: 'Friend', label: 'Friend' },
];

// The 22 languages of the Eighth Schedule of the Indian Constitution, plus English - covers what
// an Indian employer's HR form needs without hardcoding an exhaustive world-language list.
const INDIAN_LANGUAGES = [
  'Assamese', 'Bengali', 'Bodo', 'Dogri', 'English', 'Gujarati', 'Hindi', 'Kannada', 'Kashmiri',
  'Konkani', 'Maithili', 'Malayalam', 'Manipuri', 'Marathi', 'Nepali', 'Odia', 'Punjabi',
  'Sanskrit', 'Santali', 'Sindhi', 'Tamil', 'Telugu', 'Urdu',
].sort();

// Comma-joined string in/out (matches the existing single-string languagesKnown field) but
// presented as a proper multi-select checklist instead of free-text typing.
function LanguagesMultiSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selected = (value || '').split(',').map(s => s.trim()).filter(Boolean);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = (lang) => {
    const next = selected.includes(lang) ? selected.filter(l => l !== lang) : [...selected, lang];
    onChange(next.join(', '));
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs font-medium text-text-secondary block mb-1.5">Languages Known</label>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-surface-3 border border-border rounded-lg py-2.5 px-3 text-sm text-left focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all">
        <span className={`truncate ${selected.length ? 'text-text' : 'text-text-secondary/60'}`}>{selected.length ? selected.join(', ') : 'Select languages'}</span>
        <ChevronDown size={14} className="text-text-secondary flex-shrink-0 ml-2" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-surface-2 border border-border rounded-lg shadow-xl p-2 grid grid-cols-2 gap-1">
          {INDIAN_LANGUAGES.map(lang => (
            <label key={lang} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-3 cursor-pointer text-sm text-text">
              <input type="checkbox" checked={selected.includes(lang)} onChange={() => toggle(lang)} className="accent-primary" />
              {lang}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

const STEPS = [
  { key: 'personal', label: 'Personal Information', icon: Users },
  { key: 'education', label: 'Education', icon: GraduationCap },
  { key: 'employment', label: 'Employment History', icon: Briefcase },
  { key: 'skills', label: 'Skills', icon: Wrench },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'bank', label: 'Bank Details', icon: Landmark },
  { key: 'tax', label: 'Tax Information', icon: Receipt },
  { key: 'nominee', label: 'Nominee', icon: Users },
  { key: 'finish', label: 'Finish', icon: PartyPopper },
];

// Required fields per step - used to render red "required" validation and block Save until
// filled, rather than silently accepting a half-empty profile.
const REQUIRED_FIELDS = {
  personal: ['dob', 'gender', 'maritalStatus', 'personalMobile', 'address', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation'],
  bank: ['bankName', 'bankAccount', 'ifsc'],
  tax: ['pan', 'aadhar'],
  nominee: ['nomineeName', 'nomineeRelation', 'nomineeDateOfBirth'],
};
const FIELD_LABELS = {
  dob: 'Date of Birth', gender: 'Gender', maritalStatus: 'Marital Status', personalMobile: 'Personal Mobile',
  address: 'Current Address', emergencyContactName: 'Emergency Contact Name', emergencyContactPhone: 'Emergency Contact Phone',
  emergencyContactRelation: 'Emergency Contact Relation', bankName: 'Bank Name', bankAccount: 'Account Number', ifsc: 'IFSC Code',
  pan: 'PAN Number', aadhar: 'Aadhaar Number', nomineeName: 'Nominee Name', nomineeRelation: 'Nominee Relation', nomineeDateOfBirth: 'Nominee Date of Birth',
};

function buildInitialDraft(profile) {
  return {
    dob: profile.dob || '', gender: profile.gender || '', maritalStatus: profile.maritalStatus || '',
    nationality: profile.nationality || '', bloodGroup: profile.bloodGroup || '',
    address: profile.address || '', permanentAddress: profile.permanentAddress || '',
    personalEmail: profile.personalEmail || '', personalMobile: profile.personalMobile || '',
    languagesKnown: profile.languagesKnown || '',
    emergencyContactName: profile.emergencyContact?.name || '', emergencyContactPhone: profile.emergencyContact?.phone || '', emergencyContactRelation: profile.emergencyContact?.relation || '',
    bankName: profile.bankName || '', bankAccount: profile.bankAccount || '', ifsc: profile.ifsc || '',
    pan: profile.pan || '', aadhar: profile.aadhar || '', uan: profile.uan || '', pfNumber: profile.pfNumber || '', esiNumber: profile.esiNumber || '',
    nomineeName: profile.nominee?.name || '', nomineeRelation: profile.nominee?.relation || '',
    nomineeDateOfBirth: profile.nominee?.dob || '', nomineeSharePercentage: profile.nominee?.sharePercentage || 100, nomineeGender: profile.nominee?.gender || '',
  };
}

export default function OnboardingWizard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [completion, setCompletion] = useState({ percent: 0, missing: [] });

  // Lifted here (not owned by each step component) so switching steps - which unmounts/remounts
  // the previous step - never loses unsaved edits. Previously PersonalStep/BankStep/TaxStep/
  // NomineeStep each kept their own local useState seeded from `profile`, so any unsaved typing
  // vanished the instant you navigated to another step and back, since `profile` only reflects
  // the last successfully SAVED values, not in-progress edits.
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const draftStorageKey = profile ? `onboarding-draft-${profile.id}` : null;

  const [education, setEducation] = useState([]);
  const [employment, setEmployment] = useState([]);
  const [skills, setSkills] = useState([]);
  const [documents, setDocuments] = useState([]);

  const refreshCompletion = useCallback((employeeId) => {
    getProfileCompletion(employeeId).then(setCompletion).catch(() => {});
  }, []);

  useEffect(() => {
    getMyProfile().then(p => {
      setProfile(p);
      // Also surviving a full page reload/navigating away entirely, not just switching steps -
      // prefer any unsaved draft already sitting in this browser over the last-saved profile.
      let initialDraft = buildInitialDraft(p);
      try {
        const cached = sessionStorage.getItem(`onboarding-draft-${p.id}`);
        if (cached) initialDraft = { ...initialDraft, ...JSON.parse(cached) };
      } catch { /* ignore corrupt/unavailable storage */ }
      setDraft(initialDraft);
      Promise.all([
        getEducation(p.id), getEmploymentHistory(p.id), getSkills(p.id), getMyDocuments(),
      ]).then(([edu, emp, sk, docs]) => {
        setEducation(edu); setEmployment(emp); setSkills(sk); setDocuments(docs || []);
      }).finally(() => setLoading(false));
      refreshCompletion(p.id);
    }).catch(() => setLoading(false));
  }, [refreshCompletion]);

  useEffect(() => {
    if (!draft || !draftStorageKey) return;
    try { sessionStorage.setItem(draftStorageKey, JSON.stringify(draft)); } catch { /* storage unavailable - draft still survives step switches via state */ }
  }, [draft, draftStorageKey]);

  const updateDraft = (patch) => setDraft(prev => ({ ...prev, ...patch }));

  if (loading || !draft) return <div className="flex items-center justify-center h-full min-h-[50vh]"><Loader /></div>;
  if (!profile) return null;

  const step = STEPS[stepIndex];
  const goNext = () => setStepIndex(i => Math.min(STEPS.length - 1, i + 1));
  const goBack = () => setStepIndex(i => Math.max(0, i - 1));

  const validateStep = (stepKey) => {
    const required = REQUIRED_FIELDS[stepKey];
    if (!required) return true;
    const stepErrors = {};
    required.forEach(field => {
      const value = draft[field];
      if (value === '' || value === null || value === undefined) stepErrors[field] = `${FIELD_LABELS[field]} is required`;
    });
    setErrors(prev => ({ ...prev, ...stepErrors, ...Object.fromEntries(required.filter(f => !stepErrors[f]).map(f => [f, undefined])) }));
    return Object.keys(stepErrors).length === 0;
  };

  const saveStep = async (stepKey) => {
    if (!validateStep(stepKey)) {
      toast.error('Please fill the highlighted required fields');
      return;
    }
    try {
      await updateOwnProfile(profile.id, { ...profile, ...draft });
      toast.success('Saved');
      refreshCompletion(profile.id);
      if (draftStorageKey) { try { sessionStorage.removeItem(draftStorageKey); } catch { /* ignore */ } }
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-text">Welcome to Vikisol, {user?.name?.split(' ')[0] || ''}!</h1>
        <p className="text-sm text-text-secondary mt-1">Let's complete your profile to get you fully onboarded.</p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-text">Profile Completion</span>
          <span className="text-sm font-bold text-primary">{completion.percent}%</span>
        </div>
        <ProgressBar value={completion.percent} max={100} color={completion.percent === 100 ? 'success' : 'primary'} />
      </Card>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <button key={s.key} onClick={() => setStepIndex(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${i === stepIndex ? 'bg-primary text-white' : i < stepIndex ? 'bg-success/10 text-success' : 'bg-surface-3 text-text-secondary'}`}>
            {i < stepIndex ? <Check size={12} /> : <s.icon size={12} />} {s.label}
          </button>
        ))}
      </div>

      <Card>
        <AnimatePresence mode="wait">
          <motion.div key={step.key} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
            {step.key === 'personal' && <PersonalStep form={draft} errors={errors} onChange={updateDraft} onSave={() => saveStep('personal')} />}
            {step.key === 'education' && <EducationStep employeeId={profile.id} items={education} setItems={setEducation} onChange={() => refreshCompletion(profile.id)} />}
            {step.key === 'employment' && <EmploymentStep employeeId={profile.id} items={employment} setItems={setEmployment} onChange={() => refreshCompletion(profile.id)} />}
            {step.key === 'skills' && <SkillsStep employeeId={profile.id} items={skills} setItems={setSkills} onChange={() => refreshCompletion(profile.id)} />}
            {step.key === 'documents' && <DocumentsStep employeeId={profile.id} items={documents} setItems={setDocuments} onChange={() => refreshCompletion(profile.id)} />}
            {step.key === 'bank' && <BankStep form={draft} errors={errors} onChange={updateDraft} onSave={() => saveStep('bank')} />}
            {step.key === 'tax' && <TaxStep form={draft} errors={errors} onChange={updateDraft} onSave={() => saveStep('tax')} />}
            {step.key === 'nominee' && <NomineeStep form={draft} errors={errors} onChange={updateDraft} onSave={() => saveStep('nominee')} />}
            {step.key === 'finish' && <FinishStep completion={completion} onGoDashboard={() => navigate('/')} />}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-6 pt-4 border-t border-border">
          <Button variant="secondary" icon={ChevronLeft} onClick={goBack} disabled={stepIndex === 0}>Back</Button>
          {stepIndex < STEPS.length - 1 && <Button onClick={goNext}>Next <ChevronRight size={16} /></Button>}
        </div>
      </Card>
    </div>
  );
}

function PersonalStep({ form, errors, onChange, onSave }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <DatePicker label="Date of Birth" value={form.dob} onChange={v => onChange({ dob: v })} max={new Date().toISOString().split('T')[0]} error={errors.dob} />
        <Select label="Gender" value={form.gender} onChange={e => onChange({ gender: e.target.value })} placeholder="Select gender" options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }]} error={errors.gender} />
        <Select label="Marital Status" value={form.maritalStatus} onChange={e => onChange({ maritalStatus: e.target.value })} placeholder="Select marital status" options={MARITAL_STATUS_OPTIONS} error={errors.maritalStatus} />
        <Input label="Nationality" value={form.nationality} onChange={e => onChange({ nationality: e.target.value })} placeholder="Indian" />
        <Input label="Blood Group" value={form.bloodGroup} onChange={e => onChange({ bloodGroup: e.target.value })} placeholder="O+" />
        <LanguagesMultiSelect value={form.languagesKnown} onChange={v => onChange({ languagesKnown: v })} />
        <Input label="Personal Email" type="email" value={form.personalEmail} onChange={e => onChange({ personalEmail: e.target.value })} />
        <Input label="Personal Mobile" value={form.personalMobile} onChange={e => onChange({ personalMobile: e.target.value })} error={errors.personalMobile} />
        <Input label="Current Address" className="col-span-2" value={form.address} onChange={e => onChange({ address: e.target.value })} error={errors.address} />
        <Input label="Permanent Address" className="col-span-2" value={form.permanentAddress} onChange={e => onChange({ permanentAddress: e.target.value })} />
      </div>
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider pt-2">Emergency Contact</p>
      <div className="grid grid-cols-3 gap-4">
        <Input label="Name" value={form.emergencyContactName} onChange={e => onChange({ emergencyContactName: e.target.value })} error={errors.emergencyContactName} />
        <Input label="Phone" value={form.emergencyContactPhone} onChange={e => onChange({ emergencyContactPhone: e.target.value })} error={errors.emergencyContactPhone} />
        <Select label="Relation" value={form.emergencyContactRelation} onChange={e => onChange({ emergencyContactRelation: e.target.value })} placeholder="Select relation" options={RELATION_OPTIONS} error={errors.emergencyContactRelation} />
      </div>
      <div className="flex justify-end"><Button onClick={onSave}>Save</Button></div>
    </div>
  );
}

function BankStep({ form, errors, onChange, onSave }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Bank Name" value={form.bankName} onChange={e => onChange({ bankName: e.target.value })} error={errors.bankName} />
        <Input label="Account Number" value={form.bankAccount} onChange={e => onChange({ bankAccount: e.target.value })} error={errors.bankAccount} />
        <Input label="IFSC Code" value={form.ifsc} onChange={e => onChange({ ifsc: e.target.value })} error={errors.ifsc} />
      </div>
      <div className="flex justify-end"><Button onClick={onSave}>Save</Button></div>
    </div>
  );
}

function TaxStep({ form, errors, onChange, onSave }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="PAN Number" value={form.pan} onChange={e => onChange({ pan: e.target.value })} error={errors.pan} />
        <Input label="Aadhaar Number" value={form.aadhar} onChange={e => onChange({ aadhar: e.target.value })} error={errors.aadhar} />
        <Input label="UAN Number" value={form.uan} onChange={e => onChange({ uan: e.target.value })} />
        <Input label="PF Number" value={form.pfNumber} onChange={e => onChange({ pfNumber: e.target.value })} />
        <Input label="ESI Number" value={form.esiNumber} onChange={e => onChange({ esiNumber: e.target.value })} />
      </div>
      <div className="flex justify-end"><Button onClick={onSave}>Save</Button></div>
    </div>
  );
}

function NomineeStep({ form, errors, onChange, onSave }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nominee Name" value={form.nomineeName} onChange={e => onChange({ nomineeName: e.target.value })} error={errors.nomineeName} />
        <Select label="Relation" value={form.nomineeRelation} onChange={e => onChange({ nomineeRelation: e.target.value })} placeholder="Select relation" options={RELATION_OPTIONS} error={errors.nomineeRelation} />
        <DatePicker label="Date of Birth" value={form.nomineeDateOfBirth} onChange={v => onChange({ nomineeDateOfBirth: v })} max={new Date().toISOString().split('T')[0]} error={errors.nomineeDateOfBirth} />
        <Input label="Share %" type="number" min="1" max="100" value={form.nomineeSharePercentage} onChange={e => onChange({ nomineeSharePercentage: parseInt(e.target.value) || 0 })} />
      </div>
      <div className="flex justify-end"><Button onClick={onSave}>Save</Button></div>
    </div>
  );
}

function EducationStep({ employeeId, items, setItems, onChange }) {
  const toast = useToast();
  const [form, setForm] = useState({ degree: '', university: '', college: '', yearOfCompletion: '', gradeOrPercentage: '' });
  const add = async () => {
    if (!form.degree) { toast.error('Degree is required'); return; }
    try {
      const created = await addEducation(employeeId, { ...form, yearOfCompletion: form.yearOfCompletion ? parseInt(form.yearOfCompletion) : null });
      setItems(prev => [...prev, created]);
      setForm({ degree: '', university: '', college: '', yearOfCompletion: '', gradeOrPercentage: '' });
      onChange();
    } catch (err) { toast.error(err.message || 'Failed to add'); }
  };
  const remove = async (id) => {
    try { await deleteEducation(employeeId, id); setItems(prev => prev.filter(i => i.id !== id)); onChange(); }
    catch (err) { toast.error(err.message || 'Failed to remove'); }
  };
  return (
    <div className="space-y-4">
      <ListRows items={items} onRemove={remove} render={e => `${e.degree} - ${e.university || e.college || ''} ${e.yearOfCompletion ? `(${e.yearOfCompletion})` : ''}`} />
      <div className="grid grid-cols-2 gap-4 p-4 bg-surface-3 rounded-xl">
        <Input label="Degree *" value={form.degree} onChange={e => setForm(p => ({ ...p, degree: e.target.value }))} placeholder="B.Tech" />
        <Input label="University" value={form.university} onChange={e => setForm(p => ({ ...p, university: e.target.value }))} />
        <Input label="College" value={form.college} onChange={e => setForm(p => ({ ...p, college: e.target.value }))} />
        <Input label="Year of Completion" type="number" value={form.yearOfCompletion} onChange={e => setForm(p => ({ ...p, yearOfCompletion: e.target.value }))} />
        <Input label="Grade / Percentage" value={form.gradeOrPercentage} onChange={e => setForm(p => ({ ...p, gradeOrPercentage: e.target.value }))} />
      </div>
      <Button variant="secondary" icon={Plus} onClick={add}>Add Education</Button>
    </div>
  );
}

function EmploymentStep({ employeeId, items, setItems, onChange }) {
  const toast = useToast();
  const [form, setForm] = useState({ companyName: '', designation: '', joiningDate: '', relievingDate: '', skillsUsed: '', managerName: '', reasonForLeaving: '', location: '' });
  const add = async () => {
    if (!form.companyName) { toast.error('Company name is required'); return; }
    try {
      const created = await addEmploymentHistory(employeeId, form);
      setItems(prev => [...prev, created]);
      setForm({ companyName: '', designation: '', joiningDate: '', relievingDate: '', skillsUsed: '', managerName: '', reasonForLeaving: '', location: '' });
      onChange();
    } catch (err) { toast.error(err.message || 'Failed to add'); }
  };
  const remove = async (id) => {
    try { await deleteEmploymentHistory(employeeId, id); setItems(prev => prev.filter(i => i.id !== id)); onChange(); }
    catch (err) { toast.error(err.message || 'Failed to remove'); }
  };
  return (
    <div className="space-y-4">
      <ListRows items={items} onRemove={remove} render={e => `${e.designation || ''} at ${e.companyName} ${e.joiningDate ? `(${e.joiningDate} - ${e.relievingDate || 'Present'})` : ''}`} />
      <div className="grid grid-cols-2 gap-4 p-4 bg-surface-3 rounded-xl">
        <Input label="Company Name *" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))} />
        <Input label="Designation" value={form.designation} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))} />
        <Input label="Joining Date" type="date" value={form.joiningDate} onChange={e => setForm(p => ({ ...p, joiningDate: e.target.value }))} />
        <Input label="Relieving Date" type="date" value={form.relievingDate} onChange={e => setForm(p => ({ ...p, relievingDate: e.target.value }))} />
        <Input label="Skills Used" value={form.skillsUsed} onChange={e => setForm(p => ({ ...p, skillsUsed: e.target.value }))} />
        <Input label="Manager" value={form.managerName} onChange={e => setForm(p => ({ ...p, managerName: e.target.value }))} />
        <Input label="Location" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
        <Input label="Reason for Leaving" value={form.reasonForLeaving} onChange={e => setForm(p => ({ ...p, reasonForLeaving: e.target.value }))} />
      </div>
      <Button variant="secondary" icon={Plus} onClick={add}>Add Employment</Button>
    </div>
  );
}

const SKILL_LEVELS = [{ value: 'BEGINNER', label: 'Beginner' }, { value: 'INTERMEDIATE', label: 'Intermediate' }, { value: 'ADVANCED', label: 'Advanced' }, { value: 'EXPERT', label: 'Expert' }];

function SkillsStep({ employeeId, items, setItems, onChange }) {
  const toast = useToast();
  const [form, setForm] = useState({ skillName: '', yearsOfExperience: '', level: 'INTERMEDIATE', lastUsed: '' });
  const add = async () => {
    if (!form.skillName) { toast.error('Skill name is required'); return; }
    try {
      const created = await addSkill(employeeId, { ...form, yearsOfExperience: form.yearsOfExperience ? parseFloat(form.yearsOfExperience) : null });
      setItems(prev => [...prev, created]);
      setForm({ skillName: '', yearsOfExperience: '', level: 'INTERMEDIATE', lastUsed: '' });
      onChange();
    } catch (err) { toast.error(err.message || 'Failed to add'); }
  };
  const remove = async (id) => {
    try { await deleteSkill(employeeId, id); setItems(prev => prev.filter(i => i.id !== id)); onChange(); }
    catch (err) { toast.error(err.message || 'Failed to remove'); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {items.map(s => (
          <span key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-3 rounded-full text-xs text-text">
            {s.skillName} <span className="text-text-secondary">· {s.level}</span>
            <button onClick={() => remove(s.id)} className="text-text-secondary hover:text-danger"><Trash2 size={12} /></button>
          </span>
        ))}
        {items.length === 0 && <p className="text-xs text-text-secondary">No skills added yet.</p>}
      </div>
      <div className="grid grid-cols-4 gap-4 p-4 bg-surface-3 rounded-xl">
        <Input label="Skill *" value={form.skillName} onChange={e => setForm(p => ({ ...p, skillName: e.target.value }))} placeholder="React" />
        <Input label="Years of Experience" type="number" step="0.5" value={form.yearsOfExperience} onChange={e => setForm(p => ({ ...p, yearsOfExperience: e.target.value }))} />
        <Select label="Level" value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))} options={SKILL_LEVELS} />
        <Input label="Last Used" type="date" value={form.lastUsed} onChange={e => setForm(p => ({ ...p, lastUsed: e.target.value }))} />
      </div>
      <Button variant="secondary" icon={Plus} onClick={add}>Add Skill</Button>
    </div>
  );
}

// Must match Document.DocumentType on the backend exactly - these are the types relevant to
// self-service onboarding upload (letters like OFFER_LETTER/RELIEVING_LETTER are generated by
// the system elsewhere, not uploaded here).
const DOC_CATEGORIES = ['ID_PROOF', 'ADDRESS_PROOF', 'EDUCATION_CERTIFICATE', 'TAX_FORM', 'OTHER'];

function DocumentsStep({ employeeId, items, setItems, onChange }) {
  const toast = useToast();
  const [category, setCategory] = useState('ID_PROOF');
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const doc = await uploadDocument({ employeeId, title: category.replace(/_/g, ' '), category, file });
      setItems(prev => [...prev, doc]);
      onChange();
      toast.success('Document uploaded');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <ListRows items={items} render={d => d.title || d.fileName} />
      <div className="flex items-end gap-3 p-4 bg-surface-3 rounded-xl">
        <div className="flex-1">
          <Select label="Document Type" value={category} onChange={e => setCategory(e.target.value)} options={DOC_CATEGORIES.map(c => ({ value: c, label: c.replace(/_/g, ' ') }))} />
        </div>
        <label className="inline-flex">
          <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
          <span className="cursor-pointer inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium">
            {uploading ? 'Uploading...' : 'Choose File'}
          </span>
        </label>
      </div>
    </div>
  );
}

function ListRows({ items, onRemove, render }) {
  if (!items.length) return <p className="text-xs text-text-secondary">Nothing added yet.</p>;
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-surface-3 rounded-lg text-sm text-text">
          <span>{render(item)}</span>
          {onRemove && <button onClick={() => onRemove(item.id)} className="text-text-secondary hover:text-danger"><Trash2 size={14} /></button>}
        </div>
      ))}
    </div>
  );
}

function FinishStep({ completion, onGoDashboard }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-8">
      <PartyPopper size={40} className="text-primary" />
      <h2 className="text-lg font-semibold text-text">{completion.percent === 100 ? "You're all set!" : `You're ${completion.percent}% done`}</h2>
      {completion.missing.length > 0 && (
        <div className="text-left bg-surface-3 rounded-xl p-4 w-full max-w-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Still missing</p>
          <ul className="space-y-1 text-sm text-text">
            {completion.missing.map(m => <li key={m}>• {m}</li>)}
          </ul>
        </div>
      )}
      <Button onClick={onGoDashboard}>Go to Dashboard</Button>
    </div>
  );
}
