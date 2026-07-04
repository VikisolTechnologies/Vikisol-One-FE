import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search, Download, Printer, Minus, Plus, Users, Building2, MapPin, FolderKanban, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Breadcrumb from '../components/ui/Breadcrumb';
import Modal from '../components/ui/Modal';
import Tabs from '../components/ui/Tabs';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { getFullOrgChart } from '../api/orgchart';
import SensitiveValue from '../components/ui/SensitiveValue';

const hierarchy = [
  { title: 'CEO', level: 0 },
  { title: 'CTO', level: 1 },
  { title: 'VP Engineering', level: 1 },
  { title: 'HR Manager', level: 1 },
  { title: 'Finance Lead', level: 1 },
  { title: 'Delivery Manager', level: 2 },
  { title: 'Engineering Manager', level: 2 },
  { title: 'Director', level: 2 },
  { title: 'Recruitment Lead', level: 2 },
  { title: 'Project Manager', level: 3 },
  { title: 'Architect', level: 3 },
  { title: 'Senior PM', level: 3 },
  { title: 'Lead Developer', level: 4 },
  { title: 'Design Lead', level: 4 },
  { title: 'QA Lead', level: 4 },
  { title: 'DevOps Lead', level: 4 },
  { title: 'Senior Developer', level: 5 },
  { title: 'Senior Designer', level: 5 },
  { title: 'Senior QA Engineer', level: 5 },
  { title: 'Senior DevOps Engineer', level: 5 },
  { title: 'Developer', level: 6 },
  { title: 'Full Stack Developer', level: 6 },
  { title: 'QA Engineer', level: 6 },
  { title: 'UI Designer', level: 6 },
  { title: 'Junior Developer', level: 7 },
  { title: 'QA Analyst', level: 7 },
  { title: 'Intern', level: 7 },
];

