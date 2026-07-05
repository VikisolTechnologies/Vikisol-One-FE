import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft, Plus, Trash2, GraduationCap, Briefcase, Wrench, FileText, Landmark, Receipt, Users, PartyPopper } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Select } from '../../components/ui/Input';
import ProgressBar from '../../components/ui/ProgressBar';
import Loader from '../../components/ui/Loader';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { getMyProfile, updateEmployee } from '../../api/employees';
import { getEducation, addEducation, deleteEducation, getEmploymentHistory, addEmploymentHistory, deleteEmploymentHistory, getSkills, addSkill, deleteSkill, getProfileCompletion } from '../../api/onboarding';
import { uploadDocument, getMyDocuments } from '../../api/documents';

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

export default function OnboardingWizard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [completion, setCompletion] = useState({ percent: 0, missing: [] });

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
      Promise.all([
        getEducation(p.id), getEmploymentHistory(p.id), getSkills(p.id), getMyDocuments(),
      ]).then(([edu, emp, sk, docs]) => {
        setEducation(edu); setEmployment(emp); setSkills(sk); setDocuments(docs || []);
      }).finally(() => setLoading(false));
      refreshCompletion(p.id);
    }).catch(() => setLoading(false));
  }, [refreshCompletion]);

  if (loading) return <div className="flex items-center justify-center h-full min-h-[50vh]"><Loader /></div>;
  if (!profile) return null;

  const step = STEPS[stepIndex];
  const goNext = () => setStepIndex(i => Math.min(STEPS.length - 1, i + 1));
  const goBack = () => setStepIndex(i => Math.max(0, i - 1));

  const savePersonal = async (patch) => {
    const updated = { ...profile, ...patch };
    try {
      await updateEmployee(profile.id, updated);
      setProfile(updated);
      toast.success('Saved');
      refreshCompletion(profile.id);
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
            {step.key === 'personal' && <PersonalStep profile={profile} onSave={savePersonal} />}
            {step.key === 'education' && <EducationStep employeeId={profile.id} items={education} setItems={setEducation} onChange={() => refreshCompletion(profile.id)} />}
            {step.key === 'employment' && <EmploymentStep employeeId={profile.id} items={employment} setItems={setEmployment} onChange={() => refreshCompletion(profile.id)} />}
            {step.key === 'skills' && <SkillsStep employeeId={profile.id} items={skills} setItems={setSkills} onChange={() => refreshCompletion(profile.id)} />}
            {step.key === 'documents' && <DocumentsStep employeeId={profile.id} items={documents} setItems={setDocuments} onChange={() => refreshCompletion(profile.id)} />}
            {step.key === 'bank' && <BankStep profile={profile} onSave={savePersonal} />}
            {step.key === 'tax' && <TaxStep profile={profile} onSave={savePersonal} />}
            {step.key === 'nominee' && <NomineeStep profile={profile} onSave={savePersonal} />}
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

function PersonalStep({ profile, onSave }) {
  const [form, setForm] = useState({
    dob: profile.dob || '', gender: profile.gender || '', maritalStatus: profile.maritalStatus || '',
    nationality: profile.nationality || '', bloodGroup: profile.bloodGroup || '',
    address: profile.address || '', permanentAddress: profile.permanentAddress || '',
    personalEmail: profile.personalEmail || '', personalMobile: profile.personalMobile || '',
    languagesKnown: profile.languagesKnown || '',
    emergencyContactName: profile.emergencyContact?.name || '', emergencyContactPhone: profile.emergencyContact?.phone || '', emergencyContactRelation: profile.emergencyContact?.relation || '',
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Date of Birth" type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} />
        <Select label="Gender" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }]} />
        <Input label="Marital Status" value={form.maritalStatus} onChange={e => setForm(p => ({ ...p, maritalStatus: e.target.value }))} placeholder="Single / Married" />
        <Input label="Nationality" value={form.nationality} onChange={e => setForm(p => ({ ...p, nationality: e.target.value }))} placeholder="Indian" />
        <Input label="Blood Group" value={form.bloodGroup} onChange={e => setForm(p => ({ ...p, bloodGroup: e.target.value }))} placeholder="O+" />
        <Input label="Languages Known" value={form.languagesKnown} onChange={e => setForm(p => ({ ...p, languagesKnown: e.target.value }))} placeholder="English, Hindi, Telugu" />
        <Input label="Personal Email" type="email" value={form.personalEmail} onChange={e => setForm(p => ({ ...p, personalEmail: e.target.value }))} />
        <Input label="Personal Mobile" value={form.personalMobile} onChange={e => setForm(p => ({ ...p, personalMobile: e.target.value }))} />
        <Input label="Current Address" className="col-span-2" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
        <Input label="Permanent Address" className="col-span-2" value={form.permanentAddress} onChange={e => setForm(p => ({ ...p, permanentAddress: e.target.value }))} />
      </div>
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider pt-2">Emergency Contact</p>
      <div className="grid grid-cols-3 gap-4">
        <Input label="Name" value={form.emergencyContactName} onChange={e => setForm(p => ({ ...p, emergencyContactName: e.target.value }))} />
        <Input label="Phone" value={form.emergencyContactPhone} onChange={e => setForm(p => ({ ...p, emergencyContactPhone: e.target.value }))} />
        <Input label="Relation" value={form.emergencyContactRelation} onChange={e => setForm(p => ({ ...p, emergencyContactRelation: e.target.value }))} />
      </div>
      <div className="flex justify-end"><Button onClick={() => onSave(form)}>Save</Button></div>
    </div>
  );
}

