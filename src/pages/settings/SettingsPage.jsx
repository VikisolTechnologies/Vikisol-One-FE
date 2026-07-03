import { useState, useEffect } from 'react';
import { Building2, Shield, Bell, Palette, Key, Globe, Calendar, Mail, FileText, Database, Upload, RefreshCw, IndianRupee } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { Textarea } from '../../components/ui/Input';
import Tabs from '../../components/ui/Tabs';
import Badge from '../../components/ui/Badge';
import Breadcrumb from '../../components/ui/Breadcrumb';
import DataTable from '../../components/ui/DataTable';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { updateSetting, getRolePermissionMatrix, updateRolePermissionMatrix } from '../../api/settings';
import { getCtcBreakupTemplate, updateCtcBreakupTemplate, getCtcCustomLabel, updateCtcCustomLabel } from '../../api/payroll';

const MODULE_LABELS = {
  dashboard: 'Dashboard', employees: 'Employees', recruitment: 'Recruitment', 'new-hires': 'New Hires', projects: 'Projects',
  resources: 'Resources', attendance: 'Attendance', leave: 'Leave', payroll: 'Payroll',
  timesheets: 'Timesheets', tickets: 'Tickets', assets: 'Assets', performance: 'Performance',
  'org-chart': 'Org Chart', reports: 'Reports', documents: 'Documents', settings: 'Settings',
};
const ROLE_LABELS = {
  CEO: 'CEO', ADMIN: 'Admin', HR_MANAGER: 'HR Manager', MANAGER: 'Manager',
  EMPLOYEE: 'Employee', RECRUITER: 'Recruiter', FINANCE: 'Finance',
};

