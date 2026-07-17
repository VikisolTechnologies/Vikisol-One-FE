import { useState, useEffect, useMemo } from 'react';
import { Clock, UserCheck, UserX, Timer, MapPin } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getMyAttendance, getTeamAttendance, computeLiveWorkingHours } from '../../api/attendance';
import Skeleton from '../../components/ui/Skeleton';

const ATTENDANCE_DATA = [
  { date: 'Mon', present: 210, absent: 15, late: 12, wfh: 8 },
  { date: 'Tue', present: 220, absent: 10, late: 8, wfh: 7 },
  { date: 'Wed', present: 215, absent: 12, late: 10, wfh: 8 },
  { date: 'Thu', present: 225, absent: 8, late: 6, wfh: 6 },
  { date: 'Fri', present: 218, absent: 14, late: 9, wfh: 4 },
];

const teamLog = [
  { id: 1, name: 'Aarav Patel', empId: 'VKS101', punchIn: '09:15 AM', punchOut: '06:30 PM', hours: '9h 15m', status: 'Present', mode: 'Office' },
  { id: 2, name: 'Neha Joshi', empId: 'VKS102', punchIn: '09:45 AM', punchOut: '06:00 PM', hours: '8h 15m', status: 'Present', mode: 'WFH' },
  { id: 3, name: 'Rahul Sharma', empId: 'VKS103', punchIn: '10:15 AM', punchOut: '07:00 PM', hours: '8h 45m', status: 'Late', mode: 'Office' },
  { id: 4, name: 'Karan Malhotra', empId: 'VKS107', punchIn: '-', punchOut: '-', hours: '-', status: 'Absent', mode: '-' },
  { id: 5, name: 'Deepa Menon', empId: 'VKS106', punchIn: '09:00 AM', punchOut: '-', hours: '7h 30m', status: 'Present', mode: 'Hybrid' },
];

const myWeekLog = [
  { id: 1, date: '2026-06-23', day: 'Monday', punchIn: '09:10 AM', punchOut: '06:30 PM', hours: '9h 20m', status: 'Present', mode: 'Office' },
  { id: 2, date: '2026-06-24', day: 'Tuesday', punchIn: '09:05 AM', punchOut: '06:15 PM', hours: '9h 10m', status: 'Present', mode: 'Office' },
  { id: 3, date: '2026-06-25', day: 'Wednesday', punchIn: '09:30 AM', punchOut: '06:45 PM', hours: '9h 15m', status: 'Present', mode: 'WFH' },
  { id: 4, date: '2026-06-26', day: 'Thursday', punchIn: '10:20 AM', punchOut: '07:00 PM', hours: '8h 40m', status: 'Late', mode: 'Office' },
  { id: 5, date: '2026-06-27', day: 'Friday', punchIn: '09:00 AM', punchOut: '06:00 PM', hours: '9h 00m', status: 'Present', mode: 'Office' },
  { id: 6, date: '2026-06-28', day: 'Saturday', punchIn: '-', punchOut: '-', hours: '-', status: 'Weekend', mode: '-' },
  { id: 7, date: '2026-06-29', day: 'Sunday', punchIn: '-', punchOut: '-', hours: '-', status: 'Weekend', mode: '-' },
];

