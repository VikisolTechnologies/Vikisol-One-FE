import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, CheckCircle2 } from 'lucide-react';
import { requestPasswordReset } from '../api/auth';

// Public/unauthenticated route. Never reveals whether the given official email matches a real
// account - the confirmation screen is identical either way, per the backend's security design.
// The reset link (if any) is emailed to the employee's PERSONAL/recovery address, not this one.
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setDone(true);
    } catch (err) {
      // Even on a genuine failure (network/server error) we still avoid leaking account
      // existence - only show an error for real request failures, not "not found".
      setError(err.message || 'Something went wrong. Please try again.');
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
          {!done ? (
            <>
              <h2 className="text-xl font-semibold text-text mb-1">Forgot Password?</h2>
              <p className="text-sm text-text-secondary mb-6">
                Enter your <span className="font-medium text-text">official company email</span> and we'll send a reset link to the personal email on file for your account.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Official Company Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="john.smith@vikisol.in"
                      className="w-full bg-surface-3 border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-text placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1">This is not your personal email - it's the one your organization issued to you.</p>
                </div>

                {error && <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

                <button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-60">
                  {submitting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-xs text-text-secondary text-center mt-6">
                <Link to="/login" className="text-primary hover:underline">Back to login</Link>
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 size={40} className="text-success" />
              <h2 className="text-lg font-semibold text-text">Check your personal email</h2>
              <p className="text-sm text-text-secondary">
                If <span className="font-medium text-text">{email}</span> is registered, a password reset link has been sent to the personal email on file for that account.
              </p>
              <Link to="/login" className="text-primary text-sm hover:underline mt-2">Back to login</Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
