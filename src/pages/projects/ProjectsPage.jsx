import { useState, useMemo, useEffect } from 'react';
import { FolderKanban, Plus, Users, Calendar, Edit3, Trash2, Archive, Eye, UserPlus, X } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import ProgressBar from '../../components/ui/ProgressBar';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Select, Textarea } from '../../components/ui/Input';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SearchFilter from '../../components/ui/SearchFilter';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { getProjectMembers, addProjectMember, removeProjectMember } from '../../api/projects';

export default function ProjectsPage() {
  const { data, projects, projectsSource, projectsLoading } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const isAdmin = ['ceo', 'hr_manager', 'admin'].includes(user?.role);
  const isManager = ['ceo', 'hr_manager', 'manager', 'admin'].includes(user?.role);
  const isEmployee = user?.role === 'employee';

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showEdit, setShowEdit] = useState(null);
  const [form, setForm] = useState({ name: '', client: '', status: 'On Track', priority: 'Medium', deadline: '', description: '', manager: '', budget: '' });
  const [editForm, setEditForm] = useState({});
  const [members, setMembers] = useState(null); // null = not loaded / not live
  const [membersLoading, setMembersLoading] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState({ employeeId: '', role: '', allocationPercentage: 100 });
  const [addingMember, setAddingMember] = useState(false);

  const allProjects = useMemo(() => {
    if (isAdmin || isManager) return data.projects;
    return data.projects.filter(p => {
      const nameMatch = p.manager === user?.name;
      const assigned = Math.random() > 0.6;
      return nameMatch || assigned;
    }).slice(0, 5);
  }, [data.projects, isAdmin, isManager, user]);

  const filtered = useMemo(() => allProjects.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = !s || p.name.toLowerCase().includes(s) || p.client.toLowerCase().includes(s);
    const matchStatus = !filters.status || filters.status === 'All' || p.status === filters.status;
    const matchPriority = !filters.priority || filters.priority === 'All' || p.priority === filters.priority;
    return matchSearch && matchStatus && matchPriority;
  }), [allProjects, search, filters]);

  const handleCreate = async () => {
    if (!form.name) { toast.error('Project name is required'); return; }
    try {
      await projects.create({ ...form, progress: 0, team: 0, tech: [], startDate: new Date().toISOString().split('T')[0], milestones: 0, completedMilestones: 0, risks: 0, sprints: 0, spent: '₹0', repository: '' });
      toast.success(`Project "${form.name}" created`);
      setShowAdd(false); setForm({ name: '', client: '', status: 'On Track', priority: 'Medium', deadline: '', description: '', manager: '', budget: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to create project');
    }
  };

  const handleEdit = async () => {
    try {
      await projects.update(showEdit.id, editForm);
      toast.success('Project updated');
      setShowEdit(null);
    } catch (err) {
      toast.error(err.message || 'Failed to update project');
    }
  };

  const handleDelete = async (p) => {
    const ok = await confirm({ title: 'Delete Project?', message: `Delete "${p.name}"? This cannot be undone.`, type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await projects.remove(p.id);
      toast.success('Project deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete project');
    }
  };

  const handleArchive = async (p) => {
    try {
      await projects.update(p.id, { status: 'On Hold' });
      toast.info(`"${p.name}" archived`);
    } catch (err) {
      toast.error(err.message || 'Failed to archive project');
    }
  };

  useEffect(() => {
    if (!selected || projectsSource !== 'live') { setMembers(null); return; }
    setMembersLoading(true);
    getProjectMembers(selected.id).then(setMembers).catch(() => setMembers(null)).finally(() => setMembersLoading(false));
  }, [selected, projectsSource]);

  const handleAddMember = async () => {
    if (!addMemberForm.employeeId) { toast.error('Select an employee to add'); return; }
    setAddingMember(true);
    try {
      const added = await addProjectMember(selected.id, addMemberForm);
      setMembers(prev => [...(prev || []), added]);
      toast.success(`${added.employeeName} added to ${selected.name}`);
      setAddMemberForm({ employeeId: '', role: '', allocationPercentage: 100 });
    } catch (err) {
      toast.error(err.message || 'Failed to add team member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (member) => {
    try {
      await removeProjectMember(selected.id, member.id);
      setMembers(prev => (prev || []).filter(m => m.id !== member.id));
      toast.success(`${member.employeeName} removed from ${selected.name}`);
    } catch (err) {
      toast.error(err.message || 'Failed to remove team member');
    }
  };

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Projects' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">{isEmployee ? 'My Projects' : 'Projects'}</h1>
          <p className="text-sm text-text-secondary">
            {projectsLoading ? 'Loading from server...' : `${filtered.length} ${isEmployee ? 'assigned' : 'total'} projects`}
            {!projectsLoading && projectsSource === 'mock' && <span className="ml-2 text-warning">(demo data)</span>}
          </p>
        </div>
        {isManager && <Button icon={Plus} size="sm" onClick={() => setShowAdd(true)}>New Project</Button>}
      </div>
      <SearchFilter searchValue={search} onSearch={setSearch} filters={[
        { key: 'status', label: 'Status', options: ['On Track', 'At Risk', 'Delayed', 'Completed', 'On Hold'] },
        ...(!isEmployee ? [{ key: 'priority', label: 'Priority', options: ['High', 'Medium', 'Low'] }] : []),
      ]} activeFilters={filters} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClearFilters={() => setFilters({})} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <Card key={p.id} hoverable>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><FolderKanban size={16} className="text-primary" /></div>
                <div className="min-w-0"><h3 className="text-sm font-semibold text-text truncate">{p.name}</h3><p className="text-xs text-text-secondary">{p.client}</p></div>
              </div>
              <Badge>{p.status}</Badge>
            </div>
            <ProgressBar value={p.progress} max={100} showLabel color={p.status === 'On Track' ? 'success' : p.status === 'Delayed' ? 'danger' : p.status === 'Completed' ? 'info' : 'warning'} />
            <div className="flex items-center justify-between mt-3 text-xs text-text-secondary">
              <div className="flex items-center gap-1"><Users size={12} /> {p.team} members</div>
              <div className="flex items-center gap-1"><Calendar size={12} /> {p.deadline}</div>
            </div>
            {/* Budget only visible to CEO/Admin */}
            {isAdmin && (
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-text-secondary">Budget: <span className="text-text font-medium">{p.budget}</span></span>
                <span className="text-text-secondary">Spent: <span className="text-text font-medium">{p.spent}</span></span>
              </div>
            )}
            <div className="flex flex-wrap gap-1 mt-3">{p.tech.slice(0, 4).map(t => <span key={t} className="px-2 py-0.5 bg-surface-3 text-text-secondary text-[10px] rounded-full">{t}</span>)}</div>
            <div className="flex gap-1 mt-3 border-t border-border pt-3">
              <button onClick={() => setSelected(p)} className="flex-1 text-xs py-1.5 bg-surface-3 rounded-lg hover:bg-surface-4 text-text-secondary font-medium flex items-center justify-center gap-1"><Eye size={12} /> View</button>
              {isManager && (
                <>
                  <button onClick={() => { setEditForm({ ...p }); setShowEdit(p); }} className="flex-1 text-xs py-1.5 bg-surface-3 rounded-lg hover:bg-surface-4 text-text-secondary font-medium flex items-center justify-center gap-1"><Edit3 size={12} /> Edit</button>
                  <button onClick={() => handleArchive(p)} className="text-xs py-1.5 px-2 bg-surface-3 rounded-lg hover:bg-surface-4 text-text-secondary"><Archive size={12} /></button>
                  <button onClick={() => handleDelete(p)} className="text-xs py-1.5 px-2 bg-danger/10 rounded-lg hover:bg-danger/20 text-danger"><Trash2 size={12} /></button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Create Modal - managers only */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Project" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Project Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Client" value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} />
          <Input label="Manager" value={form.manager} onChange={e => setForm(p => ({ ...p, manager: e.target.value }))} />
          <Input label="Budget" value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} placeholder="e.g. ₹50L" />
          <Input label="Deadline" type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
          <Select label="Priority" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} options={['High','Medium','Low'].map(v => ({ value: v, label: v }))} />
          <Textarea label="Description" className="col-span-2" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-2 mt-6"><Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={handleCreate}>Create Project</Button></div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title="Edit Project" size="lg">
        {showEdit && <div className="grid grid-cols-2 gap-4">
          <Input label="Project Name" value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Client" value={editForm.client || ''} onChange={e => setEditForm(p => ({ ...p, client: e.target.value }))} />
          <Select label="Status" value={editForm.status || ''} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} options={['On Track','At Risk','Delayed','Completed','On Hold'].map(v => ({ value: v, label: v }))} />
          <Input label="Progress %" type="number" value={editForm.progress || 0} onChange={e => setEditForm(p => ({ ...p, progress: parseInt(e.target.value) || 0 }))} min="0" max="100" />
          <Input label="Deadline" type="date" value={editForm.deadline || ''} onChange={e => setEditForm(p => ({ ...p, deadline: e.target.value }))} />
          <Input label="Manager" value={editForm.manager || ''} onChange={e => setEditForm(p => ({ ...p, manager: e.target.value }))} />
          <div className="col-span-2 flex justify-end gap-2 mt-2"><Button variant="secondary" onClick={() => setShowEdit(null)}>Cancel</Button><Button onClick={handleEdit}>Save</Button></div>
        </div>}
      </Modal>

      {/* View Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name} size="lg">
        {selected && <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[
              ['Client', selected.client], ['Status', selected.status], ['Priority', selected.priority],
              ['Manager', selected.manager], ['Team Size', selected.team],
              ...(isAdmin ? [['Budget', selected.budget], ['Spent', selected.spent]] : []),
              ['Start Date', selected.startDate], ['Deadline', selected.deadline],
              ['Milestones', `${selected.completedMilestones}/${selected.milestones}`], ['Sprints', selected.sprints],
            ].map(([k, v]) => (
              <div key={k}><p className="text-xs text-text-secondary">{k}</p><p className="text-text font-medium mt-0.5">{v || '-'}</p></div>
            ))}
          </div>
          <div><p className="text-xs text-text-secondary mb-2">Progress</p><ProgressBar value={selected.progress} max={100} showLabel size="lg" /></div>
          <div><p className="text-xs text-text-secondary mb-2">Technology Stack</p><div className="flex flex-wrap gap-1.5">{selected.tech.map(t => <span key={t} className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full">{t}</span>)}</div></div>
          {selected.repository && <div><p className="text-xs text-text-secondary">Repository</p><p className="text-sm text-info mt-0.5">{selected.repository}</p></div>}

          {projectsSource === 'live' && (
            <div className="border-t border-border pt-4">
              <p className="text-xs text-text-secondary font-semibold uppercase mb-2">Team Members</p>
              {membersLoading && <p className="text-xs text-text-secondary">Loading...</p>}
              {!membersLoading && (
                <div className="space-y-1.5">
                  {(members || []).length === 0 && <p className="text-xs text-text-secondary">No members assigned yet</p>}
                  {(members || []).map(m => (
                    <div key={m.id} className="flex items-center justify-between p-2 bg-surface-3 rounded-lg">
                      <div className="flex items-center gap-2"><Avatar name={m.employeeName} size="sm" /><div><p className="text-sm text-text">{m.employeeName}</p><p className="text-[10px] text-text-secondary">{m.role || 'Member'} &middot; {m.allocationPercentage}%</p></div></div>
                      {isManager && <button onClick={() => handleRemoveMember(m)} className="p-1 rounded hover:bg-danger/10 text-danger"><X size={14} /></button>}
                    </div>
                  ))}
                </div>
              )}
              {isManager && (
                <div className="flex items-end gap-2 mt-3">
                  <Select label="Add Employee" className="flex-1" value={addMemberForm.employeeId}
                    onChange={e => setAddMemberForm(p => ({ ...p, employeeId: e.target.value }))}
                    placeholder="Select employee" options={data.employees.map(e => ({ value: e.id, label: e.name }))} />
                  <Input label="Role" className="w-32" value={addMemberForm.role} onChange={e => setAddMemberForm(p => ({ ...p, role: e.target.value }))} placeholder="e.g. Developer" />
                  <Input label="Allocation %" type="number" className="w-28" value={addMemberForm.allocationPercentage} onChange={e => setAddMemberForm(p => ({ ...p, allocationPercentage: parseInt(e.target.value) || 0 }))} min="0" max="100" />
                  <Button size="sm" icon={UserPlus} onClick={handleAddMember} disabled={addingMember}>{addingMember ? 'Adding...' : 'Add'}</Button>
                </div>
              )}
            </div>
          )}
        </div>}
      </Modal>
    </div>
  );
}
