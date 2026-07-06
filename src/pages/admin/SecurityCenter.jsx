import { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Tabs from '../../components/ui/Tabs';
import Badge from '../../components/ui/Badge';
import Breadcrumb from '../../components/ui/Breadcrumb';
import DataTable from '../../components/ui/DataTable';
import { useToast } from '../../components/ui/Toast';
import {
  getAuthSettings, updateAuthSettings, getLoginHistory,
  getAllSessions, revokeSession, forceLogoutUser,
  getEmailTemplates, updateEmailTemplate, resetEmailTemplate,
} from '../../api/auth';

// Single administration hub for every authentication/security concern - consolidates what used
// to be two separate Settings tabs (Authentication, Login History) plus brand-new Active
// Sessions and Email Templates sections, so there is one place to look instead of scattered
// settings. Password History and Security Events are surfaced as read-only views rather than
// duplicating Login History's table, since neither has a distinct data source of its own today.
function Toggle({ checked, onChange, disabled }) {
  return (
    <button type="button" disabled={disabled} onClick={() => !disabled && onChange(!checked)}
      className={`w-12 h-6 rounded-full relative transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${checked ? 'bg-primary' : 'bg-surface-4'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'left-6' : 'left-0.5'}`} />
    </button>
  );
}

function AuthenticationSettings() {
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAuthSettings().then(setSettings).catch(() => toast.error('Could not load authentication settings')).finally(() => setLoading(false));
  }, []);

  const update = (patch) => setSettings(prev => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        EMAIL_PASSWORD_ENABLED: String(!!settings.emailPasswordLoginEnabled),
        MICROSOFT_ENABLED: String(!!settings.microsoftLoginEnabled),
        LOCKOUT_ENABLED: String(!!settings.accountLockoutEnabled),
        MAX_FAILED_ATTEMPTS: settings.maxFailedLoginAttempts !== '' && settings.maxFailedLoginAttempts != null ? String(settings.maxFailedLoginAttempts) : '',
        LOCKOUT_MINUTES: settings.lockoutDurationMinutes !== '' && settings.lockoutDurationMinutes != null ? String(settings.lockoutDurationMinutes) : '',
        PASSWORD_EXPIRY_DAYS: settings.passwordExpiryDays !== '' && settings.passwordExpiryDays != null ? String(settings.passwordExpiryDays) : '',
        SESSION_TIMEOUT_MINUTES: settings.sessionTimeoutMinutes !== '' && settings.sessionTimeoutMinutes != null ? String(settings.sessionTimeoutMinutes) : '',
        PASSWORD_MIN_LENGTH: settings.passwordMinLength !== '' && settings.passwordMinLength != null ? String(settings.passwordMinLength) : '8',
        PASSWORD_REQUIRE_UPPERCASE: String(!!settings.passwordRequireUppercase),
        PASSWORD_REQUIRE_LOWERCASE: String(!!settings.passwordRequireLowercase),
        PASSWORD_REQUIRE_NUMBER: String(!!settings.passwordRequireNumber),
        PASSWORD_REQUIRE_SPECIAL_CHAR: String(!!settings.passwordRequireSpecialChar),
        PASSWORD_HISTORY_COUNT: settings.passwordHistoryCount !== '' && settings.passwordHistoryCount != null ? String(settings.passwordHistoryCount) : '0',
      };
      const updated = await updateAuthSettings(payload);
      setSettings(updated || settings);
      toast.success('Authentication settings updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update authentication settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <Card><p className="text-sm text-text-secondary">Loading...</p></Card>;

  return (
    <Card>
      <div className="max-w-2xl space-y-5">
        <div>
          <p className="text-sm font-medium text-text">Authentication</p>
          <p className="text-xs text-text-secondary mt-1">Controls how employees can sign in.</p>
        </div>

        <div className="flex items-center justify-between p-4 bg-surface-3 rounded-xl">
          <div><p className="text-sm font-medium text-text">Email + Password Login</p><p className="text-xs text-text-secondary">Standard official-email/password sign-in</p></div>
          <Toggle checked={!!settings.emailPasswordLoginEnabled} onChange={(v) => update({ emailPasswordLoginEnabled: v })} />
        </div>

        <div className="flex items-center justify-between p-4 bg-surface-3 rounded-xl">
          <div>
            <p className="text-sm font-medium text-text">Microsoft Authentication</p>
            <p className="text-xs text-text-secondary">Sign in with a Microsoft/Azure AD account</p>
            {!settings.microsoftLoginConfigured && (
              <p className="text-[11px] text-warning mt-1">No effect until real Azure AD credentials are configured for this environment.</p>
            )}
          </div>
          <Toggle checked={!!settings.microsoftLoginEnabled} onChange={(v) => update({ microsoftLoginEnabled: v })} />
        </div>

        <div className="flex items-center justify-between p-4 bg-surface-3 rounded-xl opacity-60">
          <div><p className="text-sm font-medium text-text">Google Login</p><p className="text-xs text-text-secondary">Sign in with a Google Workspace account</p></div>
          <div className="flex items-center gap-2"><Badge variant="default">Coming soon</Badge><Toggle checked={false} onChange={() => {}} disabled /></div>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-sm font-medium text-text mb-1">Future MFA</p>
          <div className="flex items-center justify-between p-4 bg-surface-3 rounded-xl opacity-60">
            <div><p className="text-sm font-medium text-text">Multi-Factor Authentication</p><p className="text-xs text-text-secondary">Require a second factor at login - planned as a separate roadmap item, not part of this release</p></div>
            <div className="flex items-center gap-2"><Badge variant="default">Coming soon</Badge><Toggle checked={false} onChange={() => {}} disabled /></div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Authentication Settings'}</Button>
      </div>
    </Card>
  );
}