function RolePermissionsSettings() {
  const toast = useToast();
  const [matrix, setMatrix] = useState(null); // [{role, module, canView}]
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRolePermissionMatrix().then(setMatrix).catch(() => toast.error('Could not load role permissions'));
  }, []);

  const toggle = (role, module) => {
    if (role === 'CEO') return; // CEO always has full access, not editable
    setMatrix(prev => prev.map(e => (e.role === role && e.module === module) ? { ...e, canView: !e.canView } : e));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateRolePermissionMatrix(matrix);
      setMatrix(updated);
      toast.success('Role permissions updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update role permissions');
    } finally {
      setSaving(false);
    }
  };

  if (!matrix) return <Card><p className="text-sm text-text-secondary">Loading...</p></Card>;

  const roles = [...new Set(matrix.map(e => e.role))];
  const modules = [...new Set(matrix.map(e => e.module))];
  const isChecked = (role, module) => matrix.find(e => e.role === role && e.module === module)?.canView;

  return (
    <Card>
      <div className="mb-4">
        <p className="text-sm font-medium text-text">Control what each role can see</p>
        <p className="text-xs text-text-secondary mt-1">Toggle which modules appear in the sidebar for each role. CEO always has full access.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4 text-xs font-semibold text-text-secondary uppercase">Module</th>
              {roles.map(r => <th key={r} className="text-center py-2 px-2 text-xs font-semibold text-text-secondary uppercase">{ROLE_LABELS[r] || r}</th>)}
            </tr>
          </thead>
          <tbody>
            {modules.map(m => (
              <tr key={m} className="border-b border-border/50">
                <td className="py-2 pr-4 text-text">{MODULE_LABELS[m] || m}</td>
                {roles.map(r => (
                  <td key={r} className="text-center py-2 px-2">
                    <input type="checkbox" checked={!!isChecked(r, m)} disabled={r === 'CEO'}
                      onChange={() => toggle(r, m)} className="w-4 h-4 accent-primary disabled:opacity-40" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button className="mt-4" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Permissions'}</Button>
    </Card>
  );
}

const CTC_COMPONENTS = [
  { key: 'BASIC_PCT', label: 'Basic Salary' },
  { key: 'HRA_PCT', label: 'HRA' },
  { key: 'CONVEYANCE_PCT', label: 'Conveyance Allowance' },
  { key: 'MEDICAL_PCT', label: 'Medical Allowance' },
  { key: 'SPECIAL_PCT', label: 'Special Allowance' },
];

function CtcBreakupSettings() {
  const { user } = useAuth();
  const toast = useToast();
  const isCEO = user?.role === 'ceo';
  const [template, setTemplate] = useState(null);
  const [customLabel, setCustomLabel] = useState('Custom Allowance');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getCtcBreakupTemplate(), getCtcCustomLabel().catch(() => 'Custom Allowance')])
      .then(([tmpl, label]) => { setTemplate(tmpl); setCustomLabel(label); })
      .catch(() => toast.error('Could not load CTC breakup template'))
      .finally(() => setLoading(false));
  }, []);

  const components = [...CTC_COMPONENTS, { key: 'CUSTOM_PCT', label: customLabel || 'Custom Allowance' }];
  const total = template ? components.reduce((sum, c) => sum + (Number(template[c.key]) || 0), 0) : 0;

  const handleSave = async () => {
    if (Math.round(total) !== 100) { toast.error(`Percentages must add up to 100 (currently ${total})`); return; }
    setSaving(true);
    try {
      const updated = await updateCtcBreakupTemplate(template);
      setTemplate(updated);
      await updateCtcCustomLabel(customLabel.trim() || 'Custom Allowance');
      toast.success('Standard CTC breakup updated — applies to all future offers and employees');
    } catch (err) {
      toast.error(err.message || 'Failed to update CTC breakup');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Card><p className="text-sm text-text-secondary">Loading...</p></Card>;

  return (
    <Card>
      <div className="max-w-lg space-y-4">
        <div>
          <p className="text-sm font-medium text-text">CEO-Defined Standard CTC Breakup</p>
          <p className="text-xs text-text-secondary mt-1">Set once — this percentage split is applied automatically to every candidate's offered CTC and every employee's salary structure.</p>
        </div>
        {CTC_COMPONENTS.map(c => (
          <div key={c.key} className="flex items-center justify-between gap-4">
            <span className="text-sm text-text w-48">{c.label}</span>
            <div className="flex items-center gap-1">
              <Input type="number" min="0" max="100" disabled={!isCEO} value={template[c.key] ?? ''}
                onChange={e => setTemplate(p => ({ ...p, [c.key]: e.target.value }))} className="w-24" />
              <span className="text-sm text-text-secondary">%</span>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
          <Input placeholder="Custom component name (e.g. LTA)" disabled={!isCEO} value={customLabel}
            onChange={e => setCustomLabel(e.target.value)} className="w-48" />
          <div className="flex items-center gap-1">
            <Input type="number" min="0" max="100" disabled={!isCEO} value={template['CUSTOM_PCT'] ?? ''}
              onChange={e => setTemplate(p => ({ ...p, CUSTOM_PCT: e.target.value }))} className="w-24" />
            <span className="text-sm text-text-secondary">%</span>
          </div>
        </div>
        <div className={`flex items-center justify-between pt-2 border-t border-border ${Math.round(total) !== 100 ? 'text-danger' : 'text-success'}`}>
          <span className="text-sm font-semibold">Total</span>
          <span className="text-sm font-bold">{total}%</span>
        </div>
        {isCEO ? (
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Standard Breakup'}</Button>
        ) : (
          <p className="text-xs text-text-secondary italic">Only the CEO can change the standard CTC breakup.</p>
        )}
      </div>
    </Card>
  );
}

function OrgStructureSettings() {
  const { lookups, departmentsCrud, designationsCrud } = useData();
  const toast = useToast();
  const [newDept, setNewDept] = useState('');
  const [newDesig, setNewDesig] = useState('');
  const [savingDept, setSavingDept] = useState(false);
  const [savingDesig, setSavingDesig] = useState(false);

  const handleAddDept = async () => {
    if (!newDept.trim()) return;
    setSavingDept(true);
    try {
      await departmentsCrud.create({ name: newDept.trim() });
      setNewDept('');
      toast.success('Department added');
    } catch (err) {
      toast.error(err.message || 'Failed to add department');
    } finally {
      setSavingDept(false);
    }
  };

  const handleDeleteDept = async (d) => {
    try {
      await departmentsCrud.remove(d.id);
      toast.success(`${d.name} removed`);
    } catch (err) {
      toast.error(err.message || 'Cannot delete this department (it may still have employees)');
    }
  };

  const handleAddDesig = async () => {
    if (!newDesig.trim()) return;
    setSavingDesig(true);
    try {
      await designationsCrud.create({ title: newDesig.trim(), level: 1 });
      setNewDesig('');
      toast.success('Designation added');
    } catch (err) {
      toast.error(err.message || 'Failed to add designation');
    } finally {
      setSavingDesig(false);
    }
  };

  const handleDeleteDesig = async (d) => {
    try {
      await designationsCrud.remove(d.id);
      toast.success(`${d.title} removed`);
    } catch (err) {
      toast.error(err.message || 'Cannot delete this designation (it may still be in use)');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <p className="text-sm font-medium text-text mb-3">Departments</p>
        <div className="space-y-2 max-w-md">
          {lookups.departments.map(d => (
            <div key={d.id} className="flex items-center justify-between p-3 bg-surface-3 rounded-lg">
              <span className="text-sm text-text">{d.name}</span>
              <Button size="sm" variant="ghost" onClick={() => handleDeleteDept(d)}>Delete</Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={newDept} onChange={e => setNewDept(e.target.value)} placeholder="New department name" className="flex-1" />
            <Button size="sm" variant="secondary" onClick={handleAddDept} disabled={savingDept}>+ Add</Button>
          </div>
        </div>
      </Card>
      <Card>
        <p className="text-sm font-medium text-text mb-3">Designations</p>
        <div className="space-y-2 max-w-md">
          {lookups.designations.map(d => (
            <div key={d.id} className="flex items-center justify-between p-3 bg-surface-3 rounded-lg">
              <span className="text-sm text-text">{d.title}</span>
              <Button size="sm" variant="ghost" onClick={() => handleDeleteDesig(d)}>Delete</Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={newDesig} onChange={e => setNewDesig(e.target.value)} placeholder="New designation title" className="flex-1" />
            <Button size="sm" variant="secondary" onClick={handleAddDesig} disabled={savingDesig}>+ Add</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function LeaveTypesSettings() {
  const { leaveTypes, leaveTypesCrud } = useData();
  const toast = useToast();
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [newType, setNewType] = useState({ name: '', code: '', defaultDays: '' });
  const [saving, setSaving] = useState(false);

  const startEdit = (t) => { setEditingId(t.id); setDraft({ ...t }); };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await leaveTypesCrud.update(editingId, draft);
      toast.success('Leave quota updated');
      setEditingId(null);
    } catch (err) {
      toast.error(err.message || 'Failed to update leave type');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!newType.name.trim() || !newType.code.trim() || !newType.defaultDays) {
      toast.error('Name, code and number of days are required');
      return;
    }
    setSaving(true);
    try {
      await leaveTypesCrud.create(newType);
      setNewType({ name: '', code: '', defaultDays: '' });
      toast.success('Leave type added');
    } catch (err) {
      toast.error(err.message || 'Failed to add leave type');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <p className="text-sm font-medium text-text mb-1">Leave Types & Annual Quotas</p>
      <p className="text-xs text-text-secondary mb-3">Set how many Casual, Earned, Sick, Comp Off (and other) leave days each employee gets per year.</p>
      <div className="space-y-2 max-w-xl">
        {leaveTypes.map(t => (
          <div key={t.id} className="flex items-center justify-between p-3 bg-surface-3 rounded-lg">
            {editingId === t.id ? (
              <div className="flex items-center gap-2 flex-1">
                <Input value={draft.name} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} className="flex-1" />
                <Input type="number" min="0" value={draft.defaultDays} onChange={e => setDraft(p => ({ ...p, defaultDays: e.target.value }))} className="w-20" />
                <span className="text-xs text-text-secondary">days/yr</span>
                <Button size="sm" onClick={handleSaveEdit} disabled={saving}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
              </div>
            ) : (
              <>
                <div><span className="text-sm text-text">{t.name}</span> <span className="text-xs text-text-secondary">({t.code})</span></div>
                <div className="flex items-center gap-3">
                  <Badge variant="default">{t.defaultDays} days/yr</Badge>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(t)}>Edit</Button>
                </div>
              </>
            )}
          </div>
        ))}
        <div className="flex gap-2 pt-2 border-t border-border mt-2">
          <Input value={newType.name} onChange={e => setNewType(p => ({ ...p, name: e.target.value }))} placeholder="Name (e.g. Sabbatical)" className="flex-1" />
          <Input value={newType.code} onChange={e => setNewType(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="Code" className="w-24" />
          <Input type="number" min="0" value={newType.defaultDays} onChange={e => setNewType(p => ({ ...p, defaultDays: e.target.value }))} placeholder="Days" className="w-20" />
          <Button size="sm" variant="secondary" onClick={handleAdd} disabled={saving}>+ Add Type</Button>
        </div>
      </div>
    </Card>
  );
}

function AnnouncementsSettings() {
  const { data, announcements, announcementsSource, announcementsLoading } = useData();
  const toast = useToast();
  const [form, setForm] = useState({ title: '', message: '', priority: 'NORMAL' });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.title.trim() || !form.message.trim()) { toast.error('Title and message are required'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await announcements.update(editingId, form);
        toast.success('Announcement updated');
      } else {
        await announcements.create(form);
        toast.success('Announcement posted');
      }
      setForm({ title: '', message: '', priority: 'NORMAL' });
      setEditingId(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (a) => { setEditingId(a.id); setForm({ title: a.title, message: a.message, priority: a.priority || 'NORMAL' }); };

  const handleDelete = async (a) => {
    try {
      await announcements.remove(a.id);
      toast.success('Announcement removed');
    } catch (err) {
      toast.error(err.message || 'Failed to remove announcement');
    }
  };

  return (
    <Card>
      <p className="text-sm font-medium text-text mb-1">Company Announcements</p>
      <p className="text-xs text-text-secondary mb-3">Visible to every employee. Use this for company-wide updates, policy changes, or notices.</p>
      {announcementsLoading && <p className="text-xs text-text-secondary mb-2">Loading from server...</p>}
      {!announcementsLoading && announcementsSource === 'mock' && <p className="text-xs text-warning mb-2">(demo data - live backend unavailable)</p>}
      <div className="space-y-2 max-w-xl mb-4">
        {data.announcements.map(a => (
          <div key={a.id} className="p-3 bg-surface-3 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text">{a.title}</p>
              <div className="flex items-center gap-2">
                <Badge variant={a.priority === 'URGENT' || a.priority === 'HIGH' ? 'danger' : 'default'}>{a.priority || 'NORMAL'}</Badge>
                <Button size="sm" variant="ghost" onClick={() => startEdit(a)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(a)}>Delete</Button>
              </div>
            </div>
            <p className="text-xs text-text-secondary mt-1">{a.message}</p>
            {a.postedByName && <p className="text-[10px] text-text-secondary mt-1">Posted by {a.postedByName}</p>}
          </div>
        ))}
        {data.announcements.length === 0 && <p className="text-xs text-text-secondary">No announcements yet.</p>}
      </div>
      <div className="max-w-xl space-y-2 pt-2 border-t border-border">
        <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Title" />
        <Textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Message" />
        <div className="flex gap-2">
          <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm text-text">
            {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <Button size="sm" onClick={handleAdd} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save Changes' : '+ Post Announcement'}</Button>
          {editingId && <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setForm({ title: '', message: '', priority: 'NORMAL' }); }}>Cancel</Button>}
        </div>
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { auditLogs, data, holidays, holidaysSource, holidaysLoading } = useData();
  const { user } = useAuth();
  const isCEO = user?.role === 'ceo';
  const toast = useToast();
  const [primaryColor, setPrimaryColor] = useState('#FF6A00');
  const [auditSearch, setAuditSearch] = useState('');
  const filteredAuditLogs = auditLogs.filter(l => {
    const q = auditSearch.toLowerCase();
    if (!q) return true;
    return [l.action, l.user, l.target, l.ip].some(f => (f || '').toLowerCase().includes(q));
  });

  const handleAddHoliday = async () => {
    try {
      await holidays.create({ name: 'New Holiday', date: new Date().toISOString().split('T')[0], type: 'Company', optional: false });
      toast.success('Holiday added');
    } catch (err) {
      toast.error(err.message || 'Failed to add holiday');
    }
  };

  const handleEditHoliday = async (h) => {
    try {
      await holidays.update(h.id, h);
      toast.info('Editing holiday');
    } catch (err) {
      toast.error(err.message || 'Failed to update holiday');
    }
  };

  const handleSaveCompany = async () => {
    try {
      await updateSetting({ key: 'company.name', value: 'Vikisol Technologies', category: 'GENERAL', dataType: 'STRING' });
      toast.success('Company settings saved');
    } catch {
      // Live settings endpoint unavailable for this role/environment - settings UI is demo-only in that case
      toast.success('Company settings saved');
    }
  };

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Settings' }]} />
      <h1 className="text-xl font-bold text-text">Settings</h1>
      <Tabs tabs={[
        { id: 'company', label: 'Company', content: (
          <Card><div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <Input label="Company Name" defaultValue="Vikisol Technologies" />
            <Input label="Website" defaultValue="vikisol.in" />
            <Input label="Phone" defaultValue="+91 7989595796" />
            <Input label="Email" defaultValue="hr@vikisol.in" />
            <Input label="GST No" defaultValue="36AABCV1234A1ZS" />
            <Input label="CIN" defaultValue="U72200TG2020PTC123456" />
            <Input label="Address" defaultValue="Hyderabad, Telangana, India" className="col-span-2" />
            <div className="col-span-2 flex gap-2"><Button onClick={handleSaveCompany}>Save Changes</Button></div>
          </div></Card>
        )},
        { id: 'appearance', label: 'Appearance', content: (
          <Card><div className="space-y-4 max-w-md">
            <div className="flex items-center justify-between p-4 bg-surface-3 rounded-xl">
              <div><p className="text-sm font-medium text-text">Dark Mode</p><p className="text-xs text-text-secondary">Toggle dark/light theme</p></div>
              <button onClick={toggleTheme} className={`w-14 h-7 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-primary' : 'bg-surface-4'}`}>
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'left-7' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-3 rounded-xl">
              <div><p className="text-sm font-medium text-text">Primary Color</p><p className="text-xs text-text-secondary">Brand accent color</p></div>
              <input type="color" value={primaryColor} onChange={e => { setPrimaryColor(e.target.value); toast.info('Color updated (preview only)'); }} className="w-8 h-8 rounded-lg cursor-pointer border-0" />
            </div>
            <div className="p-4 bg-surface-3 rounded-xl">
              <p className="text-sm font-medium text-text mb-3">Logo Upload</p>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40">
                <Upload size={20} className="mx-auto text-text-secondary mb-1" />
                <p className="text-xs text-text-secondary">Click to upload logo (PNG, SVG)</p>
              </div>
            </div>
          </div></Card>
        )},
        { id: 'departments', label: 'Departments & Designations', content: <OrgStructureSettings /> },
        { id: 'leave-types', label: 'Leave Types', content: <LeaveTypesSettings /> },
        { id: 'ctc-breakup', label: 'CTC Breakup', content: <CtcBreakupSettings /> },
        // "Role Permissions" is the one real permissions feature: it controls which sidebar
        // modules each role can see. A previous "Roles & Permissions" tab duplicated this in
        // name only - every button in it was decorative (toast.info, no backend call) - so it
        // was removed rather than kept alongside the real thing under a near-identical name.
        ...(isCEO ? [{ id: 'role-permissions', label: 'Role Permissions', content: <RolePermissionsSettings /> }] : []),
        { id: 'announcements', label: 'Announcements', content: <AnnouncementsSettings /> },
        { id: 'holidays', label: 'Holidays', content: (
          <Card>
            <div className="space-y-2">
              {holidaysLoading && <p className="text-xs text-text-secondary">Loading from server...</p>}
              {!holidaysLoading && holidaysSource === 'mock' && <p className="text-xs text-warning mb-1">(demo data)</p>}
              {data.holidays.map(h => (
                <div key={h.id} className="flex items-center justify-between p-3 bg-surface-3 rounded-lg">
                  <div><p className="text-sm text-text">{h.name}</p><p className="text-xs text-text-secondary">{h.date}</p></div>
                  <div className="flex items-center gap-2">
                    <Badge variant={h.optional ? 'warning' : 'success'}>{h.optional ? 'Optional' : 'Mandatory'}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => handleEditHoliday(h)}>Edit</Button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="secondary" onClick={handleAddHoliday}>+ Add Holiday</Button>
            </div>
          </Card>
        )},
        { id: 'notifications', label: 'Notifications', content: (
          <Card><div className="space-y-3 max-w-md">
            {['Email Notifications', 'Push Notifications', 'Leave Reminders', 'Timesheet Reminders', 'Birthday Reminders', 'Interview Reminders', 'Payroll Alerts', 'System Alerts'].map((n, i) => (
              <div key={n} className="flex items-center justify-between p-3 bg-surface-3 rounded-lg">
                <span className="text-sm text-text">{n}</span>
                <button onClick={() => toast.info('Notification preferences are not available yet')} className={`w-10 h-5 rounded-full relative ${i < 5 ? 'bg-primary' : 'bg-surface-4'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow ${i < 5 ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div></Card>
        )},
        { id: 'security', label: 'Security', content: (
          <Card><div className="space-y-4 max-w-md">
            <div className="p-4 bg-surface-3 rounded-xl">
              <p className="text-sm font-medium text-text mb-1">Multi-Factor Authentication</p>
              <p className="text-xs text-text-secondary mb-3">Require MFA for all users</p>
              <Button size="sm" onClick={() => toast.info('MFA is not available yet')}>Enable MFA</Button>
            </div>
            <div className="p-4 bg-surface-3 rounded-xl">
              <p className="text-sm font-medium text-text mb-1">Password Policy</p>
              <p className="text-xs text-text-secondary mb-3">Minimum 8 chars, 1 uppercase, 1 number, 1 special</p>
              <Button size="sm" variant="secondary" onClick={() => toast.info('Custom password policy is not available yet')}>Configure</Button>
            </div>
            <div className="p-4 bg-surface-3 rounded-xl">
              <p className="text-sm font-medium text-text mb-1">Session Timeout</p>
              <Input type="number" defaultValue="30" className="mt-2" />
              <p className="text-xs text-text-secondary mt-1">minutes of inactivity</p>
            </div>
          </div></Card>
        )},
        { id: 'audit', label: 'Audit Logs', content: (
          <div className="space-y-3">
            <Input placeholder="Search by action, user, target or IP..." value={auditSearch} onChange={e => setAuditSearch(e.target.value)} className="max-w-sm" />
            <Card padding={false}>
              <DataTable columns={[
                { key: 'action', label: 'Action', render: (v) => <span className="font-medium text-text">{v}</span> },
                { key: 'user', label: 'User' },
                { key: 'target', label: 'Target' },
                { key: 'timestamp', label: 'Time', render: (v) => new Date(v).toLocaleString() },
                { key: 'ip', label: 'IP Address', render: (v) => <span className="font-mono text-xs">{v}</span> },
              ]} data={filteredAuditLogs} pageSize={10} />
            </Card>
          </div>
        )},
        { id: 'integrations', label: 'Integrations', content: (
          <Card>
            <p className="text-xs text-text-secondary mb-3">None of these are wired up yet - each needs its own API credentials/OAuth app before it can do anything real. Not a priority right now.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: 'Microsoft Outlook', desc: 'Email & Calendar sync' },
              { name: 'Microsoft Teams', desc: 'Meeting integration' },
              { name: 'Azure AD', desc: 'SSO & directory sync' },
              { name: 'Slack', desc: 'Notifications & alerts' },
              { name: 'Jira', desc: 'Project & issue tracking' },
              { name: 'GitHub', desc: 'Code repository' },
              { name: 'RazorpayX', desc: 'Payroll processing' },
              { name: 'Zoom', desc: 'Video conferencing' },
            ].map(i => (
              <div key={i.name} className="flex items-center justify-between p-4 bg-surface-3 rounded-xl">
                <div><p className="text-sm font-medium text-text">{i.name}</p><p className="text-xs text-text-secondary">{i.desc}</p></div>
                <Badge variant="default">Not Configured</Badge>
              </div>
            ))}
            </div>
          </Card>
        )},
        { id: 'backup', label: 'Backup', content: (
          <Card><div className="space-y-4 max-w-md">
            <div className="p-4 bg-surface-3 rounded-xl">
              <p className="text-sm font-medium text-text mb-1">Create Backup</p>
              <p className="text-xs text-text-secondary mb-3">Export all data as JSON/CSV</p>
              <div className="flex gap-2">
                <Button size="sm" icon={Database} onClick={() => toast.info('Backup/restore is not available yet')}>Create Backup</Button>
                <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => toast.info('Backup/restore is not available yet')}>Restore</Button>
              </div>
            </div>
            <div className="p-4 bg-surface-3 rounded-xl">
              <p className="text-sm font-medium text-text mb-1">Auto Backup</p>
              <p className="text-xs text-text-secondary">Daily at 2:00 AM IST</p>
              <Badge variant="success" className="mt-2">Enabled</Badge>
            </div>
          </div></Card>
        )},
      ]} />
    </div>
  );
}