function OrgNode({ employee, children, expanded, onToggle, onSelect, depth = 0 }) {
  const hasChildren = children && children.length > 0;
  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-border pl-4' : ''}`}>
      <div className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-surface-3 cursor-pointer transition-colors group" onClick={() => onSelect(employee)}>
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); onToggle(employee.id); }} className="w-5 h-5 rounded flex items-center justify-center bg-surface-3 group-hover:bg-surface-4 text-text-secondary flex-shrink-0">
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : <div className="w-5" />}
        <Avatar name={employee.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text truncate">{employee.name}</p>
          <p className="text-[10px] text-text-secondary">{employee.designation}</p>
        </div>
        <Badge variant="default">{employee.department}</Badge>
      </div>
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OrgChart() {
  const { data } = useData();
  const { isAuthenticated, user } = useAuth() || {};
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [view, setView] = useState('tree');
  const [expandedNodes, setExpandedNodes] = useState(new Set(['dept-Management', 'dept-Development', 'dept-HR']));
  const [selected, setSelected] = useState(null);
  const [groupBy, setGroupBy] = useState('department');
  const [zoom, setZoom] = useState(100);
  const [orgEmployees, setOrgEmployees] = useState(null); // null = not loaded yet, falls back to data.employees
  const [orgSource, setOrgSource] = useState('mock'); // 'mock' | 'live'
  const [orgLoading, setOrgLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setOrgLoading(true);
    getFullOrgChart()
      .then(({ flat }) => {
        if (flat && flat.length) {
          setOrgEmployees(flat);
          setOrgSource('live');
        } else {
          setOrgSource('mock');
        }
      })
      .catch(() => {
        setOrgSource('mock');
      })
      .finally(() => setOrgLoading(false));
  }, [isAuthenticated]);

  const allEmployees = orgSource === 'live' && orgEmployees ? orgEmployees : data.employees;

  const toggleNode = (id) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedNodes(new Set(data.departments.map(d => `dept-${d}`)));
  const collapseAll = () => setExpandedNodes(new Set());

  const filteredEmployees = useMemo(() => {
    if (!search) return allEmployees;
    const s = search.toLowerCase();
    return allEmployees.filter(e => e.name.toLowerCase().includes(s) || e.designation.toLowerCase().includes(s) || e.department.toLowerCase().includes(s));
  }, [allEmployees, search]);

  const grouped = useMemo(() => {
    const groups = {};
    filteredEmployees.forEach(e => {
      const key = groupBy === 'department' ? e.department : groupBy === 'location' ? e.location : e.department;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    Object.values(groups).forEach(g => {
      g.sort((a, b) => {
        const aLevel = hierarchy.find(h => a.designation.includes(h.title.split(' ').pop()))?.level ?? 6;
        const bLevel = hierarchy.find(h => b.designation.includes(h.title.split(' ').pop()))?.level ?? 6;
        return aLevel - bLevel;
      });
    });
    return groups;
  }, [filteredEmployees, groupBy]);

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Organization Chart' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Organization Structure</h1>
          <p className="text-sm text-text-secondary">
            {orgLoading ? 'Loading from server...' : `${allEmployees.length} employees across ${data.departments.length} departments`}
            {!orgLoading && orgSource === 'mock' && <span className="ml-2 text-warning">(demo data)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={Download} onClick={() => toast.info('PDF export is not available yet')}>Export PDF</Button>
          <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>Print</Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..." className="w-full bg-surface-2 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary placeholder-text-secondary/50" />
        </div>
        <div className="flex bg-surface-3 rounded-lg p-0.5">
          {[{ key: 'department', icon: Building2, label: 'Department' }, { key: 'location', icon: MapPin, label: 'Location' }].map(g => (
            <button key={g.key} onClick={() => setGroupBy(g.key)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md ${groupBy === g.key ? 'bg-primary text-white' : 'text-text-secondary'}`}>
              <g.icon size={12} /> {g.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={expandAll}>Expand All</Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>Collapse All</Button>
        </div>
        <div className="flex items-center gap-1 bg-surface-3 rounded-lg p-1">
          <button onClick={() => setZoom(z => Math.max(60, z - 10))} className="p-1 rounded hover:bg-surface-4 text-text-secondary"><ZoomOut size={14} /></button>
          <span className="text-xs text-text-secondary w-10 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(150, z + 10))} className="p-1 rounded hover:bg-surface-4 text-text-secondary"><ZoomIn size={14} /></button>
        </div>
      </div>

      <div style={{ fontSize: `${zoom}%` }}>
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([group, employees]) => {
          const nodeId = `dept-${group}`;
          const isExpanded = expandedNodes.has(nodeId);
          const managers = employees.filter(e => e.designation.includes('Manager') || e.designation.includes('Lead') || e.designation.includes('Director') || e.designation.includes('Architect') || e.designation.includes('Head'));
          const others = employees.filter(e => !managers.includes(e));

          return (
            <Card key={group} className="mb-3">
              <button onClick={() => toggleNode(nodeId)} className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 size={18} className="text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-text">{group}</h3>
                    <p className="text-xs text-text-secondary">{employees.length} employees</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">{managers.length} managers</span>
                  {isExpanded ? <ChevronDown size={16} className="text-text-secondary" /> : <ChevronRight size={16} className="text-text-secondary" />}
                </div>
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 space-y-0">
                    {managers.map(emp => (
                      <OrgNode key={emp.id} employee={emp} depth={0} expanded={expandedNodes.has(emp.id)} onToggle={toggleNode} onSelect={setSelected}
                        children={others.filter(o => o.manager === emp.name).map(sub => (
                          <OrgNode key={sub.id} employee={sub} depth={1} expanded={false} onToggle={toggleNode} onSelect={setSelected} />
                        ))}
                      />
                    ))}
                    {others.filter(o => !managers.some(m => m.name === o.manager)).map(emp => (
                      <OrgNode key={emp.id} employee={emp} depth={0} expanded={false} onToggle={toggleNode} onSelect={setSelected} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Employee Profile" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-surface-3 rounded-xl">
              <Avatar name={selected.name} size="xl" />
              <div>
                <h3 className="text-lg font-bold text-text">{selected.name}</h3>
                <p className="text-sm text-primary">{selected.designation}</p>
                <p className="text-xs text-text-secondary">{selected.empId} · {selected.department} · {selected.location}</p>
                <div className="flex gap-2 mt-2"><Badge dot>{selected.status}</Badge><Badge variant="default">{selected.employmentType}</Badge></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[['Email', selected.email], ['Phone', selected.phone], ['Manager', selected.manager], ['Experience', `${selected.experience || 0} years`], ['Join Date', selected.joinDate]].map(([k, v]) => (
                <div key={k}><p className="text-xs text-text-secondary">{k}</p><p className="text-text font-medium">{v || '-'}</p></div>
              ))}
              <div><p className="text-xs text-text-secondary">CTC</p><p className="text-text font-medium"><SensitiveValue type="currency" value={selected.ctc} id={`orgchart-ctc-${selected.id}`} canReveal={['ceo', 'hr_manager', 'admin'].includes((user?.role || '').toLowerCase())} /></p></div>
            </div>
            <div><p className="text-xs text-text-secondary mb-1">Skills</p><div className="flex flex-wrap gap-1.5">{selected.skills?.map(s => <span key={s} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{s}</span>)}</div></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