export default function AttendancePage() {
  const { user } = useAuth();
  const toast = useToast();
  const { attendanceSource, attendanceLoading, todayAttendance, attendanceCheckIn, attendanceCheckOut } = useData();
  const isManager = ['ceo', 'hr_manager', 'manager', 'admin'].includes(user?.role);
  const isEmployee = user?.role === 'employee';
  const isLive = attendanceSource === 'live';

  const [punchedIn, setPunchedIn] = useState(true);
  const [punchInTime] = useState('09:10 AM');
  const [workingHours, setWorkingHours] = useState('7h 22m');
  const [punchBusy, setPunchBusy] = useState(false);
  const [liveWeekLog, setLiveWeekLog] = useState(null);
  const [liveTeamLog, setLiveTeamLog] = useState(null);

  // Live: punched-in state derives from today's attendance record (no check-out time yet)
  const liveIsPunchedIn = !!todayAttendance && !!todayAttendance.checkInTime && todayAttendance.checkInTime !== '-' && (!todayAttendance.checkOutTime || todayAttendance.checkOutTime === '-');

  // Ticks the "Working: Xh Ym" display every minute while punched in, instead of freezing at
  // whatever value was fetched at check-in/last refresh.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!isLive || !liveIsPunchedIn) return;
    const interval = setInterval(() => forceTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, [isLive, liveIsPunchedIn]);

  useEffect(() => {
    if (!isLive) return;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const toISO = (d) => d.toISOString().split('T')[0];
    getMyAttendance(toISO(start), toISO(end))
      .then(setLiveWeekLog)
      .catch(() => setLiveWeekLog(null));
  }, [isLive, todayAttendance]);

  const [liveTeamTrend, setLiveTeamTrend] = useState(null);
  const [selectedTrendDay, setSelectedTrendDay] = useState(null);

  useEffect(() => {
    if (!isLive || !isManager) return;
    getTeamAttendance().then(setLiveTeamLog).catch(() => setLiveTeamLog(null));

    // Trailing Mon-Fri of the current week, for the trend chart
    const now = new Date();
    const dow = now.getDay(); // 0=Sun..6=Sat
    const monday = new Date(now); monday.setDate(now.getDate() - ((dow + 6) % 7));
    const days = Array.from({ length: 5 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    Promise.all(days.map(d => getTeamAttendance(d.toISOString().split('T')[0]).catch(() => [])))
      .then(results => {
        setLiveTeamTrend(results.map((log, i) => ({
          date: dayLabels[i],
          present: log.filter(l => l.status === 'Present').length,
          absent: log.filter(l => l.status === 'Absent').length,
          late: log.filter(l => l.status === 'Late').length,
          wfh: log.filter(l => l.mode === 'WFH').length,
        })));
      });
  }, [isLive, isManager]);

  const handlePunch = async () => {
    if (!isLive) {
      // Mock fallback behaviour
      if (punchedIn) {
        setPunchedIn(false);
        const now = new Date();
        toast.success(`Punched out at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
      } else {
        setPunchedIn(true);
        toast.success(`Punched in at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
      }
      return;
    }
    setPunchBusy(true);
    try {
      if (liveIsPunchedIn) {
        await attendanceCheckOut({});
        toast.success('Checked out successfully');
      } else {
        await attendanceCheckIn({});
        toast.success('Checked in successfully');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record attendance');
    } finally {
      setPunchBusy(false);
    }
  };

  const myColumns = [
    { key: 'date', label: 'Date' },
    { key: 'day', label: 'Day' },
    { key: 'punchIn', label: 'Punch In' },
    { key: 'punchOut', label: 'Punch Out' },
    { key: 'hours', label: 'Hours' },
    { key: 'mode', label: 'Mode', render: (v) => v !== '-' ? <Badge variant={v === 'WFH' ? 'info' : v === 'Hybrid' ? 'warning' : 'success'}>{v}</Badge> : '-' },
    { key: 'status', label: 'Status', render: (v) => <Badge dot>{v}</Badge> },
  ];

  const teamColumns = [
    { key: 'name', label: 'Employee', render: (v, row) => <div><p className="font-medium text-text text-sm">{v}</p><p className="text-xs text-text-secondary">{row.empId}</p></div> },
    { key: 'punchIn', label: 'Punch In' },
    { key: 'punchOut', label: 'Punch Out' },
    { key: 'hours', label: 'Hours' },
    { key: 'mode', label: 'Mode', render: (v) => v !== '-' ? <Badge variant={v === 'WFH' ? 'info' : v === 'Hybrid' ? 'warning' : 'success'}>{v}</Badge> : '-' },
    { key: 'status', label: 'Status', render: (v) => <Badge dot>{v}</Badge> },
  ];

  const displayPunchedIn = isLive ? liveIsPunchedIn : punchedIn;
  const displayPunchInTime = isLive ? (todayAttendance?.punchIn || '--:--') : punchInTime;
  const displayWorkingHours = isLive
    ? (liveIsPunchedIn && todayAttendance?.checkInTimeRaw ? computeLiveWorkingHours(todayAttendance.checkInTimeRaw) : (todayAttendance?.hours || '-'))
    : workingHours;

  const weekSummary = useMemo(() => {
    const log = isLive && liveWeekLog ? liveWeekLog : myWeekLog;
    return {
      present: log.filter(l => l.status === 'Present').length,
      late: log.filter(l => l.status === 'Late').length,
      absent: log.filter(l => l.status === 'Absent').length,
      wfh: log.filter(l => l.mode === 'WFH').length,
    };
  }, [isLive, liveWeekLog]);

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Attendance' }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">{isEmployee ? 'My Attendance' : 'Attendance'}</h1>
        {!attendanceLoading && !isLive && <span className="text-sm text-warning">(demo data)</span>}
      </div>

      {/* Employee: Punch In/Out Card */}
      {isEmployee && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-1">
            <div className="text-center py-4">
              <div className={`w-28 h-28 rounded-full border-4 ${displayPunchedIn ? 'border-success' : 'border-surface-4'} mx-auto flex items-center justify-center mb-3 transition-colors`}>
                <div>
                  <p className="text-lg font-bold text-text">{displayPunchedIn ? displayPunchInTime : '--:--'}</p>
                  <p className="text-[10px] text-text-secondary">{displayPunchedIn ? 'Punched In' : 'Not Punched In'}</p>
                </div>
              </div>
              {displayPunchedIn && <p className="text-sm text-text-secondary mb-1">Working: <span className="text-text font-semibold">{displayWorkingHours}</span></p>}
              <button disabled={punchBusy} onClick={handlePunch} className={`mt-3 px-8 py-2.5 rounded-xl text-sm font-semibold transition-all text-white shadow-lg disabled:opacity-60 ${displayPunchedIn ? 'bg-danger hover:bg-danger/80 shadow-danger/20' : 'bg-success hover:bg-success/80 shadow-success/20'}`}>
                {punchBusy ? 'Please wait...' : displayPunchedIn ? 'Punch Out' : 'Punch In'}
              </button>
            </div>
          </Card>
          <Card className="md:col-span-2" title="This Week's Summary">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Present', value: weekSummary.present, color: 'text-success' },
                { label: 'Late', value: weekSummary.late, color: 'text-warning' },
                { label: 'Absent', value: weekSummary.absent, color: 'text-danger' },
                { label: 'WFH', value: weekSummary.wfh, color: 'text-info' },
              ].map(s => (
                <div key={s.label} className="text-center p-3 bg-surface-3 rounded-xl">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-text-secondary mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Manager: Team stats */}
      {isManager && (attendanceLoading || (isLive && !liveTeamLog)) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="stat" />)}
        </div>
      )}
      {isManager && !attendanceLoading && !(isLive && !liveTeamLog) && (() => {
        const teamData = isLive && liveTeamLog ? liveTeamLog : teamLog;
        const isRealTeamData = isLive && !!liveTeamLog;
        const total = teamData.length || 1;
        const present = teamData.filter(t => t.status === 'Present').length;
        const absent = teamData.filter(t => t.status === 'Absent').length;
        const late = teamData.filter(t => t.status === 'Late').length;
        const wfh = teamData.filter(t => t.mode === 'WFH').length;
        const pct = (n) => `${((n / total) * 100).toFixed(1)}%${isRealTeamData ? '' : ' (demo data)'}`;
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Labeled "Today" throughout - these KPIs and the Weekly Trend chart below are
                deliberately different scopes (today's snapshot vs this week's Mon-Fri history),
                not the same dataset. "Absent" without a scope read as contradicting the trend
                chart's per-day numbers when they're simply different days. */}
            <StatCard icon={UserCheck} label="Present Today" value={present} change={pct(present)} color="success" delay={0} />
            <StatCard icon={UserX} label="Absent Today" value={absent} change={pct(absent)} changeType="negative" color="danger" delay={1} />
            <StatCard icon={Timer} label="Late Today" value={late} change={pct(late)} changeType="negative" color="warning" delay={2} />
            <StatCard icon={MapPin} label="WFH Today" value={wfh} change={pct(wfh)} color="info" delay={3} />
          </div>
        );
      })()}

      {/* Manager: Team chart */}
      {isManager && (() => {
        const trendData = isLive && liveTeamTrend ? liveTeamTrend : ATTENDANCE_DATA;
        const selectedDay = trendData.find(d => d.date === selectedTrendDay);
        return (
          <Card title="Weekly Attendance Trend" subtitle={isLive && liveTeamTrend ? undefined : '(demo data — connect to live backend for real trend)'}>
            <div className="h-48">
              <ResponsiveContainer>
                <BarChart data={trendData} onClick={(e) => { if (e?.activeLabel) setSelectedTrendDay(prev => prev === e.activeLabel ? null : e.activeLabel); }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  {/* A fixed-width cursor sized to a single category band, instead of the
                      default full-band rectangle that visually bled into the neighboring
                      day's bars on this narrow chart. */}
                  <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} contentStyle={{ background: '#1F2937', border: '1px solid #2C3445', borderRadius: 8, fontSize: 12, color: '#F1F5F9' }} />
                  <Bar dataKey="present" fill="#34D399" radius={[4, 4, 0, 0]} name="Present" cursor="pointer" />
                  <Bar dataKey="absent" fill="#F87171" radius={[4, 4, 0, 0]} name="Absent" cursor="pointer" />
                  <Bar dataKey="late" fill="#FBBF24" radius={[4, 4, 0, 0]} name="Late" cursor="pointer" />
                  <Bar dataKey="wfh" fill="#38BDF8" radius={[4, 4, 0, 0]} name="WFH" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {selectedDay && (
              <div className="mt-3 pt-3 border-t border-border grid grid-cols-4 gap-3 text-center">
                {[['Present', selectedDay.present, 'text-success'], ['Absent', selectedDay.absent, 'text-danger'], ['Late', selectedDay.late, 'text-warning'], ['WFH', selectedDay.wfh ?? 0, 'text-info']].map(([label, value, color]) => (
                  <div key={label}>
                    <p className={`text-lg font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-text-secondary">{selectedDay.date} · {label}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })()}

      {/* Employee: My attendance log */}
      {isEmployee && (
        <Card title="My Attendance Log" padding={false}>
          <DataTable columns={myColumns} data={isLive && liveWeekLog ? liveWeekLog : myWeekLog} />
        </Card>
      )}

      {/* Manager: Team attendance log */}
      {isManager && (
        <Card title="Today's Team Attendance" subtitle={isLive && liveTeamLog ? undefined : '(demo data — connect to live backend for real team list)'} padding={false}>
          <DataTable columns={teamColumns} data={isLive && liveTeamLog ? liveTeamLog : teamLog} />
        </Card>
      )}
    </div>
  );
}
