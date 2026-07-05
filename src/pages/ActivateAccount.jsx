import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { inspectActivationToken, activateAccount } from '../api/auth';
import Loader from '../components/ui/Loader';

// First-login entry point: an employee lands here from the activation-link email (sent to their
// PERSONAL address, never their official one) and sets their own password - no temp password is
// ever emailed. Public/unauthenticated route, guarded only by the token itself.
export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [status, setStatus] = useState('checking'); // checking | valid | invalid
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    inspectActivationToken(token)
      .then(info => {
        if (info.valid) { setFirstName(info.firstName || ''); setStatus('valid'); }
        else setStatus('invalid');
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setSubmitting(true);
    try {
      await activateAccount(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message || 'Failed to activate account');
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
            <div className="flex flex-col items-center gap-3 py-8"><Loader /><p className="text-sm text-text-secondary">Checking your activation link...</p></div>
          )}

          {status === 'invalid' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <XCircle size={40} className="text-danger" />
              <h2 className="text-lg font-semibold text-text">This link is invalid or has expired</h2>
              <p className="text-sm text-text-secondary">Activation links expire after 24 hours. Please ask HR to resend your activation email.</p>
              <Link to="/login" className="text-primary text-sm hover:underline mt-2">Back to login</Link>
            </div>
          )}

          {status === 'valid' && !done && (
            <>
              <h2 className="text-xl font-semibold text-text mb-1">Welcome{firstName ? `, ${firstName}` : ''}!</h2>
              <p className="text-sm text-text-secondary mb-6">Set your password to activate your Vikisol One account.</p>
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
                {error && <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-60">
                  {submitting ? 'Activating...' : 'Activate Account'}
                </button>
              </form>
            </>
          )}

          {done && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 size={40} className="text-success" />
              <h2 className="text-lg font-semibold text-text">Account activated!</h2>
              <p className="text-sm text-text-secondary">Redirecting you to login...</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
