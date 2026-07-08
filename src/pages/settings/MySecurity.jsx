import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Monitor, LogOut, Key, History, Copy, AlertTriangle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import {
  getMySessions, revokeSession, revokeAllMySessions, getMyLoginHistory,
  getMfaStatus, startMfaSetup, enableMfa, disableMfa, getAuthSettings,
} from '../../api/auth';

// The personal counterpart to the admin-only Security Center - every role gets this, not just
// CEO/HR/Admin. Reuses the Active Sessions / Login History APIs that already existed and were
// wired to the admin panel, plus the new self-service MFA enrollment flow.
function DevicesCard() {
  const toast = useToast();
  const confirm = useConfirm();
  const [sessions, setSessions] = useState(null);

  const load = () => getMySessions().then(setSessions).catch(() => { toast.error('Could not load your sessions'); setSessions([]); });
  useEffect(() => { load(); }, []);

  const handleRevoke = async (id) => {
    try {
      await revokeSession(id);
      toast.success('Device signed out');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to sign out that device');
    }
  };

  const handleRevokeAll = async () => {
    const ok = await confirm({ title: 'Sign out all other devices?', message: 'Every other device currently signed in will need to log in again. This device stays signed in.', type: 'warning', confirmText: 'Sign out others' });
    if (!ok) return;
    try {
      await revokeAllMySessions();
      toast.success('Signed out of all other devices');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to sign out other devices');
    }
  };

  return (
    <Card title="Your Devices" subtitle="Everywhere you're currently signed in" action={<Monitor size={16} className="text-text-secondary" />}>
      {sessions === null ? (
        <p className="text-sm text-text-secondary">Loading...</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-text-secondary">No active sessions found.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 bg-surface-3 rounded-lg">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text truncate">{s.device || 'Unknown device'}</p>
                  {s.current && <Badge variant="success">This device</Badge>}
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  {s.ipAddress || 'Unknown IP'} · Last active {s.lastActivityAt ? new Date(s.lastActivityAt).toLocaleString() : '-'}
                </p>
              </div>
              {!s.current && (
                <Button size="sm" variant="ghost" icon={LogOut} onClick={() => handleRevoke(s.id)} className="text-danger flex-shrink-0">Sign out</Button>
              )}
            </div>
          ))}
        </div>
      )}
      {sessions && sessions.length > 1 && (
        <div className="mt-4 pt-4 border-t border-border">
          <Button size="sm" variant="secondary" onClick={handleRevokeAll}>Sign out all other devices</Button>
        </div>
      )}
    </Card>
  );
}

