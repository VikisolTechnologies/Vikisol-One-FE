import { useState } from 'react';
import { Clock, UserCheck, UserX, Timer, MapPin } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
  const isManager = ['ceo', 'hr_manager', 'manager', 'admin'].includes(user?.role);
  const isEmployee = user?.role === 'employee';

  const [punchedIn, setPunchedIn] = useState(true);
  const [punchInTime] = useState('09:10 AM');
  const [workingHours, setWorkingHours] = useState('7h 22m');

  const handlePunch = () => {
    if (punchedIn) {
      setPunchedIn(false);
      const now = new Date();
      toast.success(`Punched out at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
    } else {
      setPunchedIn(true);
      toast.success(`Punched in at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
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

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Attendance' }]} />
      <h1 className="text-xl font-bold text-text">{isEmployee ? 'My Attendance' : 'Attendance'}</h1>

      {/* Employee: Punch In/Out Card */}
      {isEmployee && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-1">
            <div className="text-center py-4">
              <div className={`w-28 h-28 rounded-full border-4 ${punchedIn ? 'border-success' : 'border-surface-4'} mx-auto flex items-center justify-center mb-3 transition-colors`}>
                <div>
                  <p className="text-lg font-bold text-text">{punchedIn ? punchInTime : '--:--'}</p>
                  <p className="text-[10px] text-text-secondary">{punchedIn ? 'Punched In' : 'Not Punched In'}</p>
                </div>
              </div>
              {punchedIn && <p className="text-sm text-text-secondary mb-1">Working: <span className="text-text font-semibold">{workingHours}</span></p>}
              <button onClick={handlePunch} className={`mt-3 px-8 py-2.5 rounded-xl text-sm font-semibold transition-all text-white shadow-lg ${punchedIn ? 'bg-danger hover:bg-danger/80 shadow-danger/20' : 'bg-success hover:bg-success/80 shadow-success/20'}`}>
                {punchedIn ? 'Punch Out' : 'Punch In'}
              </button>
            </div>
          </Card>
          <Card className="md:col-span-2" title="This Week's Summary">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Present', value: 5, color: 'text-success' },
                { label: 'Late', value: 1, color: 'text-warning' },
                { label: 'Absent', value: 0, color: 'text-danger' },
                { label: 'WFH', value: 1, color: 'text-info' },
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
      {isManager && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={UserCheck} label="Present Today" value="210" change="85.7%" color="success" delay={0} />
          <StatCard icon={UserX} label="Absent" value="15" change="6.1%" changeType="negative" color="danger" delay={1} />
          <StatCard icon={Timer} label="Late Arrivals" value="12" change="4.9%" changeType="negative" color="warning" delay={2} />
          <StatCard icon={MapPin} label="WFH" value="8" change="3.3%" color="info" delay={3} />
        </div>
      )}

      {/* Manager: Team chart */}
      {isManager && (
        <Card title="Weekly Attendance Trend">
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={ATTENDANCE_DATA}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #2C3445', borderRadius: 8, fontSize: 12, color: '#F1F5F9' }} />
                <Bar dataKey="present" fill="#34D399" radius={[4, 4, 0, 0]} name="Present" />
                <Bar dataKey="absent" fill="#F87171" radius={[4, 4, 0, 0]} name="Absent" />
                <Bar dataKey="late" fill="#FBBF24" radius={[4, 4, 0, 0]} name="Late" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Employee: My attendance log */}
      {isEmployee && (
        <Card title="My Attendance Log" padding={false}>
          <DataTable columns={myColumns} data={myWeekLog} />
        </Card>
      )}

      {/* Manager: Team attendance log */}
      {isManager && (
        <Card title="Today's Team Attendance" padding={false}>
          <DataTable columns={teamColumns} data={teamLog} />
        </Card>
      )}
    </div>
  );
}
