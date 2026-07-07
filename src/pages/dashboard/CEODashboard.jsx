import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, CheckCircle, MapPin, IndianRupee, TrendingUp, CalendarDays, Zap, Bot, Bell, UserCheck, UserX, Building2, AlertTriangle, Clock, GitBranch, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import Avatar from '../../components/ui/Avatar';
import { useData } from '../../context/DataContext';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { useState, useMemo, useEffect } from 'react';
import SensitiveValue from '../../components/ui/SensitiveValue';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { ShieldCheck, FileWarning } from 'lucide-react';
import { getDashboardStats } from '../../api/reports';
import { getProjectMembers } from '../../api/projects';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Builds the trailing N calendar months ending this month, e.g. [{year,month,label}, ...]
function lastNMonths(n) {
  const now = new Date();
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] });
  }
  return months;
}

export default function CEODashboard() {
  const navigate = useNavigate();
  const { data, stats, projectsSource } = useData();
  const [quickActions, setQuickActions] = useState(false);
  const [onboardingStats, setOnboardingStats] = useState(null);
  const [billableEmployeeIds, setBillableEmployeeIds] = useState(null); // null = not loaded/live yet

  useEffect(() => {
    getDashboardStats().then(setOnboardingStats).catch(() => {});
  }, []);

  // Real bench/billable split: an employee is billable if they hold at least one active
  // ProjectMember row with allocationPercentage > 0. Previously this was a hardcoded 8%/72% split
  // completely disconnected from actual project allocations.
  useEffect(() => {
    if (projectsSource !== 'live' || data.projects.length === 0) { setBillableEmployeeIds(null); return; }
    let cancelled = false;
    Promise.all(data.projects.map(p => getProjectMembers(p.id).catch(() => [])))
      .then(results => {
        if (cancelled) return;
        const ids = new Set();
        results.flat().forEach(m => { if (m.isActive && (m.allocationPercentage || 0) > 0) ids.add(m.employeeId); });
        setBillableEmployeeIds(ids);
      });
    return () => { cancelled = true; };
  }, [projectsSource, data.projects]);

  // Real headcount growth + payroll cost trend, computed from actual employee join dates and payslips
  const revenueData = useMemo(() => {
    const months = lastNMonths(6);
    return months.map(({ year, month, label }) => {
      const monthEnd = new Date(year, month + 1, 0);
      const headcount = data.employees.filter(e => e.joinDate && new Date(e.joinDate) <= monthEnd).length;
      const payrollCost = data.payslips
        .filter(p => p.monthNum != null ? (p.monthNum - 1 === month && p.year === year) : (p.month || '').startsWith(label))
        .reduce((sum, p) => sum + (p.netPay || 0), 0);
      return { month: label, revenue: +(payrollCost / 10000000).toFixed(2), employees: headcount };
    });
  }, [data.employees, data.payslips]);

  const attritionData = useMemo(() => {
    const months = lastNMonths(6);
    return months.map(({ year, month, label }) => {
      const joined = data.employees.filter(e => {
        if (!e.joinDate) return false;
        const d = new Date(e.joinDate);
        return d.getFullYear() === year && d.getMonth() === month;
      }).length;
      const left = data.employees.filter(e => {
        if (!e.exitDate || (e.status !== 'Resigned' && e.status !== 'Terminated')) return false;
        const d = new Date(e.exitDate);
        return d.getFullYear() === year && d.getMonth() === month;
      }).length;
      return { month: label, joined, left };
    });
  }, [data.employees]);

  const deptData = useMemo(() => {
    const colors = ['#FF6A00','#58A6FF','#A371F7','#2EA043','#D29922','#F85149','#8B949E','#FF8C33','#6E7681','#CC5500','#3FB950','#DA3633'];
    const counts = data.employees.reduce((acc, e) => { const key = e.department || 'Unassigned'; acc[key] = (acc[key] || 0) + 1; return acc; }, {});
    const sorted = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    // Previously silently dropped anything past the top 6 departments while the donut's center
    // "Total" still counted every employee - the legend could never add up to that number once a
    // company had more than 6 departments (or any employee with no department assigned). Folding
    // the remainder into "Other" keeps the legend sum always equal to the displayed total.
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5).reduce((sum, d) => sum + d.value, 0);
    const result = top.map((d, i) => ({ ...d, color: colors[i % colors.length] }));
    if (rest > 0) result.push({ name: 'Other', value: rest, color: colors[5] });
    return result;
  }, [data.employees]);

  const projectHealth = useMemo(() => {
    const counts = data.projects.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value, color: { 'On Track': '#2EA043', 'At Risk': '#D29922', Delayed: '#F85149', Completed: '#58A6FF', 'On Hold': '#8B949E' }[name] || '#6E7681' }));
  }, [data.projects]);

  const activeEmployees = useMemo(() => data.employees.filter(e => e.status === 'Active'), [data.employees]);
  const billableCount = useMemo(() => {
    if (!billableEmployeeIds) return Math.floor(activeEmployees.length * 0.72); // demo fallback until live data loads
    return activeEmployees.filter(e => billableEmployeeIds.has(e.id)).length;
  }, [activeEmployees, billableEmployeeIds]);
  const benchCount = useMemo(() => {
    if (!billableEmployeeIds) return Math.floor(activeEmployees.length * 0.08); // demo fallback until live data loads
    return activeEmployees.length - billableCount;
  }, [activeEmployees, billableEmployeeIds, billableCount]);

  const companySnapshot = useMemo(() => {
    const attritionYtd = attritionData.reduce((s, d) => s + d.left, 0);
    const totalNow = stats.total || 1;
    const attritionRate = ((attritionYtd / totalNow) * 100).toFixed(1);
    const offeredOrBeyond = data.candidates.filter(c => ['Offered', 'Hired'].includes(c.stage)).length;
    const hired = data.candidates.filter(c => c.stage === 'Hired').length;
    const offerAcceptanceRate = offeredOrBeyond > 0 ? Math.round((hired / offeredOrBeyond) * 100) : 0;
    return [
      { label: 'Attrition Rate (YTD)', value: `${attritionRate}%`, color: 'warning' },
      { label: 'Offer Acceptance Rate', value: `${offerAcceptanceRate}%`, color: 'success' },
    ];
  }, [attritionData, data.candidates, stats.total]);

  const pendingApprovals = [
    { label: 'Leave Requests', count: stats.pendingLeaves, path: '/leave', icon: CalendarDays },
    { label: 'Timesheets', count: stats.pendingTimesheets, path: '/timesheets', icon: Clock },
    { label: 'Open Tickets', count: stats.openTickets, path: '/tickets', icon: AlertTriangle },
    { label: 'Pending Offers', count: data.candidates.filter(c => c.stage === 'Offered').length, path: '/recruitment', icon: Users },
  ];

  const todayLeave = data.employees.filter(e => e.status === 'On Leave').slice(0, 6);
  const recentJoinees = [...data.employees].sort((a, b) => (b.joinDate || '').localeCompare(a.joinDate || '')).slice(0, 5);
  const noticePeriod = data.employees.filter(e => e.status === 'Notice Period');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button icon={Zap} size="sm" onClick={() => setQuickActions(true)}>Quick Actions</Button>
          <Button icon={Bot} variant="secondary" size="sm" onClick={() => navigate('/help')}>AI Assistant</Button>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <span>Pending Approvals: <span className="text-primary font-bold">{pendingApprovals.reduce((s, p) => s + p.count, 0)}</span></span>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="cursor-pointer" onClick={() => navigate('/employees')}><StatCard icon={Users} label="Total Employees" value={stats.total} change={`${stats.active} active`} delay={0} /></div>
        <div className="cursor-pointer" onClick={() => navigate('/projects')}><StatCard icon={Briefcase} label="Active Projects" value={stats.activeProjects} change={`${data.projects.length} total`} color="info" delay={1} /></div>
        <div className="cursor-pointer" onClick={() => navigate('/resources')}><StatCard icon={GitBranch} label="Billable" value={billableCount} change={`${Math.round(billableCount/stats.active*100)}% utilization`} color="success" delay={2} /></div>
        <div className="cursor-pointer" onClick={() => navigate('/resources')}><StatCard icon={AlertTriangle} label="Bench" value={benchCount} change="Needs allocation" changeType="negative" color="danger" delay={3} /></div>
        <div className="cursor-pointer" onClick={() => navigate('/payroll')}><StatCard icon={IndianRupee} label="Monthly Payroll" value={<SensitiveValue type="currency" value={stats.totalPayroll} id="dashboard-monthly-payroll" />} color="primary" delay={4} showSparkline={false} /></div>
        <div className="cursor-pointer" onClick={() => navigate('/recruitment')}><StatCard icon={Target} label="Hiring Pipeline" value={stats.totalCandidates} change={`${data.candidates.filter(c => c.stage === 'Offered').length} offered`} color="warning" delay={5} /></div>
      </div>

      {/* Onboarding & Compliance - only rendered once the real backend stats have loaded, since
          these 3 counts (unlike the rest of this page) aren't derivable from client-side mock data */}
      {onboardingStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="cursor-pointer" onClick={() => navigate('/employees')}><StatCard icon={UserX} label="Pending Onboarding" value={onboardingStats.pendingOnboardingCount} change="Incomplete profiles" changeType="negative" color="warning" delay={0} showSparkline={false} /></div>
          <div className="cursor-pointer" onClick={() => navigate('/background-verification')}><StatCard icon={ShieldCheck} label="Pending BGV" value={onboardingStats.pendingBgvCount} change="Not fully cleared" changeType="negative" color="danger" delay={1} showSparkline={false} /></div>
          <div className="cursor-pointer" onClick={() => navigate('/documents')}><StatCard icon={FileWarning} label="Pending Documents" value={onboardingStats.pendingDocumentsCount} change="No documents on file" changeType="negative" color="warning" delay={2} showSparkline={false} /></div>
        </div>
      )}

      {/* Pending Approvals - CEO's primary action area */}
      <Card title="Pending Approvals" subtitle="Items requiring your attention">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {pendingApprovals.map(a => (
            <button key={a.label} onClick={() => navigate(a.path)} className="p-4 bg-surface-3 rounded-xl hover:bg-surface-4 hover:border-primary/30 border border-transparent transition-all text-left group">
              <div className="flex items-center justify-between mb-2">
                <a.icon size={18} className="text-text-secondary group-hover:text-primary transition-colors" />
                <span className="text-2xl font-bold text-text">{a.count}</span>
              </div>
              <p className="text-xs text-text-secondary font-medium">{a.label}</p>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue & Growth */}
        <Card title="Payroll Cost & Employee Growth" className="lg:col-span-2" action={<button onClick={() => navigate('/reports')} className="text-xs text-primary hover:underline">Full Report</button>}>
          <div className="h-52">
            <ResponsiveContainer>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF6A00" stopOpacity={0.3} /><stop offset="100%" stopColor="#FF6A00" stopOpacity={0} /></linearGradient>
                  <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#58A6FF" stopOpacity={0.3} /><stop offset="100%" stopColor="#58A6FF" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8B949E' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#8B949E' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#8B949E' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #30363D', borderRadius: 8, fontSize: 12, color: '#E6EDF3' }} />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#FF6A00" strokeWidth={2} fill="url(#revGrad)" name="Payroll Cost (Cr)" />
                <Area yAxisId="right" type="monotone" dataKey="employees" stroke="#58A6FF" strokeWidth={2} fill="url(#empGrad)" name="Headcount" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Attrition */}
        <Card title="Hiring vs Attrition" action={<button onClick={() => navigate('/reports')} className="text-xs text-primary hover:underline">View Report</button>}>
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={attritionData}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8B949E' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8B949E' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #30363D', borderRadius: 8, fontSize: 12, color: '#E6EDF3' }} />
                <Bar dataKey="joined" fill="#2EA043" radius={[4, 4, 0, 0]} name="Joined" />
                <Bar dataKey="left" fill="#F85149" radius={[4, 4, 0, 0]} name="Left" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-xs mt-2">
            <span className="text-success flex items-center gap-1"><ArrowUpRight size={12} /> {attritionData.reduce((s, d) => s + d.joined, 0)} joined YTD</span>
            <span className="text-danger flex items-center gap-1"><ArrowDownRight size={12} /> {attritionData.reduce((s, d) => s + d.left, 0)} left YTD</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Project Health */}
        <Card title="Project Health" action={<button onClick={() => navigate('/projects')} className="text-xs text-primary hover:underline">View All</button>}>
          <div className="flex items-center gap-4">
            <div className="w-28 h-28 relative">
              <ResponsiveContainer><PieChart><Pie data={projectHealth} cx="50%" cy="50%" innerRadius={30} outerRadius={48} dataKey="value" stroke="none">{projectHealth.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie></PieChart></ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-lg font-bold text-text">{data.projects.length}</span><span className="text-[9px] text-text-secondary">Projects</span></div>
            </div>
            <div className="space-y-2 text-xs flex-1">
              {projectHealth.map(d => (
                <div key={d.name} className="flex items-center justify-between cursor-pointer hover:bg-surface-3 rounded px-1 -mx-1 py-0.5" onClick={() => navigate('/projects')}>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} /><span className="text-text-secondary">{d.name}</span></div>
                  <span className="text-text font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Department Distribution */}
        <Card title="Department Distribution" action={<button onClick={() => navigate('/org-chart')} className="text-xs text-primary hover:underline">Org Chart</button>}>
          <div className="flex items-center gap-4">
            <div className="w-28 h-28 relative">
              <ResponsiveContainer><PieChart><Pie data={deptData} cx="50%" cy="50%" innerRadius={30} outerRadius={48} dataKey="value" stroke="none">{deptData.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie></PieChart></ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-lg font-bold text-text">{stats.total}</span><span className="text-[9px] text-text-secondary">Total</span></div>
            </div>
            <div className="space-y-2 text-xs flex-1">
              {deptData.map(d => (
                <div key={d.name} className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} /><span className="text-text-secondary truncate max-w-[80px]">{d.name}</span></div><span className="text-text font-medium">{d.value}</span></div>
              ))}
            </div>
          </div>
        </Card>

        {/* Company Overview Stats */}
        <Card title="Company Snapshot">
          <div className="space-y-3">
            {companySnapshot.map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">{s.label}</span>
                <span className={`text-sm font-semibold text-${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="On Leave Today" action={<button onClick={() => navigate('/leave')} className="text-xs text-primary hover:underline">View All</button>}>
          <div className="space-y-2">
            {todayLeave.length > 0 ? todayLeave.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-3 cursor-pointer" onClick={() => navigate('/employees')}>
                <Avatar name={e.name} size="sm" />
                <div className="min-w-0 flex-1"><p className="text-xs font-medium text-text truncate">{e.name}</p><p className="text-[10px] text-text-secondary">{e.department}</p></div>
              </div>
            )) : <p className="text-xs text-text-secondary py-4 text-center">No one on leave today</p>}
          </div>
        </Card>

        <Card title="Notice Period" action={<span className="text-xs text-danger font-medium">{noticePeriod.length} employees</span>}>
          <div className="space-y-2">
            {noticePeriod.length > 0 ? noticePeriod.slice(0, 5).map(e => (
              <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-3 cursor-pointer" onClick={() => navigate('/employees')}>
                <Avatar name={e.name} size="sm" />
                <div className="min-w-0 flex-1"><p className="text-xs font-medium text-text truncate">{e.name}</p><p className="text-[10px] text-text-secondary">{e.designation}</p></div>
                <Badge variant="danger">Exiting</Badge>
              </div>
            )) : <p className="text-xs text-text-secondary py-4 text-center">No employees in notice period</p>}
          </div>
        </Card>

        <Card title="Recent Joinees" action={<button onClick={() => navigate('/employees')} className="text-xs text-primary hover:underline">View All</button>}>
          <div className="space-y-2">
            {recentJoinees.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-3 cursor-pointer" onClick={() => navigate('/employees')}>
                <Avatar name={e.name} size="sm" />
                <div className="min-w-0 flex-1"><p className="text-xs font-medium text-text truncate">{e.name}</p><p className="text-[10px] text-text-secondary">{e.designation}</p></div>
                <span className="text-[10px] text-text-secondary">{e.joinDate}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions Modal */}
      <Modal open={quickActions} onClose={() => setQuickActions(false)} title="Quick Actions">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Approve Leaves', icon: CalendarDays, path: '/leave' },
            { label: 'Review Timesheets', icon: Clock, path: '/timesheets' },
            { label: 'Run Payroll', icon: IndianRupee, path: '/payroll' },
            { label: 'View Recruitment', icon: Users, path: '/recruitment' },
            { label: 'Organization Chart', icon: Building2, path: '/org-chart' },
            { label: 'Resource Allocation', icon: GitBranch, path: '/resources' },
            { label: 'Company Reports', icon: TrendingUp, path: '/reports' },
            { label: 'System Settings', icon: Target, path: '/settings' },
          ].map(a => (
            <button key={a.label} onClick={() => { navigate(a.path); setQuickActions(false); }} className="flex items-center gap-3 p-4 bg-surface-3 rounded-xl hover:bg-surface-4 hover:border-primary/30 border border-transparent transition-all text-left">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><a.icon size={18} className="text-primary" /></div>
              <span className="text-sm font-medium text-text">{a.label}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
