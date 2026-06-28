import { useNavigate } from 'react-router-dom';
import { Clock, CalendarDays, CheckCircle, Bell, FolderKanban, IndianRupee, TrendingUp, FileText } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { data } = useData();
  const navigate = useNavigate();
  const toast = useToast();

  const myProjects = data.projects.slice(0, 3);
  const myLeaves = data.leaveRequests.filter(l => l.status === 'Pending').slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="cursor-pointer" onClick={() => navigate('/attendance')}><StatCard icon={Clock} label="Today's Hours" value="6h 32m" change="In Progress" color="primary" delay={0} /></div>
        <div className="cursor-pointer" onClick={() => navigate('/leave')}><StatCard icon={CalendarDays} label="Leave Balance" value="18" change="3 pending" color="success" delay={1} /></div>
        <div className="cursor-pointer" onClick={() => navigate('/projects')}><StatCard icon={FolderKanban} label="Active Projects" value={myProjects.length} change="2 tasks due" color="info" delay={2} /></div>
        <div className="cursor-pointer" onClick={() => navigate('/payroll')}><StatCard icon={IndianRupee} label="Net Salary" value="₹78,750" change="May 2024" color="primary" delay={3} /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Attendance Today">
          <div className="text-center py-4">
            <div className="w-24 h-24 rounded-full border-4 border-primary mx-auto flex items-center justify-center mb-3">
              <div><p className="text-lg font-bold text-text">09:15</p><p className="text-[10px] text-text-secondary">Punch In</p></div>
            </div>
            <p className="text-sm text-text-secondary">Working: <span className="text-text font-semibold">6h 32m</span></p>
            <button onClick={() => toast.success('Punched out at ' + new Date().toLocaleTimeString())} className="mt-4 bg-danger hover:bg-danger/80 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">Punch Out</button>
          </div>
        </Card>

        <Card title="Leave Balance" action={<button onClick={() => navigate('/leave')} className="text-xs text-primary hover:underline">Apply Leave</button>}>
          <div className="space-y-3">
            {[{ type: 'Casual Leave', used: 4, total: 12, color: 'primary' }, { type: 'Sick Leave', used: 2, total: 8, color: 'danger' }, { type: 'Earned Leave', used: 3, total: 15, color: 'success' }, { type: 'Comp Off', used: 1, total: 5, color: 'info' }].map(l => (
              <div key={l.type}><div className="flex justify-between text-xs mb-1"><span className="text-text-secondary">{l.type}</span><span className="text-text font-medium">{l.total - l.used} left</span></div><ProgressBar value={l.used} max={l.total} color={l.color} /></div>
            ))}
          </div>
        </Card>

        <Card title="Quick Links">
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: FileText, label: 'My Payslips', path: '/payroll' },
              { icon: CalendarDays, label: 'Apply Leave', path: '/leave' },
              { icon: Clock, label: 'Timesheets', path: '/timesheets' },
              { icon: TrendingUp, label: 'Performance', path: '/performance' },
              { icon: Bell, label: 'Notifications', path: '/notifications' },
              { icon: CheckCircle, label: 'Raise Ticket', path: '/tickets' },
            ].map(q => (
              <button key={q.label} onClick={() => navigate(q.path)} className="flex items-center gap-2 p-3 rounded-lg bg-surface-3 hover:bg-surface-4 transition-colors text-left">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><q.icon size={16} className="text-primary" /></div>
                <span className="text-xs font-medium text-text">{q.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="My Projects" action={<button onClick={() => navigate('/projects')} className="text-xs text-primary hover:underline">View All</button>}>
          <div className="space-y-3">
            {myProjects.map(p => (
              <div key={p.id} className="p-3 bg-surface-3 rounded-lg cursor-pointer hover:bg-surface-4 transition-colors" onClick={() => navigate('/projects')}>
                <div className="flex items-center justify-between mb-2"><div><p className="text-sm font-medium text-text">{p.name}</p><p className="text-xs text-text-secondary">{p.client}</p></div><Badge>{p.status}</Badge></div>
                <ProgressBar value={p.progress} max={100} showLabel />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Pending Approvals" action={<button onClick={() => navigate('/notifications')} className="text-xs text-primary hover:underline">View All</button>}>
          <div className="space-y-3">
            {myLeaves.length > 0 ? myLeaves.map(l => (
              <div key={l.id} className="flex items-center gap-3 p-3 bg-surface-3 rounded-lg">
                <div className="w-1 h-10 rounded-full bg-warning" />
                <div className="flex-1"><p className="text-sm font-medium text-text">{l.type}</p><p className="text-xs text-text-secondary">{l.from} to {l.to}</p></div>
                <Badge dot>{l.status}</Badge>
              </div>
            )) : <p className="text-sm text-text-secondary text-center py-4">No pending items</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
