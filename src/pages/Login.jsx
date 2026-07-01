import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Monitor } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('email');
  const [remember, setRemember] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(email, password);
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
            <h2 className="text-xl font-semibold text-text mb-1">Welcome Back!</h2>
            <p className="text-sm text-text-secondary mb-6">Sign in to continue to Vikisol HRMS</p>

            <div className="flex bg-surface-3 rounded-lg p-1 mb-6">
              <button onClick={() => setTab('email')} className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${tab === 'email' ? 'bg-primary text-white' : 'text-text-secondary'}`}>Email Login</button>
              <button onClick={() => setTab('otp')} className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${tab === 'otp' ? 'bg-primary text-white' : 'text-text-secondary'}`}>OTP Login</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@vikisol.in" className="w-full bg-surface-3 border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-text placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" required />
              </div>

              {tab === 'email' && (
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full bg-surface-3 border border-border rounded-lg pl-10 pr-10 py-3 text-sm text-text placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" required />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-text-secondary cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="rounded accent-primary" />
                  Remember me
                </label>
                <a href="#" className="text-primary hover:underline">Forgot Password?</a>
              </div>

              {error && <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

              <button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-60">
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="relative my-4">
                <hr className="border-border" />
                <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-2 px-3 text-xs text-text-secondary">or continue with</span>
              </div>

              <button type="button" className="w-full flex items-center justify-center gap-2 bg-[#0078D4] hover:bg-[#006BC1] text-white py-3 rounded-lg font-medium text-sm transition-all">
                <Monitor size={16} /> Sign in with Microsoft
              </button>
            </form>

            <p className="text-xs text-text-secondary text-center mt-6">
              Don't have an account? <a href="#" className="text-primary hover:underline">Contact IT Admin</a>
            </p>
          </div>

          <p className="text-xs text-text-secondary text-center mt-6">&copy; 2024 Vikisol. All rights reserved.</p>

          {/* Demo credentials */}
          <div className="mt-6 bg-surface-2 border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-text mb-2">Demo Logins:</p>
            <div className="space-y-1 text-xs text-text-secondary">
              {[
                ['CEO', 'ceo@vikisol.in', 'Ceo@123'],
                ['HR Manager', 'hr@vikisol.in', 'Hr@123'],
                ['Manager', 'manager@vikisol.in', 'Manager@123'],
                ['Employee', 'employee@vikisol.in', 'Employee@123'],
                ['Recruiter', 'recruiter@vikisol.in', 'Recruiter@123'],
                ['Finance', 'finance@vikisol.in', 'Finance@123'],
                ['Admin', 'admin@vikisol.in', 'Admin@123'],
              ].map(([role, email, pwd]) => (
                <button key={role} onClick={() => { setEmail(email); setPassword(pwd); }} className="w-full text-left hover:text-primary transition-colors flex justify-between">
                  <span className="font-medium">{role}</span>
                  <span>{email}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
