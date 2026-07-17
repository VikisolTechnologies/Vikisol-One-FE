import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft, ChevronUp, Plus, Trash2, GraduationCap, Briefcase, Wrench, FileText, Landmark, Receipt, Users, PartyPopper, ChevronDown, Download } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Select } from '../../components/ui/Input';
import DatePicker from '../../components/ui/DatePicker';
import ProgressBar from '../../components/ui/ProgressBar';
import Loader from '../../components/ui/Loader';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { downloadFile } from '../../api/client';
import { getMyProfile, updateOwnProfile } from '../../api/employees';
import {
  getEducation, addEducation, updateEducation, deleteEducation,
  getEmploymentHistory, addEmploymentHistory, updateEmploymentHistory, deleteEmploymentHistory,
  getSkills, addSkill, deleteSkill,
  getNominees, addNominee, updateNominee, deleteNominee,
  getProfileCompletion,
} from '../../api/onboarding';
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
  { value: 'Other', label: 'Other' },
];

// Major scheduled/nationalized + leading private-sector banks operating in India - covers the
// overwhelming majority of employees without forcing free-text typing, with "Other" as an escape
// hatch for anything not listed (a smaller regional bank, cooperative bank, etc.) rather than
// blocking the form.
const INDIAN_BANKS = [
  'State Bank of India', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India',
  'Bank of India', 'Indian Bank', 'Central Bank of India', 'Indian Overseas Bank', 'UCO Bank',
  'Bank of Maharashtra', 'Punjab & Sind Bank',
  'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'IndusInd Bank', 'Yes Bank',
  'IDFC FIRST Bank', 'Federal Bank', 'South Indian Bank', 'RBL Bank', 'Bandhan Bank', 'City Union Bank',
  'DCB Bank', 'Karur Vysya Bank', 'Tamilnad Mercantile Bank', 'Karnataka Bank', 'Jammu & Kashmir Bank',
  'IDBI Bank', 'AU Small Finance Bank', 'Equitas Small Finance Bank', 'Ujjivan Small Finance Bank',
  'Other',
];

