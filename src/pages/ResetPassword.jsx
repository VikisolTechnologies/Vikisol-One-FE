import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, Check } from 'lucide-react';
import { inspectResetToken, resetPasswordWithToken } from '../api/auth';
import Loader from '../components/ui/Loader';

const REQUIREMENTS = [
  { key: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

// Mirrors ActivateAccount.jsx's two-step pattern (inspect token -> show invalid/expired state, or
// the create-password form) but for the forgot-password flow instead of first-login activation.
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [status, setStatus] = useState('checking'); // checking | valid | invalid
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    inspectResetToken(token)
      .then(info => {
        if (info.valid) { setFirstName(info.firstName || ''); setEmail(info.email || ''); setStatus('valid'); }
        else setStatus('invalid');
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const failedReqs = REQUIREMENTS.filter(r => !r.test(password));
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = failedReqs.length === 0 && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await resetPasswordWithToken(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
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
            <span className="text-white text-2xl font-bold">V</span>
          </div>
          <h1 className="text-xl font-bold text-text tracking-[0.3em]">VIKISOL</h1>
          <p className="text-[10px] text-text-secondary mt-1 tracking-[0.15em]">TECHNOLOGY · TALENT · TRANSFORMATION</p>
        </div>

        <div className="bg-surface-2 border border-border rounded-2xl p-8 shadow-2xl">
          {status === 'checking' && (
            <div className="flex flex-col items-center gap-3 py-8"><Loader /><p className="text-sm text-text-secondary">Checking your reset link...</p></div>
          )}

          {status === 'invalid' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <XCircle size={40} className="text-danger" />
              <h2 className="text-lg font-semibold text-text">This link is invalid or has expired</h2>
              <p className="text-sm text-text-secondary">Password reset links expire after a limited time. Request a new one to continue.</p>
              <Link to="/forgot-password" className="text-primary text-sm hover:underline mt-2">Request a new link</Link>
            </div>
          )}

          {status === 'valid' && !done && (
            <>
              <h2 className="text-xl font-semibold text-text mb-1">Create New Password{firstName ? `, ${firstName}` : ''}</h2>
              <p className="text-sm text-text-secondary mb-6">Choose a strong new password for your Vikisol One account.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" className="w-full bg-surface-3 border border-border rounded-lg pl-10 pr-10 py-3 text-sm text-text placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" required />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input type={showPwd ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="w-full bg-surface-3 border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-text placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" required />
                </div>

                <div className="bg-surface-3 rounded-lg p-3 space-y-1.5">
                  {REQUIREMENTS.map(r => {
                    const met = r.test(password);
                    return (
                      <div key={r.key} className={`flex items-center gap-2 text-xs ${met ? 'text-success' : 'text-text-secondary'}`}>
                        {met ? <Check size={13} /> : <span className="w-[13px] h-[13px] rounded-full border border-current inline-block" />}
                        {r.label}
                      </div>
                    );
                  })}
                  {password.length > 0 && (
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
            </>
          )}

          {done && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 size={40} className="text-success" />
              <h2 className="text-lg font-semibold text-text">Password updated successfully</h2>
              <p className="text-sm text-text-secondary">
                Please login using your official company email{email ? <>: <span className="font-medium text-text">{email}</span></> : '.'}
              </p>
              <Link to="/login" className="text-primary text-sm hover:underline mt-2">Go to login</Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