function PasswordPolicySettings() {
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAuthSettings().then(setSettings).catch(() => toast.error('Could not load password policy'));
  }, []);

  const update = (patch) => setSettings(prev => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateAuthSettings({
        PASSWORD_MIN_LENGTH: String(settings.passwordMinLength ?? 8),
        PASSWORD_REQUIRE_UPPERCASE: String(!!settings.passwordRequireUppercase),
        PASSWORD_REQUIRE_LOWERCASE: String(!!settings.passwordRequireLowercase),
        PASSWORD_REQUIRE_NUMBER: String(!!settings.passwordRequireNumber),
        PASSWORD_REQUIRE_SPECIAL_CHAR: String(!!settings.passwordRequireSpecialChar),
        PASSWORD_HISTORY_COUNT: String(settings.passwordHistoryCount ?? 0),
        PASSWORD_EXPIRY_DAYS: settings.passwordExpiryDays !== '' && settings.passwordExpiryDays != null ? String(settings.passwordExpiryDays) : '',
      });
      setSettings(updated || settings);
      toast.success('Password policy updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update password policy');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <Card><p className="text-sm text-text-secondary">Loading...</p></Card>;

  return (
    <Card>
      <div className="max-w-2xl space-y-5">
        <div>
          <p className="text-sm font-medium text-text">Password Policy</p>
          <p className="text-xs text-text-secondary mt-1">Applies to account activation, password resets, and password changes.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Minimum Length" type="number" min="6" value={settings.passwordMinLength ?? ''} onChange={e => update({ passwordMinLength: e.target.value })} />
          <Input label="Password History (block reuse of last N, 0 = off)" type="number" min="0" value={settings.passwordHistoryCount ?? ''} onChange={e => update({ passwordHistoryCount: e.target.value })} />
          <Input label="Password Expiry (days, blank = no expiry)" type="number" min="0" value={settings.passwordExpiryDays ?? ''} onChange={e => update({ passwordExpiryDays: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm text-text cursor-pointer"><input type="checkbox" checked={!!settings.passwordRequireUppercase} onChange={e => update({ passwordRequireUppercase: e.target.checked })} /> Uppercase required</label>
          <label className="flex items-center gap-2 text-sm text-text cursor-pointer"><input type="checkbox" checked={!!settings.passwordRequireLowercase} onChange={e => update({ passwordRequireLowercase: e.target.checked })} /> Lowercase required</label>
          <label className="flex items-center gap-2 text-sm text-text cursor-pointer"><input type="checkbox" checked={!!settings.passwordRequireNumber} onChange={e => update({ passwordRequireNumber: e.target.checked })} /> Number required</label>
          <label className="flex items-center gap-2 text-sm text-text cursor-pointer"><input type="checkbox" checked={!!settings.passwordRequireSpecialChar} onChange={e => update({ passwordRequireSpecialChar: e.target.checked })} /> Special character required</label>
        </div>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Password Policy'}</Button>
      </div>
    </Card>
  );
}

function AccountLockoutSettings() {
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAuthSettings().then(setSettings).catch(() => toast.error('Could not load lockout settings'));
  }, []);

  const update = (patch) => setSettings(prev => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateAuthSettings({
        LOCKOUT_ENABLED: String(!!settings.accountLockoutEnabled),
        MAX_FAILED_ATTEMPTS: String(settings.maxFailedLoginAttempts ?? 5),
        LOCKOUT_MINUTES: String(settings.lockoutDurationMinutes ?? 15),
      });
      setSettings(updated || settings);
      toast.success('Account lockout policy updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update lockout policy');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <Card><p className="text-sm text-text-secondary">Loading...</p></Card>;

  return (
    <Card>
      <div className="max-w-2xl space-y-5">
        <div>
          <p className="text-sm font-medium text-text">Account Lockout</p>
          <p className="text-xs text-text-secondary mt-1">Lock an account after repeated failed logins. An account can also be manually unlocked from the employee's Linked Accounts panel.</p>
        </div>
        <div className="flex items-center justify-between p-4 bg-surface-3 rounded-xl">
          <div><p className="text-sm font-medium text-text">Enable Account Lockout</p></div>
          <Toggle checked={!!settings.accountLockoutEnabled} onChange={(v) => update({ accountLockoutEnabled: v })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Max Failed Attempts" type="number" min="1" disabled={!settings.accountLockoutEnabled}
            value={settings.maxFailedLoginAttempts ?? ''} onChange={e => update({ maxFailedLoginAttempts: e.target.value })} />
          <Input label="Lockout Duration (minutes)" type="number" min="1" disabled={!settings.accountLockoutEnabled}
            value={settings.lockoutDurationMinutes ?? ''} onChange={e => update({ lockoutDurationMinutes: e.target.value })} />
        </div>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Lockout Policy'}</Button>
      </div>
    </Card>
  );
}

function SessionManagementSettings() {
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAuthSettings().then(setSettings).catch(() => toast.error('Could not load session settings'));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateAuthSettings({ SESSION_TIMEOUT_MINUTES: String(settings.sessionTimeoutMinutes ?? 60) });
      setSettings(updated || settings);
      toast.success('Session settings updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update session settings');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <Card><p className="text-sm text-text-secondary">Loading...</p></Card>;

  return (
    <Card>
      <div className="max-w-2xl space-y-5">
        <div>
          <p className="text-sm font-medium text-text">Session Management</p>
          <p className="text-xs text-text-secondary mt-1">
            A password change or reset signs a user out of every device immediately. Use the Active Sessions tab to revoke one specific device without affecting the rest.
          </p>
        </div>
        <Input label="Session Timeout (minutes of inactivity)" type="number" min="1"
          value={settings.sessionTimeoutMinutes ?? ''} onChange={e => setSettings(prev => ({ ...prev, sessionTimeoutMinutes: e.target.value }))} />
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </Card>
  );
}

const EVENT_LABELS = {
  LOGIN_SUCCESS: 'Login Success', LOGIN_FAILED: 'Login Failed', PASSWORD_RESET_REQUESTED: 'Password Reset Requested',
  PASSWORD_RESET_COMPLETED: 'Password Reset Completed', ACCOUNT_LOCKED: 'Account Locked', ACCOUNT_UNLOCKED: 'Account Unlocked',
  ACCOUNT_ACTIVATED: 'Account Activated', LOGOUT: 'Logout', SESSION_EXPIRED: 'Session Expired',
};

function LoginHistorySection({ filterTypes, emptyLabel }) {
  const toast = useToast();
  const [entries, setEntries] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getLoginHistory({ size: 200 }).then(setEntries).catch(() => { toast.error('Could not load login history'); setEntries([]); });
  }, []);

  if (!entries) return <Card><p className="text-sm text-text-secondary">Loading...</p></Card>;

  const scoped = filterTypes ? entries.filter(e => filterTypes.includes(e.eventType)) : entries;
  const filtered = scoped.filter(e => {
    const q = search.toLowerCase();
    if (!q) return true;
    return [e.userEmail, e.eventType, e.ipAddress].some(f => (f || '').toLowerCase().includes(q));
  });

  const columns = [
    { key: 'timestamp', label: 'Time', render: (v) => v ? new Date(v).toLocaleString() : '-' },
    { key: 'userEmail', label: 'User' },
    { key: 'eventType', label: 'Event', render: (v) => EVENT_LABELS[v] || v },
    { key: 'success', label: 'Result', render: (v) => <Badge variant={v ? 'success' : 'danger'} dot>{v ? 'Success' : 'Failure'}</Badge> },
    { key: 'ipAddress', label: 'IP Address', render: (v) => v || '-' },
    { key: 'userAgent', label: 'Browser/Device', render: (v) => <span className="text-xs text-text-secondary truncate block max-w-[220px]" title={v}>{v || '-'}</span> },
  ];

  return (
    <Card padding={false}>
      <div className="p-4 border-b border-border">
        <Input placeholder="Search by user, event, or IP..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-text-secondary p-6 text-center">{emptyLabel || 'No entries yet'}</p>
      ) : (
        <DataTable columns={columns} data={filtered} pageSize={15} />
      )}
    </Card>
  );
}

