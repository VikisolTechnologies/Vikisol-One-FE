import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CalendarDays, CheckCircle, Bell, FolderKanban, IndianRupee, TrendingUp, FileText, Send } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import { computeLiveWorkingHours } from '../../api/attendance';
import SensitiveValue from '../../components/ui/SensitiveValue';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { data, attendanceSource, todayAttendance, attendanceCheckIn, attendanceCheckOut, leaveBalances, ensureLoad } = useData();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => { ensureLoad('timesheets'); }, [ensureLoad]);

  const isLiveAttendance = attendanceSource === 'live';
  const [mockPunchedIn, setMockPunchedIn] = useState(true);
  const [mockPunchInTime] = useState('09:10 AM');

  const livePunchedIn = !!todayAttendance && todayAttendance.punchIn !== '-' && (todayAttendance.punchOut === '-' || !todayAttendance.punchOut);
  const punchedIn = isLiveAttendance ? livePunchedIn : mockPunchedIn;
  const punchInTime = isLiveAttendance ? (todayAttendance?.punchIn || '--:--') : mockPunchInTime;

  // Ticks "Today's Hours" every minute while punched in, instead of freezing at the value fetched
  // at the last check-in/page load.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!isLiveAttendance || !livePunchedIn) return;
    const interval = setInterval(() => forceTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, [isLiveAttendance, livePunchedIn]);

  const workingHours = isLiveAttendance
    ? (livePunchedIn && todayAttendance?.checkInTimeRaw ? computeLiveWorkingHours(todayAttendance.checkInTimeRaw) : (todayAttendance?.hours || '-'))
    : '7h 22m';

  const handlePunch = async () => {
    if (!isLiveAttendance) {
      // No live backend session - keep the local demo toggle instead of pretending to persist
      if (mockPunchedIn) {
        setMockPunchedIn(false);
        toast.success(`Punched out at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
      } else {
        setMockPunchedIn(true);
        toast.success(`Punched in at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
      }
      return;
    }
    try {
      if (punchedIn) {
        await attendanceCheckOut();
        toast.success('Punched out');
      } else {
        await attendanceCheckIn();
        toast.success('Punched in');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record attendance');
    }
  };

  const myProjects = data.projects.slice(0, 3);
  const myLeaves = data.leaveRequests.filter(l => l.status === 'Pending').slice(0, 3);

  const balanceColors = ['primary', 'danger', 'success', 'info', 'warning'];
  const leaveBalanceRows = isLiveAttendance && leaveBalances.length
    ? leaveBalances.map((b, i) => ({ type: b.type, used: b.used, total: b.total, color: balanceColors[i % balanceColors.length] }))
    : [{ type: 'Casual Leave', used: 4, total: 12, color: 'primary' }, { type: 'Sick Leave', used: 2, total: 8, color: 'danger' }, { type: 'Earned Leave', used: 3, total: 15, color: 'success' }, { type: 'Comp Off', used: 1, total: 5, color: 'info' }];
  const totalLeaveLeft = leaveBalanceRows.reduce((s, l) => s + (l.total - l.used), 0);

  const myTimesheets = useMemo(() => data.timesheets.filter(t => t.empId === user?.empId), [data.timesheets, user]);
  const weekHours = useMemo(() => {
    const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return myTimesheets.filter(t => new Date(t.weekStart || t.date) >= oneWeekAgo).reduce((s, t) => s + (t.total || 0), 0);
  }, [myTimesheets]);
  const monthHours = useMemo(() => {
    const now = new Date();
    return myTimesheets.filter(t => { const d = new Date(t.weekStart || t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, t) => s + (t.total || 0), 0);
  }, [myTimesheets]);
  const timesheetCompliance = useMemo(() => {
    if (myTimesheets.length === 0) return 0;
    const approved = myTimesheets.filter(t => t.status === 'Approved' || t.status === 'Submitted').length;
    return Math.round((approved / myTimesheets.length) * 100);
  }, [myTimesheets]);

  const lastPayslip = useMemo(() => {
    const mine = data.payslips.filter(p => p.empId === user?.empId || !p.empId);
    return [...mine].sort((a, b) => (b.year - a.year) || ((b.monthNum || 0) - (a.monthNum || 0)))[0];
  }, [data.payslips, user]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="cursor-pointer" onClick={() => navigate('/attendance')}><StatCard icon={Clock} label="Today's Hours" value={workingHours} change={punchedIn ? 'In Progress' : 'Not Punched In'} color="primary" delay={0} /></div>
        <div className="cursor-pointer" onClick={() => navigate('/leave')}><StatCard icon={CalendarDays} label="Leave Balance" value={totalLeaveLeft} change={`${myLeaves.length} pending`} color="success" delay={1} /></div>
        <div className="cursor-pointer" onClick={() => navigate('/projects')}><StatCard icon={FolderKanban} label="My Projects" value={myProjects.length} color="info" delay={2} /></div>
        <div className="cursor-pointer" onClick={() => navigate('/payroll')}><StatCard icon={IndianRupee} label="Last Salary" value={lastPayslip ? <SensitiveValue type="currency" value={lastPayslip.netPay} id="employee-dashboard-last-salary" /> : '-'} change={lastPayslip?.month || ''} color="primary" delay={3} showSparkline={false} /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Punch In/Out */}
        <Card title="Attendance">
          <div className="text-center py-3">
            <div className={`w-24 h-24 rounded-full border-4 ${punchedIn ? 'border-success' : 'border-surface-4'} mx-auto flex items-center justify-center mb-3 transition-colors`}>
              <div>
                <p className="text-lg font-bold text-text">{punchedIn ? punchInTime : '--:--'}</p>
                <p className="text-[10px] text-text-secondary">{punchedIn ? 'Punched In' : 'Not Punched In'}</p>
              </div>
            </div>
            {punchedIn && <p className="text-sm text-text-secondary">Working: <span className="text-text font-semibold">{workingHours}</span></p>}
            <button onClick={handlePunch}
              className={`mt-3 px-8 py-2.5 rounded-xl text-sm font-semibold transition-all text-white shadow-lg ${punchedIn ? 'bg-danger hover:bg-danger/80 shadow-danger/20' : 'bg-success hover:bg-success/80 shadow-success/20'}`}>
              {punchedIn ? 'Punch Out' : 'Punch In'}
            </button>
          </div>
        </Card>

        {/* Leave Balance */}
        <Card title="Leave Balance" action={<button onClick={() => navigate('/leave')} className="text-xs text-primary hover:underline">Apply Leave</button>}>
          <div className="space-y-3">
            {leaveBalanceRows.map(l => (
              <div key={l.type}><div className="flex justify-between text-xs mb-1"><span className="text-text-secondary">{l.type}</span><span className="text-text font-medium">{l.total - l.used} left</span></div><ProgressBar value={l.used} max={l.total} color={l.color} /></div>
            ))}
          </div>
        </Card>

        {/* Quick Links */}
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
        {/* My Projects */}
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

        {/* Timesheet Reminder */}
        <Card title="Timesheet" action={<button onClick={() => navigate('/timesheets')} className="text-xs text-primary hover:underline">Open Timesheet</button>}>
          <div className="space-y-3">
            <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center"><Send size={18} className="text-warning" /></div>
                <div>
                  <p className="text-sm font-semibold text-text">Weekly Timesheet Due</p>
                  <p className="text-xs text-text-secondary">Submit by Friday, 6:00 PM</p>
                </div>
              </div>
              <Button size="sm" className="mt-3 w-full" onClick={() => navigate('/timesheets')}>Fill Timesheet</Button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-surface-3 rounded-lg"><p className="text-lg font-bold text-text">{weekHours}h</p><p className="text-[10px] text-text-secondary">This Week</p></div>
              <div className="p-2 bg-surface-3 rounded-lg"><p className="text-lg font-bold text-success">{monthHours}h</p><p className="text-[10px] text-text-secondary">This Month</p></div>
              <div className="p-2 bg-surface-3 rounded-lg"><p className="text-lg font-bold text-primary">{timesheetCompliance}%</p><p className="text-[10px] text-text-secondary">Compliance</p></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
