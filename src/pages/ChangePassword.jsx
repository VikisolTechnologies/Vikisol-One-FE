import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Check } from 'lucide-react';
import { changePassword } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';

const REQUIREMENTS = [
  { key: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

// Forced screen shown when the backend reports the user's password has expired (Company
// Settings' Password Expiry policy) - the backend also rejects every other endpoint with 403
// until this succeeds, so this isn't just a UI nudge, it's a real gate. Also usable for a
// voluntary password change from a logged-in session.
export default function ChangePassword() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const onKeyUpCheckCaps = (e) => setCapsLockOn(e.getModifierState && e.getModifierState('CapsLock'));

  const failedReqs = REQUIREMENTS.filter(r => !r.test(newPassword));
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = oldPassword.length > 0 && failedReqs.length === 0 && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await changePassword(oldPassword, newPassword);
      toast.success('Password updated. Please log in again with your new password.');
      // Session invalidation means the current token is now stale server-side anyway - a clean
      // re-login is simpler and more correct than trying to keep this session alive.
      logout();
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md px-8 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <Lock size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-text tracking-[0.3em]">VIKISOL</h1>
        </div>

        <div className="bg-surface-2 border border-border rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-text mb-1">Update Your Password</h2>
          <p className="text-sm text-text-secondary mb-6">
            {user?.passwordExpired
              ? 'Your password has expired and must be changed before you can continue.'
              : 'Choose a new password for your account.'}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input type={showPwd ? 'text' : 'password'} value={oldPassword} onChange={e => setOldPassword(e.target.value)} onKeyUp={onKeyUpCheckCaps} autoComplete="current-password" placeholder="Current password" className="w-full bg-surface-3 border border-border rounded-lg pl-10 pr-10 py-3 text-sm text-text placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" required />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input type={showPwd ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} onKeyUp={onKeyUpCheckCaps} autoComplete="new-password" placeholder="New password" className="w-full bg-surface-3 border border-border rounded-lg pl-10 pr-10 py-3 text-sm text-text placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" required />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {capsLockOn && <p className="text-[11px] text-warning -mt-2">Caps Lock is on</p>}
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input type={showPwd ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="Confirm new password" className="w-full bg-surface-3 border border-border rounded-lg pl-10 pr-10 py-3 text-sm text-text placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" required />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="bg-surface-3 rounded-lg p-3 space-y-1.5">
              {REQUIREMENTS.map(r => {
                const met = r.test(newPassword);
                return (
                  <div key={r.key} className={`flex items-center gap-2 text-xs ${met ? 'text-success' : 'text-text-secondary'}`}>
                    {met ? <Check size={13} /> : <span className="w-[13px] h-[13px] rounded-full border border-current inline-block" />}
                    {r.label}
                  </div>
                );
              })}
              {newPassword.length > 0 && (
                <div className={`flex items-center gap-2 text-xs pt-1 mt-1 border-t border-border ${passwordsMatch ? 'text-success' : 'text-text-secondary'}`}>
                  {passwordsMatch ? <Check size={13} /> : <span className="w-[13px] h-[13px] rounded-full border border-current inline-block" />}
                  Passwords match
                </div>
              )}
            </div>

            {error && <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={submitting || !canSubmit} className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-60">
              {submitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