function ActiveSessionsSettings() {
  const toast = useToast();
  const [sessions, setSessions] = useState(null);

  const load = () => getAllSessions().then(setSessions).catch(() => { toast.error('Could not load active sessions'); setSessions([]); });
  useEffect(() => { load(); }, []);

  const handleRevoke = async (id) => {
    try {
      await revokeSession(id);
      toast.success('Session revoked');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to revoke session');
    }
  };

  const handleForceLogout = async (userEmail) => {
    try {
      await forceLogoutUser(userEmail);
      toast.success(`All sessions revoked for ${userEmail}`);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to force logout');
    }
  };

  if (!sessions) return <Card><p className="text-sm text-text-secondary">Loading...</p></Card>;

  const columns = [
    { key: 'userEmail', label: 'User' },
    { key: 'loginAt', label: 'Login Time', render: (v) => v ? new Date(v).toLocaleString() : '-' },
    { key: 'lastActivityAt', label: 'Last Activity', render: (v) => v ? new Date(v).toLocaleString() : '-' },
    { key: 'userAgent', label: 'Browser/Device', render: (v) => <span className="text-xs text-text-secondary truncate block max-w-[200px]" title={v}>{v || '-'}</span> },
    { key: 'ipAddress', label: 'IP Address', render: (v) => v || '-' },
    { key: 'current', label: 'Current', render: (v) => v ? <Badge variant="success">This session</Badge> : null },
    { key: 'actions', label: 'Actions', render: (_v, row) => (
      <div className="flex gap-2">
        <Button size="sm" variant="danger" onClick={() => handleRevoke(row.id)} disabled={row.current}>Revoke</Button>
        <Button size="sm" variant="secondary" onClick={() => handleForceLogout(row.userEmail)}>Force Logout User</Button>
      </div>
    )},
  ];

  return (
    <Card padding={false}>
      <div className="p-4 border-b border-border">
        <p className="text-sm font-medium text-text">Active Sessions</p>
        <p className="text-xs text-text-secondary mt-1">Every currently-issued, non-revoked login session across all users. Revoking a session immediately signs that device out on its next request.</p>
      </div>
      {sessions.length === 0 ? (
        <p className="text-sm text-text-secondary p-6 text-center">No active sessions</p>
      ) : (
        <DataTable columns={columns} data={sessions} pageSize={15} />
      )}
    </Card>
  );
}

