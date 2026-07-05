import { useState, useMemo, useEffect } from 'react';
import { Users, Briefcase, Clock, TrendingUp, AlertTriangle, Search } from 'lucide-react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import ProgressBar from '../components/ui/ProgressBar';
import DataTable from '../components/ui/DataTable';
import Breadcrumb from '../components/ui/Breadcrumb';
import SearchFilter from '../components/ui/SearchFilter';
import { useData } from '../context/DataContext';
import { getProjectMembers } from '../api/projects';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// Deterministic fallback (not Math.random()) so demo-mode numbers are at least stable across renders.
function seededPct(seed, options) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return options[hash % options.length];
}

export default function ResourceAllocation() {
  const { data, projectsSource } = useData();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [membersByEmployee, setMembersByEmployee] = useState(null); // null = not loaded yet

  useEffect(() => {
    if (projectsSource !== 'live' || data.projects.length === 0) { setMembersByEmployee(null); return; }
    let cancelled = false;
    Promise.all(data.projects.map(p => getProjectMembers(p.id).then(members => members.map(m => ({ ...m, projectName: p.name, projectClient: p.client }))).catch(() => [])))
      .then(results => {
        if (cancelled) return;
        const byEmployee = {};
        results.flat().forEach(m => {
          if (!m.isActive) return;
          if (!byEmployee[m.employeeId]) byEmployee[m.employeeId] = [];
          byEmployee[m.employeeId].push(m);
        });
        setMembersByEmployee(byEmployee);
      });
    return () => { cancelled = true; };
  }, [projectsSource, data.projects]);

  const resources = useMemo(() => {
    return data.employees.map(emp => {
      if (membersByEmployee) {
        const assignments = membersByEmployee[emp.id] || [];
        const allocation = emp.status === 'On Leave' ? 0 : Math.min(100, assignments.reduce((s, a) => s + (a.allocationPercentage || 0), 0));
        const primary = assignments[0];
        const isBench = allocation === 0 && emp.status === 'Active';
        const billable = allocation > 0 && !isBench && primary?.projectClient && primary.projectClient !== 'Internal';
        return {
          ...emp,
          currentProject: allocation > 0 ? primary?.projectName || 'Internal' : isBench ? 'Bench' : '-',
          projectClient: allocation > 0 ? primary?.projectClient || 'Internal' : '-',
          allocation,
          billable,
          benchStatus: isBench ? 'Bench' : allocation === 0 ? 'Not Allocated' : 'Allocated',
          utilizationType: billable ? 'Billable' : isBench ? 'Bench' : allocation > 0 ? 'Non-Billable' : 'N/A',
          teamLead: emp.manager || '-',
          currentSprint: '-',
          availableFrom: isBench ? 'Immediately' : emp.status === 'Notice Period' ? emp.joinDate : '-',
        };
      }
      // Demo fallback: deterministic per employee, not randomized per render
      const assignedProject = data.projects.length ? data.projects[seededPct(emp.id, [...Array(data.projects.length).keys()])] : null;
      const allocation = emp.status === 'On Leave' ? 0 : emp.status === 'Notice Period' ? 50 : seededPct(emp.id, [100, 100, 100, 100, 75, 50, 0]);
      const isBench = allocation === 0 && emp.status === 'Active';
      const billable = allocation > 0 && !isBench && assignedProject?.client !== 'Internal';
      return {
        ...emp,
        currentProject: allocation > 0 ? assignedProject?.name || 'Internal' : isBench ? 'Bench' : '-',
        projectClient: allocation > 0 ? assignedProject?.client || 'Internal' : '-',
        allocation,
        billable,
        benchStatus: isBench ? 'Bench' : allocation === 0 ? 'Not Allocated' : 'Allocated',
        utilizationType: billable ? 'Billable' : isBench ? 'Bench' : allocation > 0 ? 'Non-Billable' : 'N/A',
        teamLead: emp.manager || '-',
        currentSprint: allocation > 0 ? `Sprint ${(seededPct(emp.id + 's', [...Array(15).keys()])) + 1}` : '-',
        availableFrom: isBench ? 'Immediately' : emp.status === 'Notice Period' ? emp.joinDate : '-',
      };
    });
  }, [data.employees, data.projects, membersByEmployee]);

  const filtered = useMemo(() => {
    return resources.filter(r => {
      const s = search.toLowerCase();
      const matchSearch = !s || r.name.toLowerCase().includes(s) || r.empId.toLowerCase().includes(s) || r.currentProject.toLowerCase().includes(s);
      const matchDept = !filters.department || filters.department === 'All' || r.department === filters.department;
      const matchStatus = !filters.benchStatus || filters.benchStatus === 'All' || r.benchStatus === filters.benchStatus;
      const matchBillable = !filters.utilizationType || filters.utilizationType === 'All' || r.utilizationType === filters.utilizationType;
      return matchSearch && matchDept && matchStatus && matchBillable;
    });
  }, [resources, search, filters]);

  const stats = useMemo(() => {
    const total = resources.length;
    const allocated = resources.filter(r => r.allocation > 0).length;
    const bench = resources.filter(r => r.benchStatus === 'Bench').length;
    const billable = resources.filter(r => r.billable).length;
    const avgAllocation = Math.round(resources.reduce((s, r) => s + r.allocation, 0) / total);
    return { total, allocated, bench, billable, nonBillable: allocated - billable, avgAllocation, utilizationPct: Math.round((billable / total) * 100) };
  }, [resources]);

  const utilizationData = [
    { name: 'Billable', value: stats.billable, color: '#2EA043' },
    { name: 'Non-Billable', value: stats.nonBillable, color: '#D29922' },
    { name: 'Bench', value: stats.bench, color: '#F85149' },
    { name: 'Leave/Notice', value: stats.total - stats.allocated - stats.bench, color: '#8B949E' },
  ];

  const columns = [
    { key: 'name', label: 'Employee', render: (_, row) => (
      <div className="flex items-center gap-2"><Avatar name={row.name} size="sm" /><div><p className="font-medium text-text text-sm">{row.name}</p><p className="text-[10px] text-text-secondary">{row.empId} · {row.designation}</p></div></div>
    )},
    { key: 'department', label: 'Department' },
    { key: 'currentProject', label: 'Current Project', render: (v) => <span className={`font-medium ${v === 'Bench' ? 'text-danger' : 'text-text'}`}>{v}</span> },
    { key: 'allocation', label: 'Allocation', render: (v) => (
      <div className="flex items-center gap-2 w-24"><ProgressBar value={v} max={100} size="sm" color={v >= 75 ? 'success' : v >= 50 ? 'warning' : 'danger'} /><span className="text-xs font-semibold w-8">{v}%</span></div>
    )},
    { key: 'utilizationType', label: 'Type', render: (v) => <Badge variant={v === 'Billable' ? 'success' : v === 'Bench' ? 'danger' : v === 'Non-Billable' ? 'warning' : 'default'}>{v}</Badge> },
    { key: 'teamLead', label: 'Manager' },
    { key: 'currentSprint', label: 'Sprint' },
    { key: 'status', label: 'Status', render: (v) => <Badge dot>{v}</Badge> },
  ];

  const projectAllocation = useMemo(() => {
    const byProject = {};
    resources.filter(r => r.allocation > 0 && r.currentProject !== 'Bench').forEach(r => {
      if (!byProject[r.currentProject]) byProject[r.currentProject] = { name: r.currentProject, client: r.projectClient, members: 0, totalAllocation: 0 };
      byProject[r.currentProject].members++;
      byProject[r.currentProject].totalAllocation += r.allocation;
    });
    return Object.values(byProject).sort((a, b) => b.members - a.members).slice(0, 10);
  }, [resources]);

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Resource Allocation' }]} />
      <div className="flex items-center gap-2"><h1 className="text-xl font-bold text-text">Resource Allocation</h1>{!membersByEmployee && <span className="text-sm text-warning">(demo data)</span>}</div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className={`cursor-pointer rounded-xl transition-all ${!filters.benchStatus && !filters.utilizationType ? 'ring-2 ring-primary' : ''}`} onClick={() => setFilters({})}>
          <StatCard icon={Users} label="Total" value={stats.total} delay={0} />
        </div>
        <div className={`cursor-pointer rounded-xl transition-all ${filters.benchStatus === 'Allocated' ? 'ring-2 ring-success' : ''}`} onClick={() => setFilters({ benchStatus: 'Allocated' })}>
          <StatCard icon={Briefcase} label="Allocated" value={stats.allocated} color="success" delay={1} />
        </div>
        <div className={`cursor-pointer rounded-xl transition-all ${filters.utilizationType === 'Billable' ? 'ring-2 ring-info' : ''}`} onClick={() => setFilters({ utilizationType: 'Billable' })}>
          <StatCard icon={TrendingUp} label="Billable" value={stats.billable} color="info" delay={2} />
        </div>
        <div className={`cursor-pointer rounded-xl transition-all ${filters.utilizationType === 'Non-Billable' ? 'ring-2 ring-warning' : ''}`} onClick={() => setFilters({ utilizationType: 'Non-Billable' })}>
          <StatCard icon={Clock} label="Non-Billable" value={stats.nonBillable} color="warning" delay={3} />
        </div>
        <div className={`cursor-pointer rounded-xl transition-all ${filters.benchStatus === 'Bench' ? 'ring-2 ring-danger' : ''}`} onClick={() => setFilters({ benchStatus: 'Bench' })}>
          <StatCard icon={AlertTriangle} label="Bench" value={stats.bench} color="danger" delay={4} />
        </div>
        {/* Not clickable/filterable - "Utilization %" is a computed ratio (billable / total), not
            a status any individual employee row has, so there's nothing to filter the table to. */}
        <StatCard icon={TrendingUp} label="Utilization" value={`${stats.utilizationPct}%`} color="primary" delay={5} showSparkline={false} />
      </div>
      {(filters.benchStatus || filters.utilizationType) && (
        <button onClick={() => setFilters({})} className="text-xs text-primary hover:underline">Clear filter (showing {filtered.length} of {resources.length})</button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Utilization Breakdown">
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 relative">
              <ResponsiveContainer><PieChart><Pie data={utilizationData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">{utilizationData.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie></PieChart></ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-xl font-bold text-text">{stats.utilizationPct}%</span><span className="text-[9px] text-text-secondary">Utilized</span></div>
            </div>
            <div className="space-y-2 text-xs flex-1">
              {utilizationData.map(d => (
                <div key={d.name} className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} /><span className="text-text-secondary">{d.name}</span></div><span className="text-text font-medium">{d.value}</span></div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Top Projects by Team Size" className="lg:col-span-2">
          <div className="space-y-2">
            {projectAllocation.slice(0, 6).map(p => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-xs text-text-secondary w-36 truncate">{p.name}</span>
                <div className="flex-1"><ProgressBar value={p.members} max={Math.max(...projectAllocation.map(pp => pp.members))} /></div>
                <span className="text-xs font-semibold text-text w-20 text-right">{p.members} members</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <SearchFilter searchValue={search} onSearch={setSearch} filters={[
        { key: 'department', label: 'Department', options: data.departments },
        { key: 'benchStatus', label: 'Allocation', options: ['Allocated', 'Bench', 'Not Allocated'] },
        { key: 'utilizationType', label: 'Type', options: ['Billable', 'Non-Billable', 'Bench'] },
      ]} activeFilters={filters} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClearFilters={() => setFilters({})} placeholder="Search by name, ID, project..." />

      <Card padding={false}>
        <DataTable columns={columns} data={filtered} pageSize={15} />
      </Card>
    </div>
  );
}
