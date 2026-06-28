import { Clock, UserCheck, UserX, Timer, MapPin } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ATTENDANCE_DATA = [
  { date: '2024-05-20', present: 210, absent: 15, late: 12, wfh: 8 },
  { date: '2024-05-19', present: 220, absent: 10, late: 8, wfh: 7 },
  { date: '2024-05-18', present: 215, absent: 12, late: 10, wfh: 8 },
  { date: '2024-05-17', present: 225, absent: 8, late: 6, wfh: 6 },
  { date: '2024-05-16', present: 218, absent: 14, late: 9, wfh: 4 },
];

const dailyLog = [
  { id: 1, name: 'Aarav Patel', empId: 'VKS101', punchIn: '09:15 AM', punchOut: '06:30 PM', hours: '9h 15m', status: 'Present', mode: 'Office' },
  { id: 2, name: 'Neha Joshi', empId: 'VKS102', punchIn: '09:45 AM', punchOut: '06:00 PM', hours: '8h 15m', status: 'Present', mode: 'WFH' },
  { id: 3, name: 'Rahul Sharma', empId: 'VKS103', punchIn: '10:15 AM', punchOut: '07:00 PM', hours: '8h 45m', status: 'Late', mode: 'Office' },
  { id: 4, name: 'Karan Malhotra', empId: 'VKS107', punchIn: '-', punchOut: '-', hours: '-', status: 'Absent', mode: '-' },
  { id: 5, name: 'Deepa Menon', empId: 'VKS106', punchIn: '09:00 AM', punchOut: '-', hours: '7h 30m', status: 'Present', mode: 'Hybrid' },
];

const columns = [
  { key: 'name', label: 'Employee', render: (v, row) => <div><p className="font-medium text-text text-sm">{v}</p><p className="text-xs text-text-secondary">{row.empId}</p></div> },
  { key: 'punchIn', label: 'Punch In' },
  { key: 'punchOut', label: 'Punch Out' },
  { key: 'hours', label: 'Hours' },
  { key: 'mode', label: 'Mode', render: (v) => v !== '-' ? <Badge variant={v === 'WFH' ? 'info' : v === 'Hybrid' ? 'warning' : 'success'}>{v}</Badge> : '-' },
  { key: 'status', label: 'Status', render: (v) => <Badge dot>{v}</Badge> },
];

export default function AttendancePage() {
  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Attendance' }]} />
      <h1 className="text-xl font-bold text-text">Attendance</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={UserCheck} label="Present Today" value="210" change="85.7%" color="success" delay={0} />
        <StatCard icon={UserX} label="Absent" value="15" change="6.1%" changeType="negative" color="danger" delay={1} />
        <StatCard icon={Timer} label="Late Arrivals" value="12" change="4.9%" changeType="negative" color="warning" delay={2} />
        <StatCard icon={MapPin} label="WFH" value="8" change="3.3%" color="info" delay={3} />
      </div>

      <Card title="Weekly Attendance Trend">
        <div className="h-48">
          <ResponsiveContainer>
            <BarChart data={ATTENDANCE_DATA}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8B949E' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8B949E' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #30363D', borderRadius: 8, fontSize: 12, color: '#E6EDF3' }} />
              <Bar dataKey="present" fill="#2EA043" radius={[4, 4, 0, 0]} name="Present" />
              <Bar dataKey="absent" fill="#F85149" radius={[4, 4, 0, 0]} name="Absent" />
              <Bar dataKey="late" fill="#D29922" radius={[4, 4, 0, 0]} name="Late" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Today's Attendance Log" padding={false}>
        <DataTable columns={columns} data={dailyLog} />
      </Card>
    </div>
  );
}
