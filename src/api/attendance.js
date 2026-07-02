import { api } from './client';

// Maps backend AttendanceResponse -> shape the mock-driven AttendancePage.jsx UI expects
const STATUS_TO_FE = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  HALF_DAY: 'Half Day',
  ON_LEAVE: 'On Leave',
  WEEKEND: 'Weekend',
  HOLIDAY: 'Holiday',
};

function formatTime(t) {
  if (!t) return '-';
  // LocalTime serializes as "HH:mm:ss" or "HH:mm"
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, '0')}:${m} ${ampm}`;
}

function formatHours(hrs) {
  if (hrs === undefined || hrs === null) return '-';
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  return `${h}h ${m}m`;
}

export function adaptAttendance(a) {
  if (!a) return null;
  return {
    id: a.id,
    date: a.date,
    day: a.date ? new Date(a.date).toLocaleDateString('en-US', { weekday: 'long' }) : '',
    name: a.employeeName,
    empId: a.employeeId,
    punchIn: formatTime(a.checkInTime),
    punchOut: formatTime(a.checkOutTime),
    hours: formatHours(a.workingHours),
    overtimeHours: a.overtimeHours,
    status: STATUS_TO_FE[a.status] || a.status,
    mode: a.source === 'WEB' ? 'Office' : a.source === 'WFH' ? 'WFH' : a.source || '-',
    isRegularized: a.isRegularized,
  };
}

export function adaptSummary(s) {
  if (!s) return null;
  return {
    totalDays: s.totalDays,
    presentDays: s.presentDays,
    absentDays: s.absentDays,
    halfDays: s.halfDays,
    leaveDays: s.leaveDays,
    holidays: s.holidays,
    weekends: s.weekends,
    avgWorkingHours: s.avgWorkingHours,
    totalOvertimeHours: s.totalOvertimeHours,
  };
}

export async function checkIn({ source = 'WEB', remarks } = {}) {
  return adaptAttendance(await api.post('/attendance/check-in', { source, remarks }));
}

export async function checkOut({ remarks } = {}) {
  return adaptAttendance(await api.post('/attendance/check-out', { remarks }));
}

export async function getTodayAttendance() {
  return adaptAttendance(await api.get('/attendance/today'));
}

export async function getMyAttendance(start, end) {
  const data = await api.get('/attendance/my', { start, end });
  return (data || []).map(adaptAttendance);
}

export async function getTeamAttendance(date) {
  const data = await api.get('/attendance/team', date ? { date } : undefined);
  return (data || []).map(adaptAttendance);
}

export async function getMonthlySummary(employeeId, year, month) {
  return adaptSummary(await api.get(`/attendance/summary/${employeeId}`, { year, month }));
}

export async function requestRegularization({ attendanceId, requestedStatus, reason }) {
  return api.post('/attendance/regularization', { attendanceId, requestedStatus, reason });
}

export async function processRegularization(id, action, comments = '') {
  return api.put(`/attendance/regularization/${id}/action`, { action, comments });
}