function BankStep({ profile, onSave }) {
  const [form, setForm] = useState({ bankName: profile.bankName || '', bankAccount: profile.bankAccount || '', ifsc: profile.ifsc || '' });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Bank Name" value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} />
        <Input label="Account Number" value={form.bankAccount} onChange={e => setForm(p => ({ ...p, bankAccount: e.target.value }))} />
        <Input label="IFSC Code" value={form.ifsc} onChange={e => setForm(p => ({ ...p, ifsc: e.target.value }))} />
      </div>
      <div className="flex justify-end"><Button onClick={() => onSave(form)}>Save</Button></div>
    </div>
  );
}

function TaxStep({ profile, onSave }) {
  const [form, setForm] = useState({ pan: profile.pan || '', aadhar: profile.aadhar || '', uan: profile.uan || '', pfNumber: profile.pfNumber || '', esiNumber: profile.esiNumber || '' });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="PAN Number" value={form.pan} onChange={e => setForm(p => ({ ...p, pan: e.target.value }))} />
        <Input label="Aadhaar Number" value={form.aadhar} onChange={e => setForm(p => ({ ...p, aadhar: e.target.value }))} />
        <Input label="UAN Number" value={form.uan} onChange={e => setForm(p => ({ ...p, uan: e.target.value }))} />
        <Input label="PF Number" value={form.pfNumber} onChange={e => setForm(p => ({ ...p, pfNumber: e.target.value }))} />
        <Input label="ESI Number" value={form.esiNumber} onChange={e => setForm(p => ({ ...p, esiNumber: e.target.value }))} />
      </div>
      <div className="flex justify-end"><Button onClick={() => onSave(form)}>Save</Button></div>
    </div>
  );
}

function NomineeStep({ profile, onSave }) {
  const [form, setForm] = useState({
    nominee: {
      name: profile.nominee?.name || '', relation: profile.nominee?.relation || '',
      dob: profile.nominee?.dob || '', sharePercentage: profile.nominee?.sharePercentage || 100, gender: profile.nominee?.gender || '',
    },
  });
  const set = (k, v) => setForm(p => ({ nominee: { ...p.nominee, [k]: v } }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nominee Name" value={form.nominee.name} onChange={e => set('name', e.target.value)} />
        <Input label="Relation" value={form.nominee.relation} onChange={e => set('relation', e.target.value)} placeholder="Spouse / Parent / Child" />
        <Input label="Date of Birth" type="date" value={form.nominee.dob} onChange={e => set('dob', e.target.value)} />
        <Input label="Share %" type="number" min="1" max="100" value={form.nominee.sharePercentage} onChange={e => set('sharePercentage', parseInt(e.target.value) || 0)} />
      </div>
      <div className="flex justify-end"><Button onClick={() => onSave(form)}>Save</Button></div>
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
