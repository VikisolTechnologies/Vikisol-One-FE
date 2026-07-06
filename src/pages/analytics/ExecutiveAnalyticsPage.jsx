import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Target, TrendingUp, IndianRupee, CalendarDays, ShieldCheck, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { getExecutiveAnalytics } from '../../api/reports';
import { useToast } from '../../components/ui/Toast';

const COLORS = ['#FF6A00', '#58A6FF', '#A371F7', '#2EA043', '#D29922', '#F85149', '#8B949E', '#FF8C33'];

function toChartData(map) {
  if (!map) return [];
  return Object.entries(map).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
}

export default function ExecutiveAnalyticsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExecutiveAnalytics()
      .then(setData)
      .catch(err => toast.error(err.message || 'Failed to load executive analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-text-secondary">Loading analytics...</p>;
  if (!data) return <p className="text-sm text-text-secondary">Analytics unavailable.</p>;

  const { recruitment, workforce, payroll, leave, bgv, assets } = data;
  const workforceChart = [
    { name: 'Active', value: workforce.activeCount, color: '#2EA043' },
    { name: 'Probation', value: workforce.probationCount, color: '#D29922' },
    { name: 'Notice Period', value: workforce.noticePeriodCount, color: '#F85149' },
    { name: 'Offboarding', value: workforce.offboardingCount, color: '#8B949E' },
  ].filter(d => d.value > 0);

  const headcountTrend = Object.entries(workforce.headcountGrowthByMonth || {}).map(([month, value]) => ({ month, value }));
  const leaveTrend = Object.entries(leave.leaveRequestsByMonth || {}).map(([month, value]) => ({ month, value }));
  const salaryBuckets = toChartData(payroll.salaryDistributionBuckets);
  const departmentDist = toChartData(workforce.departmentDistribution);
  const locationDist = toChartData(workforce.locationDistribution);
  const leaveByType = Object.entries(leave.leaveDaysByType || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Executive Analytics' }]} />
      <div>
        <h1 className="text-xl font-bold text-text">Executive HR Analytics</h1>
        <p className="text-sm text-text-secondary">Real-time metrics across recruitment, workforce, payroll, leave, BGV, and assets.</p>
      </div>

      {/* Recruitment */}
      <Card title="Recruitment">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="cursor-pointer" onClick={() => navigate('/recruitment')}><StatCard icon={Target} label="Candidate Conversion" value={`${recruitment.candidateConversionRate.toFixed(1)}%`} showSparkline={false} color="primary" /></div>
          <div className="cursor-pointer" onClick={() => navigate('/recruitment')}><StatCard icon={Users} label="Interview Conversion" value={`${recruitment.interviewConversionRate.toFixed(1)}%`} showSparkline={false} color="info" /></div>
          <div className="cursor-pointer" onClick={() => navigate('/recruitment')}><StatCard icon={TrendingUp} label="Offer Acceptance" value={`${recruitment.offerAcceptanceRate.toFixed(1)}%`} showSparkline={false} color="success" /></div>
          <div className="cursor-pointer" onClick={() => navigate('/recruitment')}><StatCard icon={CalendarDays} label="Avg Time to Hire" value={recruitment.avgTimeToHireDays != null ? `${recruitment.avgTimeToHireDays.toFixed(0)}d` : '-'} showSparkline={false} color="warning" /></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Hiring Funnel</p>
            <div className="h-48">
              <ResponsiveContainer>
                <BarChart data={toChartData(recruitment.hiringFunnel)} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#8B949E' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#8B949E' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #30363D', borderRadius: 8, fontSize: 12, color: '#E6EDF3' }} />
                  <Bar dataKey="value" fill="#FF6A00" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Recruiter Performance</p>
              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {recruitment.recruiterPerformance?.length ? recruitment.recruiterPerformance.map(r => (
                  <div key={r.recruiterName} className="flex items-center justify-between text-xs p-2 bg-surface-3 rounded-lg">
                    <span className="text-text">{r.recruiterName}</span>
                    <span className="text-text-secondary">{r.candidatesHandled} handled &middot; <span className="text-success font-medium">{r.hires} hires</span></span>
                  </div>
                )) : <p className="text-xs text-text-secondary">No recruiter-assigned candidates yet.</p>}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Hiring Manager Performance</p>
              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {recruitment.hiringManagerPerformance?.length ? recruitment.hiringManagerPerformance.map(r => (
                  <div key={r.hiringManagerName} className="flex items-center justify-between text-xs p-2 bg-surface-3 rounded-lg">
                    <span className="text-text">{r.hiringManagerName}</span>
                    <span className="text-text-secondary">{r.candidatesHandled} handled &middot; <span className="text-success font-medium">{r.hires} hires</span></span>
                  </div>
                )) : <p className="text-xs text-text-secondary">No hiring-manager-assigned candidates yet.</p>}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Workforce */}
      <Card title="Workforce">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="cursor-pointer" onClick={() => navigate('/employees')}><StatCard icon={Users} label="Total Employees" value={workforce.totalEmployees} showSparkline={false} /></div>
          <div className="cursor-pointer" onClick={() => navigate('/employees')}><StatCard icon={Users} label="Active" value={workforce.activeCount} showSparkline={false} color="success" /></div>
          <div className="cursor-pointer" onClick={() => navigate('/employees')}><StatCard icon={Users} label="Probation" value={workforce.probationCount} showSparkline={false} color="warning" /></div>
          <div className="cursor-pointer" onClick={() => navigate('/employees')}><StatCard icon={Users} label="Notice Period" value={workforce.noticePeriodCount} showSparkline={false} color="danger" /></div>
          <div className="cursor-pointer" onClick={() => navigate('/offboarding')}><StatCard icon={Users} label="Offboarding" value={workforce.offboardingCount} showSparkline={false} color="default" /></div>
        </div>
        {workforce.attritionRatePercent != null && (
          <p className="text-xs text-text-secondary mb-3">Attrition rate (trailing 12 months): <span className={`font-semibold ${workforce.attritionRatePercent > 15 ? 'text-danger' : 'text-text'}`}>{workforce.attritionRatePercent.toFixed(1)}%</span></p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Status Distribution</p>
            <div className="h-40"><ResponsiveContainer><PieChart><Pie data={workforceChart} cx="50%" cy="50%" innerRadius={30} outerRadius={48} dataKey="value" stroke="none">{workforceChart.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Department Distribution</p>
            <div className="h-40"><ResponsiveContainer><PieChart><Pie data={departmentDist} cx="50%" cy="50%" innerRadius={30} outerRadius={48} dataKey="value" stroke="none">{departmentDist.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Headcount Growth</p>
            <div className="h-40">
              <ResponsiveContainer>
                <BarChart data={headcountTrend}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8B949E' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#8B949E' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #30363D', borderRadius: 8, fontSize: 12, color: '#E6EDF3' }} />
                  <Bar dataKey="value" fill="#58A6FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        {locationDist.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Location Distribution</p>
            <div className="flex flex-wrap gap-2">
              {locationDist.map(d => <span key={d.name} className="text-xs px-2.5 py-1 bg-surface-3 rounded-full text-text">{d.name}: <span className="font-medium">{d.value}</span></span>)}
            </div>
          </div>
        )}
      </Card>

      {/* Payroll */}
      <Card title="Payroll" action={<button onClick={() => navigate('/payroll')} className="text-xs text-primary hover:underline">Open Payroll</button>}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard icon={IndianRupee} label="Monthly Payroll" value={`₹${(payroll.monthlyPayrollTotal / 100000).toFixed(1)}L`} showSparkline={false} />
          <StatCard icon={payroll.payrollGrowthPercent >= 0 ? ArrowUpRight : ArrowDownRight} label="Payroll Growth" value={payroll.payrollGrowthPercent != null ? `${payroll.payrollGrowthPercent.toFixed(1)}%` : '-'} showSparkline={false} color={payroll.payrollGrowthPercent < 0 ? 'danger' : 'success'} />
          <StatCard icon={IndianRupee} label="Highest Salary" value={`₹${(payroll.highestSalary / 100000).toFixed(1)}L`} showSparkline={false} />
          <StatCard icon={IndianRupee} label="Average Salary" value={`₹${(payroll.averageSalary / 100000).toFixed(1)}L`} showSparkline={false} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Cost per Department</p>
            <div className="space-y-1.5">
              {Object.entries(payroll.costPerDepartment || {}).map(([dept, cost]) => (
                <div key={dept} className="flex items-center justify-between text-xs p-2 bg-surface-3 rounded-lg">
                  <span className="text-text">{dept}</span><span className="text-text-secondary">₹{(cost / 100000).toFixed(1)}L</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Salary Distribution</p>
            <div className="h-40">
              <ResponsiveContainer>
                <BarChart data={salaryBuckets}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8B949E' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#8B949E' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #30363D', borderRadius: 8, fontSize: 12, color: '#E6EDF3' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>{salaryBuckets.map((d, i) => <Cell key={i} fill={d.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leave */}
        <Card title="Leave" action={<button onClick={() => navigate('/leave')} className="text-xs text-primary hover:underline">Open Leave</button>}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <StatCard icon={CalendarDays} label="Remaining Balance" value={leave.totalRemainingBalance} showSparkline={false} color="success" />
            <StatCard icon={CalendarDays} label="Used Balance" value={leave.totalUsedBalance} showSparkline={false} color="warning" />
          </div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Requests Trend (6mo)</p>
          <div className="h-32 mb-3">
            <ResponsiveContainer>
              <BarChart data={leaveTrend}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8B949E' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#8B949E' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #30363D', borderRadius: 8, fontSize: 12, color: '#E6EDF3' }} />
                <Bar dataKey="value" fill="#A371F7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2">
            {leaveByType.map(d => <span key={d.name} className="text-xs px-2.5 py-1 bg-surface-3 rounded-full text-text">{d.name}: <span className="font-medium">{d.value}d</span></span>)}
          </div>
        </Card>

        {/* BGV */}
        <Card title="Background Verification" action={<button onClick={() => navigate('/background-verification')} className="text-xs text-primary hover:underline">Open BGV</button>}>
          <div className="grid grid-cols-2 gap-3">
            <div className="cursor-pointer" onClick={() => navigate('/background-verification')}><StatCard icon={ShieldCheck} label="Pending" value={bgv.pending} showSparkline={false} color="default" /></div>
            <div className="cursor-pointer" onClick={() => navigate('/background-verification')}><StatCard icon={ShieldCheck} label="Cleared" value={bgv.cleared} showSparkline={false} color="success" /></div>
            <div className="cursor-pointer" onClick={() => navigate('/background-verification')}><StatCard icon={ShieldCheck} label="Failed" value={bgv.failed} showSparkline={false} color="danger" /></div>
            <StatCard icon={CalendarDays} label="Avg Completion" value={bgv.avgCompletionDays != null ? `${bgv.avgCompletionDays.toFixed(1)}d` : '-'} showSparkline={false} />
          </div>
        </Card>
      </div>

      {/* Assets */}
      <Card title="Assets" action={<button onClick={() => navigate('/assets')} className="text-xs text-primary hover:underline">Open Assets</button>}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div className="cursor-pointer" onClick={() => navigate('/assets')}><StatCard icon={Package} label="Allocated" value={assets.allocated} showSparkline={false} color="info" /></div>
          <div className="cursor-pointer" onClick={() => navigate('/assets')}><StatCard icon={Package} label="Available" value={assets.available} showSparkline={false} color="success" /></div>
          <div className="cursor-pointer" onClick={() => navigate('/assets')}><StatCard icon={Package} label="Lost" value={assets.lost} showSparkline={false} color="danger" /></div>
          <div className="cursor-pointer" onClick={() => navigate('/assets')}><StatCard icon={Package} label="Under Maintenance" value={assets.underMaintenance} showSparkline={false} color="warning" /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(assets.byCategory || {}).map(([cat, count]) => (
            <span key={cat} className="text-xs px-2.5 py-1 bg-surface-3 rounded-full text-text">{cat}: <span className="font-medium">{count}</span></span>
          ))}
        </div>
      </Card>
    </div>
  );
}
