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
    <div className="min-h-screen flex bg-[#050608] relative overflow-hidden">
      {/* Deep-black base with one focal glow (not scattered particles) - this is what reads as
          "futuristic" rather than flat: high contrast base + a single dramatic light source. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[42rem] h-[42rem] bg-primary/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-25%] right-[-10%] w-[38rem] h-[38rem] bg-[#58A6FF]/35 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-[#A371F7]/15 rounded-full blur-[100px]" />
        {/* subtle grain so flat black doesn't look like a solid fill */}
        <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      </div>

      <div className="flex-1 flex items-center justify-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md px-8"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-[#58A6FF] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_-4px] shadow-primary/60 ring-1 ring-white/20">
              <span className="text-white text-2xl font-bold">V</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-[0.3em]">VIKISOL</h1>
            <p className="text-[10px] text-primary font-bold tracking-[0.3em] mt-0.5">ONE</p>
            <p className="text-[10px] text-white/40 mt-1 tracking-[0.15em]">TECHNOLOGY · TALENT · TRANSFORMATION</p>
          </div>

          <div className="relative">
            {/* stacked glass layers behind the main card for depth */}
            <div className="absolute inset-x-4 -bottom-3 h-full bg-white/5 border border-white/10 rounded-3xl -z-10" />
            <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/15 border-t-white/30 rounded-3xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]">
              <h2 className="text-xl font-semibold text-white mb-1">Welcome Back!</h2>
              <p className="text-sm text-white/50 mb-6">Sign in to continue to Vikisol HRMS</p>

              <div className="flex bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-1 mb-6">
                <button onClick={() => setTab('email')} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${tab === 'email' ? 'bg-gradient-to-r from-primary to-[#58A6FF] text-white shadow-[0_0_20px_-4px] shadow-primary/60' : 'text-white/50'}`}>Email Login</button>
                <button onClick={() => setTab('otp')} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${tab === 'otp' ? 'bg-gradient-to-r from-primary to-[#58A6FF] text-white shadow-[0_0_20px_-4px] shadow-primary/60' : 'text-white/50'}`}>OTP Login</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@vikisol.in" className="w-full bg-black/30 backdrop-blur-md border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-all" required />
                </div>

                {tab === 'email' && (
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full bg-black/30 backdrop-blur-md border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-all" required />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-white/50 cursor-pointer">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="rounded accent-primary" />
                    Remember me
                  </label>
                  <a href="#" className="text-primary hover:underline">Forgot Password?</a>
                </div>

                {error && <p className="text-sm text-danger bg-danger/10 backdrop-blur-md rounded-lg px-3 py-2">{error}</p>}

                <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-primary to-[#58A6FF] hover:brightness-110 text-white py-3 rounded-xl font-semibold text-sm transition-all shadow-[0_0_30px_-6px] shadow-primary/60 active:scale-[0.98] disabled:opacity-60">
                  {submitting ? 'Signing in...' : 'Sign In'}
                </button>

                <div className="relative my-4">
                  <hr className="border-white/10" />
                  <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0b0c10] px-3 text-xs text-white/40">or continue with</span>
                </div>

                <button type="button" className="w-full flex items-center justify-center gap-2 bg-[#0078D4]/70 backdrop-blur-md hover:bg-[#0078D4] text-white py-3 rounded-xl font-medium text-sm transition-all border border-white/10">
                  <Monitor size={16} /> Sign in with Microsoft
                </button>
              </form>

              <p className="text-xs text-white/40 text-center mt-6">
                Don't have an account? <a href="#" className="text-primary hover:underline">Contact IT Admin</a>
              </p>
            </div>
          </div>

          <p className="text-xs text-white/30 text-center mt-6">&copy; 2024 Vikisol. All rights reserved.</p>

          {/* Demo credentials */}
          <div className="mt-6 bg-white/[0.06] backdrop-blur-2xl border border-white/15 border-t-white/25 rounded-2xl p-4 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.6)]">
            <p className="text-xs font-semibold text-white mb-2">Demo Logins:</p>
            <div className="space-y-1 text-xs text-white/50">
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
