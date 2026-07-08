import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Loader from '../ui/Loader';

export default function AppLayout() {
  const { isAuthenticated, authLoading, user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  // Sidebar was always rendered at fixed width with no mobile pattern - on a phone this left
  // almost no room for content. Below md it's now an off-canvas drawer, toggled from the topbar.
  const [mobileOpen, setMobileOpen] = useState(false);

  // Was `return null` (a genuinely blank white screen) while the initial /auth/me check is in
  // flight - now that this check always runs on every page load (cookies are HttpOnly, so there's
  // no way to skip it for a "definitely logged out" fast path anymore), that blank window is
  // longer and more visible than before, so it needs a visible loading state instead of nothing.
  if (authLoading) return <Loader fullPage />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Password Expiry: block every page in the app until the forced Change Password screen
  // succeeds - the backend enforces this too (403s every API call except change-password/me), so
  // this is a real gate, not just a nicety.
  if (user?.passwordExpired) return <Navigate to="/change-password" replace />;

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? 'md:ml-[68px]' : 'md:ml-[240px]'}`}>
        <Topbar onOpenMobileSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