const TEMPLATE_LABELS = {
  ACCOUNT_ACTIVATION: 'Account Activation', PASSWORD_RESET: 'Forgot Password', PASSWORD_CHANGED: 'Password Changed',
  ACCOUNT_LOCKED: 'Account Locked', ACCOUNT_UNLOCKED: 'Account Unlocked', WELCOME_EMAIL: 'Welcome Email',
};

function EmailTemplatesSettings() {
  const toast = useToast();
  const [templates, setTemplates] = useState(null);
  const [activeKey, setActiveKey] = useState(null);
  const [draft, setDraft] = useState({ subject: '', bodyHtml: '' });
  const [saving, setSaving] = useState(false);

  const load = () => getEmailTemplates().then(list => {
    setTemplates(list);
    if (!activeKey && list.length) selectTemplate(list[0]);
  }).catch(() => { toast.error('Could not load email templates'); setTemplates([]); });

  useEffect(() => { load(); }, []);

  const selectTemplate = (t) => {
    setActiveKey(t.templateKey);
    setDraft({ subject: t.subject, bodyHtml: t.bodyHtml });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmailTemplate(activeKey, draft.subject, draft.bodyHtml);
      toast.success('Email template updated');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to update email template');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetEmailTemplate(activeKey);
      toast.success('Reset to default content');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to reset template');
    }
  };

  if (!templates) return <Card><p className="text-sm text-text-secondary">Loading...</p></Card>;

  const active = templates.find(t => t.templateKey === activeKey);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card padding={false} className="md:col-span-1">
        <div className="p-3 space-y-1">
          {templates.map(t => (
            <button key={t.templateKey} onClick={() => selectTemplate(t)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeKey === t.templateKey ? 'bg-primary text-white' : 'hover:bg-surface-3 text-text'}`}>
              {TEMPLATE_LABELS[t.templateKey] || t.templateKey}
              {t.customized === 'true' && <span className="ml-1 text-[10px] opacity-70">(edited)</span>}
            </button>
          ))}
        </div>
      </Card>
      <Card className="md:col-span-3">
        {active && (
          <div className="space-y-4">
            <p className="text-xs text-text-secondary">
              Placeholders available: {'{{name}}'}, {'{{officialEmail}}'}, {'{{activationLink}}'}, {'{{resetLink}}'}, {'{{changedAt}}'}, {'{{lockoutMinutes}}'} (only those relevant to this email apply). Wrapped automatically in the Company Branding shell (logo/footer) at send time.
            </p>
            <Input label="Subject" value={draft.subject} onChange={e => setDraft(prev => ({ ...prev, subject: e.target.value }))} />
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Body (HTML)</label>
              <textarea rows={14} value={draft.bodyHtml} onChange={e => setDraft(prev => ({ ...prev, bodyHtml: e.target.value }))}
                className="w-full bg-surface-3 border border-border rounded-lg p-3 text-xs font-mono text-text focus:outline-none focus:border-primary" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Template'}</Button>
              <Button variant="secondary" onClick={handleReset}>Reset to Default</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function SecurityCenter() {
  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Administration' }, { label: 'Security Center' }]} />
      <div>
        <h1 className="text-xl font-bold text-text">Security Center</h1>
        <p className="text-sm text-text-secondary mt-1">Single hub for authentication, password policy, sessions, and security audit trails.</p>
      </div>
      <Tabs tabs={[
        { id: 'authentication', label: 'Authentication', content: <AuthenticationSettings /> },
        { id: 'password-policy', label: 'Password Policy', content: <PasswordPolicySettings /> },
        { id: 'account-lockout', label: 'Account Lockout', content: <AccountLockoutSettings /> },
        { id: 'session-management', label: 'Session Management', content: <SessionManagementSettings /> },
        { id: 'active-sessions', label: 'Active Sessions', content: <ActiveSessionsSettings /> },
        { id: 'login-history', label: 'Login History', content: <LoginHistorySection /> },
        { id: 'password-history', label: 'Password History', content: (
          <LoginHistorySection filterTypes={['PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED']} emptyLabel="No password reset activity yet" />
        )},
        { id: 'security-events', label: 'Security Events', content: (
          <LoginHistorySection filterTypes={['ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'LOGIN_FAILED']} emptyLabel="No security events yet" />
        )},
        { id: 'email-templates', label: 'Email Templates', content: <EmailTemplatesSettings /> },
      ]} />
    </div>
  );
}