// A Select that reveals a free-text Input the moment "Other" is chosen - used for Relation and
// Bank Name so the dropdown never blocks an option that isn't in the predefined list. The field's
// actual stored value is always the plain string (a listed option, or whatever was typed under
// "Other") - no separate shadow field, so reloading a previously-custom value ("My Local Bank")
// correctly falls back into "Other" mode with that text shown, instead of needing extra state.
function SelectWithOther({ label, value, onChange, options, error }) {
  const known = options.some(o => o.value === value);
  const [otherMode, setOtherMode] = useState(!known && !!value);
  const showOther = otherMode || (!known && !!value);
  return (
    <div className="space-y-1.5">
      <Select label={label} value={showOther ? 'Other' : value} placeholder={`Select ${label.toLowerCase()}`} options={options} error={!showOther ? error : undefined}
        onChange={e => {
          if (e.target.value === 'Other') { setOtherMode(true); onChange(''); }
          else { setOtherMode(false); onChange(e.target.value); }
        }} />
      {showOther && (
        <Input placeholder={`Enter ${label.toLowerCase()}`} value={value || ''} onChange={e => onChange(e.target.value)} error={showOther ? error : undefined} />
      )}
    </div>
  );
}

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
};
// Format checks layered on top of the plain required-ness check above - previously Save/Next only
// ever verified a field was non-empty, so "hjhhhhLKKL57889803r4rf" satisfied "Account Number is
// required" just fine. Each returns an error string (or null if valid) given the field's value.
const FORMAT_VALIDATORS = {
  personalMobile: (v) => /^\d{10}$/.test(v) ? null : 'Enter a valid 10-digit mobile number',
  emergencyContactPhone: (v) => /^\d{10}$/.test(v) ? null : 'Enter a valid 10-digit phone number',
  bankAccount: (v) => /^\d{9,18}$/.test(v) ? null : 'Enter a valid account number (9-18 digits)',
  ifsc: (v) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v) ? null : 'Enter a valid IFSC code (e.g. HDFC0001234)',
  pan: (v) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v) ? null : 'Enter a valid PAN (e.g. ABCDE1234F)',
  aadhar: (v) => /^\d{12}$/.test(v) ? null : 'Enter a valid 12-digit Aadhaar number',
  uan: (v) => (!v || /^\d{12}$/.test(v)) ? null : 'Enter a valid 12-digit UAN number',
};
const FIELD_LABELS = {
  dob: 'Date of Birth', gender: 'Gender', maritalStatus: 'Marital Status', personalMobile: 'Personal Mobile',
  address: 'Current Address', emergencyContactName: 'Emergency Contact Name', emergencyContactPhone: 'Emergency Contact Phone',
  emergencyContactRelation: 'Emergency Contact Relation', bankName: 'Bank Name', bankAccount: 'Account Number', ifsc: 'IFSC Code',
  pan: 'PAN Number', aadhar: 'Aadhaar Number',
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
  const [nominees, setNominees] = useState([]);

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
        getEducation(p.id), getEmploymentHistory(p.id), getSkills(p.id), getMyDocuments(), getNominees(p.id),
      ]).then(([edu, emp, sk, docs, noms]) => {
        setEducation(edu); setEmployment(emp); setSkills(sk); setDocuments(docs || []); setNominees(noms || []);
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
  // Previously advanced unconditionally regardless of the current step's own validation - Bank/Tax
  // details could be skipped past with invalid or missing values by clicking Next instead of Save.
  const goNext = () => {
    if (REQUIRED_FIELDS[step.key] && !validateStep(step.key)) {
      toast.error('Please fill the highlighted required fields correctly before continuing');
      return;
    }
    setStepIndex(i => Math.min(STEPS.length - 1, i + 1));
  };
  const goBack = () => setStepIndex(i => Math.max(0, i - 1));

  const validateStep = (stepKey) => {
    const required = REQUIRED_FIELDS[stepKey];
    if (!required) return true;
    const stepErrors = {};
    required.forEach(field => {
      const value = draft[field];
      if (value === '' || value === null || value === undefined) stepErrors[field] = `${FIELD_LABELS[field]} is required`;
    });
    // Format validators run on every relevant field present in this step's draft, not just the
    // required list, so e.g. UAN (optional) still gets checked if the employee typed something.
    Object.keys(FORMAT_VALIDATORS).forEach(field => {
      if (stepErrors[field] || !(field in draft) || draft[field] === '') return;
      const formatError = FORMAT_VALIDATORS[field](draft[field]);
      if (formatError) stepErrors[field] = formatError;
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
        {STEPS.map((s, i) => {
          // Green means the backend actually confirms this section is done (real per-section
          // completion flags from getProfileCompletion), not just "you've clicked past it" -
          // previously any step before the current index turned green regardless of whether it
          // had ever been filled in or saved.
          const isDone = completion.sections?.find(sec => sec.key === s.key)?.done;
          return (
            <button key={s.key} onClick={() => setStepIndex(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${i === stepIndex ? 'bg-primary text-white' : isDone ? 'bg-success/10 text-success' : 'bg-surface-3 text-text-secondary'}`}>
              {isDone ? <Check size={12} /> : <s.icon size={12} />} {s.label}
            </button>
          );
        })}
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
            {step.key === 'nominee' && <NomineeStep employeeId={profile.id} items={nominees} setItems={setNominees} onChange={() => refreshCompletion(profile.id)} />}
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
        <Input label="Personal Mobile" value={form.personalMobile} onChange={e => onChange({ personalMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} error={errors.personalMobile} />
        <Input label="Current Address" className="col-span-2" value={form.address} onChange={e => onChange({ address: e.target.value })} error={errors.address} />
        <Input label="Permanent Address" className="col-span-2" value={form.permanentAddress} onChange={e => onChange({ permanentAddress: e.target.value })} />
      </div>
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider pt-2">Emergency Contact</p>
      <div className="grid grid-cols-3 gap-4">
        <Input label="Name" value={form.emergencyContactName} onChange={e => onChange({ emergencyContactName: e.target.value })} error={errors.emergencyContactName} />
        <Input label="Phone" value={form.emergencyContactPhone} onChange={e => onChange({ emergencyContactPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} error={errors.emergencyContactPhone} />
        <SelectWithOther label="Relation" value={form.emergencyContactRelation} onChange={v => onChange({ emergencyContactRelation: v })} options={RELATION_OPTIONS} error={errors.emergencyContactRelation} />
      </div>
      <div className="flex justify-end"><Button onClick={onSave}>Save</Button></div>
    </div>
  );
}

function BankStep({ form, errors, onChange, onSave }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <SelectWithOther label="Bank Name" value={form.bankName} onChange={v => onChange({ bankName: v })} options={INDIAN_BANKS.map(b => ({ value: b, label: b }))} error={errors.bankName} />
        {/* Digits only, stripped as you type (same pattern as phone-number sanitization
            elsewhere) - previously accepted letters/special characters with no restriction. */}
        <Input label="Account Number" value={form.bankAccount} onChange={e => onChange({ bankAccount: e.target.value.replace(/\D/g, '').slice(0, 18) })} error={errors.bankAccount} />
        <Input label="IFSC Code" value={form.ifsc} onChange={e => onChange({ ifsc: e.target.value.toUpperCase().slice(0, 11) })} error={errors.ifsc} />
      </div>
      <div className="flex justify-end"><Button onClick={onSave}>Save</Button></div>
    </div>
  );
}

function TaxStep({ form, errors, onChange, onSave }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="PAN Number" value={form.pan} onChange={e => onChange({ pan: e.target.value.toUpperCase().slice(0, 10) })} error={errors.pan} />
        <Input label="Aadhaar Number" value={form.aadhar} onChange={e => onChange({ aadhar: e.target.value.replace(/\D/g, '').slice(0, 12) })} error={errors.aadhar} />
        <Input label="UAN Number" value={form.uan} onChange={e => onChange({ uan: e.target.value.replace(/\D/g, '').slice(0, 12) })} error={errors.uan} />
        <Input label="PF Number" value={form.pfNumber} onChange={e => onChange({ pfNumber: e.target.value })} />
        <Input label="ESI Number" value={form.esiNumber} onChange={e => onChange({ esiNumber: e.target.value })} />
      </div>
      <div className="flex justify-end"><Button onClick={onSave}>Save</Button></div>
    </div>
  );
}

// Click-to-expand row used by Education/Employment/Nominee - previously an item once added had
// no way to be viewed again except a single truncated summary line with no edit affordance at
// all (no chevron, no dropdown) - clicking now expands the same item into its full editable form.
function ExpandableRow({ summary, subtitle, isOpen, onToggle, onDelete, children }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 bg-surface-3 cursor-pointer hover:bg-surface-4 transition-colors" onClick={onToggle}>
        <div className="min-w-0">
          <p className="text-sm text-text font-medium truncate">{summary}</p>
          {subtitle && <p className="text-[11px] text-text-secondary truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-text-secondary hover:text-danger"><Trash2 size={14} /></button>}
          {isOpen ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
        </div>
      </div>
      {isOpen && <div className="p-3 bg-surface-2 border-t border-border">{children}</div>}
    </div>
  );
}

// Multiple nominees, each with their own editable row - PF/insurance nominations commonly split
// across more than one person. Share % across all nominees should add up to 100, flagged (not
// blocked) if it doesn't, since a nominee can legitimately be added before the split is finalized.
function NomineeStep({ employeeId, items, setItems, onChange }) {
  const toast = useToast();
  // gender: null, not '' - there's no Gender input in this form at all, and the backend's Gender
  // field is a real Java enum; Jackson can't deserialize an empty string into an enum constant, so
  // every "Add Nominee" was silently failing with a generic "isn't in a valid format" error
  // regardless of what the user actually typed - the nominee was never saved, which is also why
  // the onboarding wizard correctly (if confusingly) kept reporting the section as incomplete.
  const emptyForm = { name: '', relation: '', dateOfBirth: '', sharePercentage: 100, gender: null };
  const [form, setForm] = useState(emptyForm);
  const [openId, setOpenId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const add = async () => {
    if (!form.name || !form.relation) { toast.error('Nominee name and relation are required'); return; }
    try {
      const created = await addNominee(employeeId, form);
      setItems(prev => [...prev, created]);
      setForm(emptyForm);
      onChange();
      toast.success('Nominee added');
    } catch (err) { toast.error(err.message || 'Failed to add nominee'); }
  };
  const startEdit = (item) => { setOpenId(item.id); setEditForm({ ...item }); };
  const toggle = (item) => { if (openId === item.id) setOpenId(null); else startEdit(item); };
  const saveEdit = async () => {
    try {
      const updated = await updateNominee(employeeId, openId, editForm);
      setItems(prev => prev.map(i => i.id === openId ? updated : i));
      setOpenId(null);
      onChange();
      toast.success('Nominee updated');
    } catch (err) { toast.error(err.message || 'Failed to update nominee'); }
  };
  const remove = async (id) => {
    try { await deleteNominee(employeeId, id); setItems(prev => prev.filter(i => i.id !== id)); onChange(); }
    catch (err) { toast.error(err.message || 'Failed to remove nominee'); }
  };

  const totalShare = items.reduce((s, i) => s + (i.sharePercentage || 0), 0);

  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-xs text-text-secondary">No nominees added yet.</p>}
      {items.length > 0 && (
        <p className={`text-xs ${totalShare === 100 ? 'text-success' : 'text-warning'}`}>Total share allocated: {totalShare}%{totalShare !== 100 ? ' (should add up to 100%)' : ''}</p>
      )}
      {items.map(item => (
        <ExpandableRow key={item.id}
          summary={item.name} subtitle={`${item.relation} · ${item.sharePercentage || 0}% share`}
          isOpen={openId === item.id}
          onToggle={() => toggle(item)}
          onDelete={() => remove(item.id)}>
          {editForm && openId === item.id && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nominee Name" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                <SelectWithOther label="Relation" value={editForm.relation} onChange={v => setEditForm(p => ({ ...p, relation: v }))} options={RELATION_OPTIONS} />
                <DatePicker label="Date of Birth" value={editForm.dateOfBirth} onChange={v => setEditForm(p => ({ ...p, dateOfBirth: v }))} max={new Date().toISOString().split('T')[0]} />
                <Input label="Share %" type="number" min="1" max="100" value={editForm.sharePercentage || ''} onChange={e => setEditForm(p => ({ ...p, sharePercentage: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setOpenId(null)}>Cancel</Button>
                <Button size="sm" onClick={saveEdit}>Save Changes</Button>
              </div>
            </div>
          )}
        </ExpandableRow>
      ))}
      <div className="grid grid-cols-2 gap-4 p-4 bg-surface-3 rounded-xl">
        <Input label="Nominee Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        <SelectWithOther label="Relation" value={form.relation} onChange={v => setForm(p => ({ ...p, relation: v }))} options={RELATION_OPTIONS} />
        <DatePicker label="Date of Birth" value={form.dateOfBirth} onChange={v => setForm(p => ({ ...p, dateOfBirth: v }))} max={new Date().toISOString().split('T')[0]} />
        <Input label="Share %" type="number" min="1" max="100" value={form.sharePercentage} onChange={e => setForm(p => ({ ...p, sharePercentage: parseInt(e.target.value) || 0 }))} />
      </div>
      <Button variant="secondary" icon={Plus} onClick={add}>Add Nominee</Button>
    </div>
  );
}

const EMPTY_EDUCATION = { degree: '', university: '', college: '', yearOfCompletion: '', gradeOrPercentage: '' };

function EducationStep({ employeeId, items, setItems, onChange }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_EDUCATION);
  const [openId, setOpenId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const add = async () => {
    if (!form.degree) { toast.error('Degree is required'); return; }
    try {
      const created = await addEducation(employeeId, { ...form, yearOfCompletion: form.yearOfCompletion ? parseInt(form.yearOfCompletion) : null });
      setItems(prev => [...prev, created]);
      setForm(EMPTY_EDUCATION);
      onChange();
      toast.success('Education added');
    } catch (err) { toast.error(err.message || 'Failed to add'); }
  };
  const startEdit = (item) => { setOpenId(item.id); setEditForm({ ...item }); };
  const toggle = (item) => { if (openId === item.id) setOpenId(null); else startEdit(item); };
  const saveEdit = async () => {
    try {
      const updated = await updateEducation(employeeId, openId, { ...editForm, yearOfCompletion: editForm.yearOfCompletion ? parseInt(editForm.yearOfCompletion) : null });
      setItems(prev => prev.map(i => i.id === openId ? updated : i));
      setOpenId(null);
      onChange();
      toast.success('Education updated');
    } catch (err) { toast.error(err.message || 'Failed to update'); }
  };
  const remove = async (id) => {
    try { await deleteEducation(employeeId, id); setItems(prev => prev.filter(i => i.id !== id)); onChange(); }
    catch (err) { toast.error(err.message || 'Failed to remove'); }
  };
  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-xs text-text-secondary">Nothing added yet.</p>}
      {items.map(item => (
        <ExpandableRow key={item.id}
          summary={item.degree} subtitle={`${item.university || item.college || ''}${item.yearOfCompletion ? ` · ${item.yearOfCompletion}` : ''}`}
          isOpen={openId === item.id} onToggle={() => toggle(item)} onDelete={() => remove(item.id)}>
          {editForm && openId === item.id && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Degree *" value={editForm.degree} onChange={e => setEditForm(p => ({ ...p, degree: e.target.value }))} placeholder="B.Tech" />
                <Input label="University" value={editForm.university || ''} onChange={e => setEditForm(p => ({ ...p, university: e.target.value }))} />
                <Input label="College" value={editForm.college || ''} onChange={e => setEditForm(p => ({ ...p, college: e.target.value }))} />
                <Input label="Year of Completion" type="number" value={editForm.yearOfCompletion || ''} onChange={e => setEditForm(p => ({ ...p, yearOfCompletion: e.target.value }))} />
                <Input label="Grade / Percentage" value={editForm.gradeOrPercentage || ''} onChange={e => setEditForm(p => ({ ...p, gradeOrPercentage: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setOpenId(null)}>Cancel</Button>
                <Button size="sm" onClick={saveEdit}>Save Changes</Button>
              </div>
            </div>
          )}
        </ExpandableRow>
      ))}
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

const EMPTY_EMPLOYMENT = { companyName: '', designation: '', joiningDate: '', relievingDate: '', skillsUsed: '', managerName: '', reasonForLeaving: '', location: '' };

function EmploymentStep({ employeeId, items, setItems, onChange }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_EMPLOYMENT);
  const [openId, setOpenId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const add = async () => {
    if (!form.companyName) { toast.error('Company name is required'); return; }
    try {
      const created = await addEmploymentHistory(employeeId, form);
      setItems(prev => [...prev, created]);
      setForm(EMPTY_EMPLOYMENT);
      onChange();
      toast.success('Employment history added');
    } catch (err) { toast.error(err.message || 'Failed to add'); }
  };
  const startEdit = (item) => { setOpenId(item.id); setEditForm({ ...item }); };
  const toggle = (item) => { if (openId === item.id) setOpenId(null); else startEdit(item); };
  const saveEdit = async () => {
    try {
      const updated = await updateEmploymentHistory(employeeId, openId, editForm);
      setItems(prev => prev.map(i => i.id === openId ? updated : i));
      setOpenId(null);
      onChange();
      toast.success('Employment history updated');
    } catch (err) { toast.error(err.message || 'Failed to update'); }
  };
  const remove = async (id) => {
    try { await deleteEmploymentHistory(employeeId, id); setItems(prev => prev.filter(i => i.id !== id)); onChange(); }
    catch (err) { toast.error(err.message || 'Failed to remove'); }
  };
  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-xs text-text-secondary">Nothing added yet.</p>}
      {items.map(item => (
        <ExpandableRow key={item.id}
          summary={`${item.designation || ''}${item.designation ? ' at ' : ''}${item.companyName}`}
          subtitle={item.joiningDate ? `${item.joiningDate} - ${item.relievingDate || 'Present'}` : ''}
          isOpen={openId === item.id} onToggle={() => toggle(item)} onDelete={() => remove(item.id)}>
          {editForm && openId === item.id && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Company Name *" value={editForm.companyName} onChange={e => setEditForm(p => ({ ...p, companyName: e.target.value }))} />
                <Input label="Designation" value={editForm.designation || ''} onChange={e => setEditForm(p => ({ ...p, designation: e.target.value }))} />
                <Input label="Joining Date" type="date" value={editForm.joiningDate || ''} onChange={e => setEditForm(p => ({ ...p, joiningDate: e.target.value }))} />
                <Input label="Relieving Date" type="date" value={editForm.relievingDate || ''} onChange={e => setEditForm(p => ({ ...p, relievingDate: e.target.value }))} />
                <Input label="Skills Used" value={editForm.skillsUsed || ''} onChange={e => setEditForm(p => ({ ...p, skillsUsed: e.target.value }))} />
                <Input label="Manager" value={editForm.managerName || ''} onChange={e => setEditForm(p => ({ ...p, managerName: e.target.value }))} />
                <Input label="Location" value={editForm.location || ''} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} />
                <Input label="Reason for Leaving" value={editForm.reasonForLeaving || ''} onChange={e => setEditForm(p => ({ ...p, reasonForLeaving: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setOpenId(null)}>Cancel</Button>
                <Button size="sm" onClick={saveEdit}>Save Changes</Button>
              </div>
            </div>
          )}
        </ExpandableRow>
      ))}
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
      {items.length === 0 ? (
        <p className="text-xs text-text-secondary">No documents uploaded yet - choose a document type below and upload your first file.</p>
      ) : (
        <div className="space-y-2">
          {items.map(d => (
            <div key={d.id} className="flex items-center justify-between px-3 py-2.5 bg-surface-3 rounded-lg">
              <div className="min-w-0">
                <p className="text-sm text-text font-medium truncate">{d.title || d.fileName}</p>
                <p className="text-[11px] text-text-secondary">{(d.category || '').replace(/_/g, ' ')}</p>
              </div>
              {d.fileUrl && (
                <button onClick={() => downloadFile(d.fileUrl, d.fileName)} className="text-primary hover:underline text-xs flex items-center gap-1 flex-shrink-0 ml-2"><Download size={13} /> View</button>
              )}
            </div>
          ))}
        </div>
      )}
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

// Small celebratory burst on mount - plain framer-motion elements (no new dependency), matching
// the particle-background technique already used on the Login page. Colored squares launch from
// the center and fall/fade out, purely decorative and skippable via prefers-reduced-motion.
function ConfettiBurst() {
  const pieces = useState(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: ['#FF6A00', '#58A6FF', '#A371F7', '#2EA043', '#D29922', '#F85149'][i % 6],
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 1.8 + Math.random() * 1.2,
    rotate: Math.random() * 360,
    drift: (Math.random() - 0.5) * 200,
  })))[0];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {pieces.map(p => (
        <motion.div key={p.id}
          initial={{ x: `${p.left}%`, y: '20%', opacity: 1, rotate: 0 }}
          animate={{ y: '110%', x: `calc(${p.left}% + ${p.drift}px)`, opacity: 0, rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{ position: 'absolute', width: 8, height: 8, background: p.color, borderRadius: 2 }}
        />
      ))}
    </div>
  );
}

function FinishStep({ completion, onGoDashboard }) {
  const [showConfetti, setShowConfetti] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShowConfetti(false), 3000); return () => clearTimeout(t); }, []);
  const allDone = completion.percent === 100;
  return (
    <div className="relative flex flex-col items-center text-center gap-4 py-8 overflow-hidden">
      {showConfetti && allDone && <ConfettiBurst />}
      <motion.div
        animate={allDone ? { scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] } : {}}
        transition={{ duration: 0.6, repeat: allDone ? 2 : 0, repeatDelay: 0.3 }}>
        <PartyPopper size={40} className="text-primary" />
      </motion.div>
      <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-lg font-semibold text-text">
        {allDone ? "You're all set! 🎉" : `You're ${completion.percent}% done`}
      </motion.h2>
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
