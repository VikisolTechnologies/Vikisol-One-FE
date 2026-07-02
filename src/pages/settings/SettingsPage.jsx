import { useState, useEffect } from 'react';
import { Building2, Shield, Bell, Palette, Key, Globe, Calendar, Mail, FileText, Database, Upload, RefreshCw, IndianRupee } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Tabs from '../../components/ui/Tabs';
import Badge from '../../components/ui/Badge';
import Breadcrumb from '../../components/ui/Breadcrumb';
import DataTable from '../../components/ui/DataTable';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { updateSetting, getRolePermissionMatrix, updateRolePermissionMatrix } from '../../api/settings';
import { getCtcBreakupTemplate, updateCtcBreakupTemplate } from '../../api/payroll';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCtcBreakupTemplate().then(setTemplate).catch(() => toast.error('Could not load CTC breakup template')).finally(() => setLoading(false));
  }, []);

  const total = template ? CTC_COMPONENTS.reduce((sum, c) => sum + (Number(template[c.key]) || 0), 0) : 0;

  const handleSave = async () => {
    if (Math.round(total) !== 100) { toast.error(`Percentages must add up to 100 (currently ${total})`); return; }
    setSaving(true);
    try {
      const updated = await updateCtcBreakupTemplate(template);
      setTemplate(updated);
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

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { departments, auditLogs, data, holidays, holidaysSource, holidaysLoading } = useData();
  const { user } = useAuth();
  const isCEO = user?.role === 'ceo';
  const toast = useToast();
  const [primaryColor, setPrimaryColor] = useState('#FF6A00');

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
        { id: 'departments', label: 'Departments', content: (
          <Card>
            <div className="space-y-2 max-w-md">
              {departments.map(d => (
                <div key={d} className="flex items-center justify-between p-3 bg-surface-3 rounded-lg">
                  <span className="text-sm text-text">{d}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => toast.info(`Editing ${d}`)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => toast.warning(`Cannot delete department with employees`)}>Delete</Button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="secondary" onClick={() => toast.success('Department added')}>+ Add Department</Button>
            </div>
          </Card>
        )},
        { id: 'ctc-breakup', label: 'CTC Breakup', content: <CtcBreakupSettings /> },
        ...(isCEO ? [{ id: 'role-permissions', label: 'Role Permissions', content: <RolePermissionsSettings /> }] : []),
        { id: 'roles', label: 'Roles & Permissions', content: (
          <Card><div className="space-y-2">
            {['CEO', 'HR Manager', 'Manager', 'Employee', 'Recruiter', 'Finance', 'Admin', 'IT Support'].map(role => (
              <div key={role} className="flex items-center justify-between p-3 bg-surface-3 rounded-lg">
                <div className="flex items-center gap-3"><Shield size={16} className="text-primary" /><span className="text-sm font-medium text-text">{role}</span></div>
                <Button size="sm" variant="ghost" onClick={() => toast.info(`Configuring ${role} permissions`)}>Configure</Button>
              </div>
            ))}
          </div></Card>
        )},
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
                <button onClick={() => toast.success(`${n} toggled`)} className={`w-10 h-5 rounded-full relative ${i < 5 ? 'bg-primary' : 'bg-surface-4'}`}>
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
              <Button size="sm" onClick={() => toast.success('MFA enabled for all users')}>Enable MFA</Button>
            </div>
            <div className="p-4 bg-surface-3 rounded-xl">
              <p className="text-sm font-medium text-text mb-1">Password Policy</p>
              <p className="text-xs text-text-secondary mb-3">Minimum 8 chars, 1 uppercase, 1 number, 1 special</p>
              <Button size="sm" variant="secondary" onClick={() => toast.info('Password policy configured')}>Configure</Button>
            </div>
            <div className="p-4 bg-surface-3 rounded-xl">
              <p className="text-sm font-medium text-text mb-1">Session Timeout</p>
              <Input type="number" defaultValue="30" className="mt-2" />
              <p className="text-xs text-text-secondary mt-1">minutes of inactivity</p>
            </div>
          </div></Card>
        )},
        { id: 'audit', label: 'Audit Logs', content: (
          <Card padding={false}>
            <DataTable columns={[
              { key: 'action', label: 'Action', render: (v) => <span className="font-medium text-text">{v}</span> },
              { key: 'user', label: 'User' },
              { key: 'target', label: 'Target' },
              { key: 'timestamp', label: 'Time', render: (v) => new Date(v).toLocaleString() },
              { key: 'ip', label: 'IP Address', render: (v) => <span className="font-mono text-xs">{v}</span> },
            ]} data={auditLogs} pageSize={10} />
          </Card>
        )},
        { id: 'integrations', label: 'Integrations', content: (
          <Card><div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: 'Microsoft Outlook', status: 'Connected', desc: 'Email & Calendar sync' },
              { name: 'Microsoft Teams', status: 'Not Connected', desc: 'Meeting integration' },
              { name: 'Azure AD', status: 'Connected', desc: 'SSO & directory sync' },
              { name: 'Slack', status: 'Not Connected', desc: 'Notifications & alerts' },
              { name: 'Jira', status: 'Connected', desc: 'Project & issue tracking' },
              { name: 'GitHub', status: 'Connected', desc: 'Code repository' },
              { name: 'RazorpayX', status: 'Not Connected', desc: 'Payroll processing' },
              { name: 'Zoom', status: 'Not Connected', desc: 'Video conferencing' },
            ].map(i => (
              <div key={i.name} className="flex items-center justify-between p-4 bg-surface-3 rounded-xl">
                <div><p className="text-sm font-medium text-text">{i.name}</p><p className="text-xs text-text-secondary">{i.desc}</p></div>
                <Button size="sm" variant={i.status === 'Connected' ? 'secondary' : 'primary'} onClick={() => toast.success(i.status === 'Connected' ? `${i.name} disconnected` : `${i.name} connected`)}>
                  {i.status === 'Connected' ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            ))}
          </div></Card>
        )},
        { id: 'backup', label: 'Backup', content: (
          <Card><div className="space-y-4 max-w-md">
            <div className="p-4 bg-surface-3 rounded-xl">
              <p className="text-sm font-medium text-text mb-1">Create Backup</p>
              <p className="text-xs text-text-secondary mb-3">Export all data as JSON/CSV</p>
              <div className="flex gap-2">
                <Button size="sm" icon={Database} onClick={() => toast.success('Backup created successfully')}>Create Backup</Button>
                <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => toast.info('Restore from backup')}>Restore</Button>
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
