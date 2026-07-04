import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { Search, Bell, Sun, Moon, ChevronDown, Settings, LogOut, X, HelpCircle, Menu } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { motion, AnimatePresence } from 'framer-motion';

const searchPlaceholders = ['Search employees...', 'Search projects...', 'Search tickets...', 'Search candidates...', 'Search anything...'];

export default function Topbar({ onOpenMobileSidebar }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data, stats, markNotificationRead } = useData();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setPlaceholderIdx(i => (i + 1) % searchPlaceholders.length), 3000);
    return () => clearInterval(interval);
  }, []);

  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'; };
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const results = [];
    data.employees.filter(e => e.name.toLowerCase().includes(q) || e.empId.toLowerCase().includes(q)).slice(0, 3).forEach(e => results.push({ type: 'Employee', label: e.name, sub: e.empId, path: '/employees' }));
    data.projects.filter(p => p.name.toLowerCase().includes(q)).slice(0, 2).forEach(p => results.push({ type: 'Project', label: p.name, sub: p.client, path: '/projects' }));
    data.candidates.filter(c => c.name.toLowerCase().includes(q)).slice(0, 2).forEach(c => results.push({ type: 'Candidate', label: c.name, sub: c.role, path: '/recruitment' }));
    data.tickets.filter(t => t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)).slice(0, 2).forEach(t => results.push({ type: 'Ticket', label: t.title, sub: t.id, path: '/tickets' }));
    return results;
  }, [searchQuery, data]);

  const unreadNotifs = data.notifications.filter(n => !n.read);

  return (
    <header className="topbar h-16 bg-surface-2 border-b border-border flex items-center justify-between px-3 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onOpenMobileSidebar} aria-label="Open menu" className="p-2 -ml-1 hover:bg-surface-3 rounded-xl text-text-secondary hover:text-text md:hidden flex-shrink-0">
          <Menu size={20} />
        </button>
        {/* Greeting */}
        <div className="min-w-0">
          <p className="text-xs text-text-secondary font-medium truncate">{greeting()},</p>
          <h1 className="text-xl font-bold text-text -mt-0.5 truncate">{user?.name?.split(' ')[0]}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search with rotating placeholder */}
        <div className="relative hidden md:flex items-center">
          <Search size={15} className="absolute left-3 text-text-secondary" />
          <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }} onFocus={() => setShowSearch(true)}
            placeholder={searchPlaceholders[placeholderIdx]}
            className="bg-surface-3 border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-text w-72 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder-text-secondary/40" />
          {searchQuery && <button onClick={() => { setSearchQuery(''); setShowSearch(false); }} aria-label="Clear search" className="absolute right-3 text-text-secondary hover:text-text"><X size={14} /></button>}
          <AnimatePresence>
            {showSearch && searchResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                className="absolute top-full left-0 right-0 mt-2 bg-surface-2 border border-border rounded-xl shadow-2xl py-1 z-50 max-h-80 overflow-y-auto" onMouseLeave={() => setShowSearch(false)}>
                {searchResults.map((r, i) => (
                  <button key={i} onClick={() => { navigate(r.path); setSearchQuery(''); setShowSearch(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-3 transition-colors text-left">
                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">{r.type}</span>
                    <div className="min-w-0"><p className="text-sm text-text truncate">{r.label}</p><p className="text-[10px] text-text-secondary">{r.sub}</p></div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme toggle with animation */}
        <button onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} className="p-2.5 hover:bg-surface-3 rounded-xl transition-all text-text-secondary hover:text-text">
          <motion.div key={theme} initial={{ rotate: -30, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.15 }}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </motion.div>
        </button>

        {/* Notifications */}
        <button onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }} aria-label="Notifications" aria-expanded={showNotif} className="p-2.5 hover:bg-surface-3 rounded-xl transition-all text-text-secondary hover:text-text relative">
          <Bell size={17} />
          {stats.unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
              {stats.unreadNotifications > 9 ? '9+' : stats.unreadNotifications}
            </span>
          )}
        </button>

        {/* Profile */}
        <div className="relative">
          <button onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }} aria-label="User menu" aria-expanded={showProfile} className="flex items-center gap-2.5 p-1.5 hover:bg-surface-3 rounded-xl transition-all">
            <div className="relative">
              <Avatar name={user?.name} size="sm" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-surface-2" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-text leading-none">{user?.name}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">{user?.designation}</p>
            </div>
            <ChevronDown size={14} className="text-text-secondary hidden md:block" />
          </button>
          <AnimatePresence>
            {showProfile && (
              <motion.div initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.97 }}
                className="absolute right-0 top-full mt-2 w-60 bg-surface-2 border border-border rounded-xl shadow-2xl py-1 z-50" onMouseLeave={() => setShowProfile(false)}>
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text">{user?.name}</span>
                    <span className="w-2 h-2 bg-success rounded-full" />
                  </div>
                  <p className="text-xs text-text-secondary">{user?.email}</p>
                  <p className="text-[10px] text-primary font-semibold mt-0.5">{user?.role?.replace('_', ' ').toUpperCase()}</p>
                </div>
                <button onClick={() => { navigate('/notifications'); setShowProfile(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-3 hover:text-text transition-colors"><Bell size={14} /> Notifications {stats.unreadNotifications > 0 && <span className="ml-auto text-[10px] bg-danger text-white px-1.5 rounded-full">{stats.unreadNotifications}</span>}</button>
                <button onClick={() => { navigate('/settings'); setShowProfile(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-3 hover:text-text transition-colors"><Settings size={14} /> Settings</button>
                <button onClick={() => { navigate('/help'); setShowProfile(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-3 hover:text-text transition-colors"><HelpCircle size={14} /> Help & Support</button>
                <hr className="border-border my-1" />
                <button onClick={logout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors"><LogOut size={14} /> Sign Out</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notification dropdown */}
        <AnimatePresence>
          {showNotif && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="fixed md:absolute left-3 right-3 md:left-auto md:right-6 top-16 w-auto md:w-96 bg-surface-2 border border-border rounded-xl shadow-2xl z-50 max-h-96 overflow-hidden" onMouseLeave={() => setShowNotif(false)}>
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">Notifications</h3>
                <button onClick={() => { navigate('/notifications'); setShowNotif(false); }} className="text-xs text-primary hover:underline font-medium">View All</button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {unreadNotifs.slice(0, 6).map(n => (
                  <div key={n.id} onClick={() => { Promise.resolve(markNotificationRead(n.id)).catch(() => {}); }} className="px-4 py-3 hover:bg-surface-3 cursor-pointer border-b border-border/50 flex items-start gap-3 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div><p className="text-sm text-text">{n.message}</p><p className="text-[10px] text-text-secondary mt-0.5">{n.time}</p></div>
                  </div>
                ))}
                {unreadNotifs.length === 0 && <p className="text-sm text-text-secondary text-center py-8">All caught up!</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
