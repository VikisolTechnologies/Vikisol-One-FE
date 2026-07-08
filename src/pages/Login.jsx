import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Monitor, ShieldCheck, KeyRound } from 'lucide-react';
import { getAuthSettings } from '../api/auth';

const OTP_TTL_SECONDS = 300; // 5 minutes - matches AuthService.OTP_TTL on the backend
const OTP_RESEND_COOLDOWN_SECONDS = 30; // matches AuthService.OTP_REQUEST_COOLDOWN, decoupled from expiry

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('email');
  const [remember, setRemember] = useState(false);
  const { login, completeMfaLogin, requestOtp, completeOtpLogin } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);

  // Set once the password step succeeds but the account has MFA enabled - switches the form to a
  // 6-digit code entry screen instead of navigating away. Null means "still on the password step".
  const [mfaChallengeToken, setMfaChallengeToken] = useState(null);
  const [mfaCode, setMfaCode] = useState('');

  // OTP Login tab state - a code is sent to `email`, then verified against it. Expiry and resend
  // cooldown are deliberately separate timers: the code itself stays valid for 5 minutes, but a
  // fresh one can be requested every 30 seconds well before that (matches AuthService.OTP_TTL /
  // OTP_REQUEST_COOLDOWN on the backend).
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const otpTimerRef = useRef(null);

  useEffect(() => {
    if (!otpSent) return;
    otpTimerRef.current = setInterval(() => {
      setOtpSecondsLeft(s => (s <= 1 ? 0 : s - 1));
      setOtpResendCooldown(s => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(otpTimerRef.current);
  }, [otpSent]);

  const switchTab = (next) => {
    setTab(next);
    setError('');
    setOtpSent(false);
    setOtpCode('');
    setOtpResendCooldown(0);
    clearInterval(otpTimerRef.current);
  };

  // Public, unauthenticated flags - the Microsoft button should only ever look clickable if
  // BOTH the org has it turned on AND real Azure credentials are actually configured (the latter
  // is a real computed flag from the backend, not just a feature toggle - it's false everywhere
  // today since no environment has Azure AD credentials set).
  const [authSettings, setAuthSettings] = useState(null);
  useEffect(() => {
    getAuthSettings().then(setAuthSettings).catch(() => setAuthSettings(null));
  }, []);
  const microsoftAvailable = !!(authSettings?.microsoftLoginEnabled && authSettings?.microsoftLoginConfigured);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(email, password, remember);
    setSubmitting(false);
    if (result.mfaRequired) { setMfaChallengeToken(result.challengeToken); return; }
    if (result.success) navigate('/');
    else setError(result.error);
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await completeMfaLogin(mfaChallengeToken, mfaCode, remember);
    setSubmitting(false);
    if (result.success) navigate('/');
    else setError(result.error);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) { setError('Enter your email first'); return; }
    setError('');
    setSubmitting(true);
    const result = await requestOtp(email);
    setSubmitting(false);
    if (result.success) {
      setOtpSent(true);
      setOtpCode('');
      setOtpSecondsLeft(OTP_TTL_SECONDS);
      setOtpResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
    } else {
      setError(result.error);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await completeOtpLogin(email, otpCode, remember);
    setSubmitting(false);
    if (result.success) navigate('/');
    else setError(result.error);
  };

  return (
    <div className="min-h-screen flex bg-surface relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
            initial={{ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, opacity: 0 }}
            animate={{ y: [null, -20, 20], opacity: [0, 0.6, 0] }}
            transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3 }}
          />
        ))}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md px-8"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
              <span className="text-white text-2xl font-bold">V</span>
            </div>
            <h1 className="text-xl font-bold text-text tracking-[0.3em]">VIKISOL</h1>
            <p className="text-[10px] text-primary font-bold tracking-[0.3em] mt-0.5">ONE</p>
            <p className="text-[10px] text-text-secondary mt-1 tracking-[0.15em]">TECHNOLOGY · TALENT · TRANSFORMATION</p>
          </div>

          <div className="bg-surface-2 border border-border rounded-2xl p-8 shadow-2xl">
            {mfaChallengeToken ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck size={18} className="text-primary" />
                  <h2 className="text-xl font-semibold text-text">Two-Factor Verification</h2>
                </div>
                <p className="text-sm text-text-secondary mb-6">Enter the 6-digit code from your authenticator app, or one of your backup codes.</p>
                <form onSubmit={handleMfaSubmit} className="space-y-4">
                  <input
                    type="text" inputMode="numeric" autoFocus value={mfaCode} autoComplete="one-time-code"
                    onChange={e => setMfaCode(e.target.value)}
                    placeholder="123456" maxLength={12}
                    className="w-full bg-surface-3 border border-border rounded-lg px-4 py-3 text-center text-lg tracking-[0.3em] text-text placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                    required
                  />
                  {error && <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}
                  <button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-60">
                    {submitting ? 'Verifying...' : 'Verify & Sign In'}
                  </button>
                  <button type="button" onClick={() => { setMfaChallengeToken(null); setMfaCode(''); setError(''); }} className="w-full text-xs text-text-secondary hover:text-text text-center">
                    Back to sign in
                  </button>
                </form>
              </>
            ) : (
            <>
            <h2 className="text-xl font-semibold text-text mb-1">Welcome Back!</h2>
            <p className="text-sm text-text-secondary mb-6">Sign in to continue to Vikisol HRMS</p>

            <div className="flex bg-surface-3 rounded-lg p-1 mb-6">
              <button onClick={() => switchTab('email')} className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${tab === 'email' ? 'bg-primary text-white' : 'text-text-secondary'}`}>Email Login</button>
              <button onClick={() => switchTab('otp')} className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${tab === 'otp' ? 'bg-primary text-white' : 'text-text-secondary'}`}>OTP Login</button>
            </div>

            {tab === 'otp' ? (
              <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} disabled={otpSent} placeholder="you@vikisol.in" className="w-full bg-surface-3 border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-text placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all disabled:opacity-60" required />
                </div>

                {otpSent && (
                  <div>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                      <input type="text" inputMode="numeric" autoFocus value={otpCode} autoComplete="one-time-code" onChange={e => setOtpCode(e.target.value)}
                        placeholder="6-digit code" maxLength={6}
                        className="w-full bg-surface-3 border border-border rounded-lg pl-10 pr-4 py-3 text-sm tracking-[0.3em] text-text placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" required />
                    </div>
                    <p className="text-[11px] text-text-secondary mt-1.5">
                      {otpSecondsLeft > 0
                        ? `Code sent to ${email} - expires in ${Math.floor(otpSecondsLeft / 60)}:${String(otpSecondsLeft % 60).padStart(2, '0')}`
                        : 'Code expired.'}{' '}
                      <button type="button" onClick={handleSendOtp} disabled={otpResendCooldown > 0 || submitting} className="text-primary hover:underline disabled:text-text-secondary disabled:no-underline disabled:cursor-not-allowed">
                        {otpResendCooldown > 0 ? `Resend code (${otpResendCooldown}s)` : 'Resend code'}
                      </button>
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-text-secondary cursor-pointer">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="rounded accent-primary" />
                    Remember me
                  </label>
                  <Link to="/forgot-password" className="text-primary hover:underline">Forgot Password?</Link>
                </div>

                {error && <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

                <button type="submit" disabled={submitting || (otpSent && otpSecondsLeft === 0)} className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-60">
                  {submitting ? (otpSent ? 'Verifying...' : 'Sending code...') : (otpSent ? 'Verify & Sign In' : 'Send Code')}
                </button>
              </form>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@vikisol.in" className="w-full bg-surface-3 border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-text placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" required />
              </div>

              <div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
                    onKeyUp={e => setCapsLockOn(e.getModifierState && e.getModifierState('CapsLock'))}
                    placeholder="Password" className="w-full bg-surface-3 border border-border rounded-lg pl-10 pr-10 py-3 text-sm text-text placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" required />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {capsLockOn && <p className="text-[11px] text-warning mt-1.5">Caps Lock is on</p>}
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-text-secondary cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="rounded accent-primary" />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-primary hover:underline">Forgot Password?</Link>
              </div>

              {error && <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

              <button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-60">
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="relative my-4">
                <hr className="border-border" />
                <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-2 px-3 text-xs text-text-secondary">or continue with</span>
              </div>

              <div className="relative group">
                <button
                  type="button"
                  disabled={!microsoftAvailable}
                  title={microsoftAvailable ? undefined : 'Not configured for this organization yet'}
                  onClick={() => { if (!microsoftAvailable) return; /* no-op: no real OAuth flow exists yet */ }}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${
                    microsoftAvailable
                      ? 'bg-[#0078D4] hover:bg-[#006BC1] text-white cursor-pointer'
                      : 'bg-surface-3 text-text-secondary/60 cursor-not-allowed border border-border'
                  }`}
                >
                  <Monitor size={16} /> Sign in with Microsoft
                </button>
                {!microsoftAvailable && (
                  <p className="text-[11px] text-text-secondary text-center mt-1.5">
                    Not configured for this organization yet
                  </p>
                )}
              </div>
            </form>
            )}

            <p className="text-xs text-text-secondary text-center mt-6">
              Don't have an account? <a href="mailto:connect@vikisol.in?subject=Vikisol%20One%20-%20Account%20Request" className="text-primary hover:underline">Contact IT Admin</a>
            </p>
            </>
            )}
          </div>

          <p className="text-xs text-text-secondary text-center mt-6">&copy; 2024 Vikisol. All rights reserved.</p>
        </motion.div>
      </div>
    </div>
  );
}
