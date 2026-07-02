import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ROLE_PERMISSIONS } from '../../data/mock';
import { LayoutDashboard, Users, UserPlus, FolderKanban, Clock, CalendarDays, IndianRupee, Ticket, Monitor, TrendingUp, BarChart3, FileText, Settings, HelpCircle, ChevronLeft, LogOut, GitBranch, Network, UserCheck } from 'lucide-react';

const sections = [
  { title: 'MAIN', items: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'resources', label: 'Resources', icon: GitBranch },
  ]},
  { title: 'HR', items: [
    { id: 'attendance', label: 'Attendance', icon: UserCheck },
    { id: 'leave', label: 'Leave', icon: CalendarDays },
    { id: 'payroll', label: 'Payroll', icon: IndianRupee },
    { id: 'recruitment', label: 'Recruitment', icon: UserPlus },
    { id: 'timesheets', label: 'Timesheets', icon: Clock },
  ]},
  { title: 'OPERATIONS', items: [
    { id: 'tickets', label: 'Tickets', icon: Ticket },
    { id: 'assets', label: 'Assets', icon: Monitor },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'org-chart', label: 'Org Chart', icon: Network },
  ]},
  { title: 'INSIGHTS', items: [
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'documents', label: 'Documents', icon: FileText },
  ]},
];

export default function Sidebar({ collapsed, onToggleCollapse }) {
  const { user, logout } = useAuth();
  const { visibleModules } = useData() || {};
  const navigate = useNavigate();
  const location = useLocation();

  // CEO-configured live permissions when available, falling back to the built-in defaults
  const perms = visibleModules || ROLE_PERMISSIONS[user?.role?.toLowerCase()] || [];
  const isActive = (id) => {
    const path = location.pathname.split('/')[1] || 'dashboard';
    return path === id;
  };

  return (
    <aside className={`sidebar fixed left-0 top-0 h-screen bg-surface-2 border-r border-border flex flex-col z-40 transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-[240px]'}`}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
          <span className="text-white font-bold text-sm">V</span>
        </div>
        {!collapsed && (
          <div>
            <span className="font-bold text-text tracking-[0.2em] text-sm">VIKISOL</span>
            <p className="text-[8px] text-primary font-semibold tracking-[0.15em] -mt-0.5">ONE</p>
          </div>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto">
        {sections.map(section => {
          const visibleItems = section.items.filter(item => perms.includes(item.id));
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title} className="mb-3">
              {!collapsed && <p className="px-3 py-1.5 text-[9px] font-bold text-text-secondary/60 uppercase tracking-[0.2em]">{section.title}</p>}
              {collapsed && <div className="h-px bg-border mx-2 my-2" />}
              {visibleItems.map(item => {
                const active = isActive(item.id);
                return (
                  <button key={item.id} onClick={() => navigate(`/${item.id === 'dashboard' ? '' : item.id}`)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                      active ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-text-secondary hover:text-text hover:bg-surface-3'
                    }`}
                    title={collapsed ? item.label : undefined}>
                    <item.icon size={17} className="flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 space-y-0.5 border-t border-border">
        {perms.includes('settings') && (
          <button onClick={() => navigate('/settings')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all ${isActive('settings') ? 'bg-primary text-white' : 'text-text-secondary hover:text-text hover:bg-surface-3'}`}>
            <Settings size={17} className="flex-shrink-0" />{!collapsed && <span>Settings</span>}
          </button>
        )}
        <button onClick={() => navigate('/help')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all ${isActive('help') ? 'bg-primary text-white' : 'text-text-secondary hover:text-text hover:bg-surface-3'}`}>
          <HelpCircle size={17} className="flex-shrink-0" />{!collapsed && <span>Help & Support</span>}
        </button>
        <button onClick={onToggleCollapse} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:text-text hover:bg-surface-3 transition-all">
          <ChevronLeft size={17} className={`flex-shrink-0 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />{!collapsed && <span>Collapse</span>}
        </button>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-danger hover:bg-danger/10 transition-all">
          <LogOut size={17} className="flex-shrink-0" />{!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