function LoginHistoryCard() {
  const toast = useToast();
  const [history, setHistory] = useState(null);

  useEffect(() => {
    getMyLoginHistory({ size: 20 }).then(setHistory).catch(() => { toast.error('Could not load login history'); setHistory([]); });
  }, []);

  const eventLabel = { LOGIN_SUCCESS: 'Signed in', LOGIN_FAILED: 'Failed sign-in attempt', PASSWORD_RESET_REQUESTED: 'Password reset requested', PASSWORD_RESET_COMPLETED: 'Password reset completed', ACCOUNT_LOCKED: 'Account locked', ACCOUNT_UNLOCKED: 'Account unlocked', ACCOUNT_ACTIVATED: 'Account activated', LOGOUT: 'Signed out', SESSION_EXPIRED: 'Session expired', SESSION_REUSE_DETECTED: 'Suspicious activity detected', MFA_CHALLENGE_ISSUED: 'Two-factor code requested', MFA_VERIFY_FAILED: 'Wrong two-factor code' };

  return (
    <Card title="Recent Sign-In Activity" action={<History size={16} className="text-text-secondary" />}>
      {history === null ? (
        <p className="text-sm text-text-secondary">Loading...</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-text-secondary">No recent activity.</p>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {history.map(h => (
            <div key={h.id} className="flex items-center justify-between px-3 py-2 bg-surface-3 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <span className={h.success ? 'text-success' : 'text-danger'}>●</span>
                <span className="text-text font-medium">{eventLabel[h.eventType] || h.eventType}</span>
              </div>
              <div className="text-text-secondary text-right flex-shrink-0 ml-2">
                <div>{h.ipAddress || '-'}</div>
                <div>{h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function MfaCard() {
  const toast = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [nudged, setNudged] = useState(false);

  useEffect(() => {
    getAuthSettings().then(s => {
      const roles = (s?.mfaNudgedRoles || '').split(',').map(r => r.trim().toUpperCase());
      setNudged(s?.mfaEnabled && roles.includes((user?.role || '').toUpperCase()));
    }).catch(() => {});
  }, [user?.role]);
  const [setupData, setSetupData] = useState(null); // { qrCodeDataUri, manualEntryKey }
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [backupCodes, setBackupCodes] = useState(null);
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  const load = () => getMfaStatus().then(setStatus).catch(() => setStatus({ enabled: false }));
  useEffect(() => { load(); }, []);

  const handleStartSetup = async () => {
    setBusy(true);
    try {
      const data = await startMfaSetup();
      setSetupData(data);
    } catch (err) {
      toast.error(err.message || 'Could not start MFA setup');
    } finally {
      setBusy(false);
    }
  };

  const handleEnable = async () => {
    setBusy(true);
    try {
      const result = await enableMfa(code);
      setBackupCodes(result.backupCodes);
      setSetupData(null);
      setCode('');
      load();
    } catch (err) {
      toast.error(err.message || 'Invalid code - please try again');
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      await disableMfa(disablePassword);
      toast.success('Two-factor authentication disabled');
      setShowDisable(false);
      setDisablePassword('');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to disable two-factor authentication');
    } finally {
      setBusy(false);
    }
  };

  if (status === null) return <Card title="Two-Factor Authentication"><p className="text-sm text-text-secondary">Loading...</p></Card>;

  return (
    <Card title="Two-Factor Authentication" subtitle="Require a code from your phone in addition to your password" action={<ShieldCheck size={16} className="text-text-secondary" />}>
      {nudged && !status.enabled && (
        <div className="flex items-start gap-2 p-3 mb-4 bg-warning/10 border border-warning/20 rounded-lg text-xs text-warning">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <p>Your role has access to sensitive company data - we strongly recommend enabling two-factor authentication.</p>
        </div>
      )}
      {status.enabled ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Badge variant="success">Enabled</Badge><p className="text-sm text-text-secondary">Your account is protected with two-factor authentication.</p></div>
          <Button size="sm" variant="ghost" className="text-danger" onClick={() => setShowDisable(true)}>Disable</Button>
        </div>
      ) : setupData ? (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Scan this QR code with an authenticator app (Google Authenticator, Microsoft Authenticator, Authy), then enter the 6-digit code it shows.</p>
          <img src={setupData.qrCodeDataUri} alt="MFA QR code" className="w-40 h-40 rounded-lg border border-border" />
          <div>
            <p className="text-xs text-text-secondary mb-1">Can't scan? Enter this key manually:</p>
            <code className="text-xs bg-surface-3 px-2 py-1 rounded break-all">{setupData.manualEntryKey}</code>
          </div>
          <Input label="6-digit code" value={code} onChange={e => setCode(e.target.value)} placeholder="123456" maxLength={6} />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleEnable} disabled={busy || code.length < 6}>{busy ? 'Verifying...' : 'Verify & Enable'}</Button>
            <Button size="sm" variant="secondary" onClick={() => { setSetupData(null); setCode(''); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Badge variant="default">Not enabled</Badge><p className="text-sm text-text-secondary">Add an extra layer of security to your account.</p></div>
          <Button size="sm" onClick={handleStartSetup} disabled={busy}>Enable</Button>
        </div>
      )}

      <Modal open={!!backupCodes} onClose={() => setBackupCodes(null)} title="Save your backup codes">
        <p className="text-sm text-text-secondary mb-3">Store these somewhere safe - each one can be used once to sign in if you lose access to your authenticator app. They won't be shown again.</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(backupCodes || []).map(c => <code key={c} className="text-xs bg-surface-3 px-2 py-1.5 rounded text-center">{c}</code>)}
        </div>
        <Button size="sm" icon={Copy} onClick={() => { navigator.clipboard?.writeText((backupCodes || []).join('\n')); }}>Copy all</Button>
        <div className="flex justify-end mt-4">
          <Button onClick={() => setBackupCodes(null)}>Done</Button>
        </div>
      </Modal>

      <Modal open={showDisable} onClose={() => setShowDisable(false)} title="Disable Two-Factor Authentication">
        <p className="text-sm text-text-secondary mb-3">Enter your password to confirm.</p>
        <Input type="password" autoComplete="current-password" label="Password" value={disablePassword} onChange={e => setDisablePassword(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setShowDisable(false)}>Cancel</Button>
          <Button onClick={handleDisable} disabled={busy || !disablePassword}>{busy ? 'Disabling...' : 'Disable'}</Button>
        </div>
      </Modal>
    </Card>
  );
}

export default function MySecurity() {
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'My Security' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">My Security</h1>
          <p className="text-sm text-text-secondary">Manage your password, devices, and two-factor authentication</p>
        </div>
        <Button variant="secondary" icon={Key} onClick={() => navigate('/change-password')}>Change Password</Button>
      </div>

      <MfaCard />
      <DevicesCard />
      <LoginHistoryCard />
    </div>
  );
}
