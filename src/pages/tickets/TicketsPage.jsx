import { useState, useMemo } from 'react';
import { Plus, Eye, MessageSquare, Trash2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Select, Textarea } from '../../components/ui/Input';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SearchFilter from '../../components/ui/SearchFilter';
import StatCard from '../../components/ui/StatCard';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { Ticket, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function TicketsPage() {
  const { data, tickets, ticketsSource, ticketsLoading } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'Software', priority: 'Medium', description: '' });
  const [comment, setComment] = useState('');

  const allTickets = data.tickets;
  const filtered = useMemo(() => allTickets.filter(t => {
    const s = search.toLowerCase();
    const matchSearch = !s || t.title.toLowerCase().includes(s) || t.id.toLowerCase().includes(s) || t.raisedBy.toLowerCase().includes(s);
    const matchCat = !filters.category || filters.category === 'All' || t.category === filters.category;
    const matchStatus = !filters.status || filters.status === 'All' || t.status === filters.status;
    const matchPriority = !filters.priority || filters.priority === 'All' || t.priority === filters.priority;
    return matchSearch && matchCat && matchStatus && matchPriority;
  }), [allTickets, search, filters]);

  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    try {
      await tickets.create({ ...form, id: `TKT-${String(allTickets.length + 1).padStart(4, '0')}`, status: 'Open', raisedBy: user?.name, raisedByEmpId: user?.empId || 'VKS001', raisedByDept: user?.department || 'Management', assignee: 'IT Support Team', date: new Date().toISOString().split('T')[0], comments: 0, attachments: 0, sla: '24 hours', resolution: null });
      toast.success('Ticket raised successfully');
      setShowNew(false); setForm({ title: '', category: 'Software', priority: 'Medium', description: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to raise ticket');
    }
  };

  const handleStatusChange = async (ticket, status) => {
    try {
      await tickets.update(ticket.id, { status });
      toast.success(`Ticket ${ticket.id} marked as ${status}`);
      if (selected?.id === ticket.id) setSelected({ ...selected, status });
    } catch (err) {
      toast.error(err.message || 'Failed to update ticket status');
    }
  };
  const handleDelete = async (ticket) => {
    const ok = await confirm({ title: 'Delete Ticket?', message: `Delete ${ticket.id}?`, type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await tickets.remove(ticket.id);
      toast.success('Ticket deleted');
      setSelected(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete ticket');
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    try {
      if (ticketsSource === 'live' && selected) {
        await tickets.addComment(selected.id, comment);
      }
      toast.success('Comment added');
      setComment('');
    } catch (err) {
      toast.error(err.message || 'Failed to add comment');
    }
  };

  const statusCounts = useMemo(() => ({
    Open: allTickets.filter(t => t.status === 'Open').length,
    'In Progress': allTickets.filter(t => t.status === 'In Progress').length,
    Resolved: allTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length,
    Total: allTickets.length,
  }), [allTickets]);

  const columns = [
    { key: 'id', label: 'ID', render: (v) => <span className="font-mono text-xs text-primary">{v}</span> },
    { key: 'title', label: 'Title', render: (v) => <span className="font-medium text-text truncate block max-w-[200px]">{v}</span> },
    { key: 'category', label: 'Category' },
    { key: 'priority', label: 'Priority', render: (v) => <Badge>{v}</Badge> },
    { key: 'status', label: 'Status', render: (v) => <Badge dot>{v}</Badge> },
    { key: 'raisedBy', label: 'Raised By' },
    { key: 'date', label: 'Date' },
    { key: 'actions', label: '', sortable: false, render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); setSelected(row); }} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary"><Eye size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); handleDelete(row); }} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Helpdesk Tickets' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Helpdesk Tickets</h1>
          <p className="text-sm text-text-secondary">
            {ticketsLoading ? 'Loading from server...' : `${allTickets.length} total tickets`}
            {!ticketsLoading && ticketsSource === 'mock' && <span className="ml-2 text-warning">(demo data)</span>}
          </p>
        </div>
        <Button icon={Plus} size="sm" onClick={() => setShowNew(true)}>Raise Ticket</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={AlertCircle} label="Open" value={statusCounts.Open} color="danger" delay={0} />
        <StatCard icon={Clock} label="In Progress" value={statusCounts['In Progress']} color="warning" delay={1} />
        <StatCard icon={CheckCircle} label="Resolved" value={statusCounts.Resolved} color="success" delay={2} />
        <StatCard icon={Ticket} label="Total" value={statusCounts.Total} color="primary" delay={3} />
      </div>

      <SearchFilter searchValue={search} onSearch={setSearch} filters={[
        { key: 'category', label: 'Category', options: ['Hardware','Software','Network','Email','VPN','Access','HR Issue','Payroll Issue','General'] },
        { key: 'status', label: 'Status', options: ['Open','In Progress','Resolved','Closed','Waiting on User','Escalated'] },
        { key: 'priority', label: 'Priority', options: ['Low','Medium','High','Critical'] },
      ]} activeFilters={filters} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClearFilters={() => setFilters({})} />

      <Card padding={false}><DataTable columns={columns} data={filtered} pageSize={12} onRowClick={setSelected} /></Card>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Raise New Ticket">
        <div className="space-y-4">
          <Input label="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Brief description" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} options={['Hardware','Software','Network','Email','VPN','Access','HR Issue','Payroll Issue','Facility','General'].map(v => ({ value: v, label: v }))} />
            <Select label="Priority" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} options={['Low','Medium','High','Critical'].map(v => ({ value: v, label: v }))} />
          </div>
          <Textarea label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the issue in detail..." />
          <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button><Button onClick={handleCreate}>Submit Ticket</Button></div>
        </div>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Ticket ${selected?.id}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div><h3 className="text-lg font-semibold text-text">{selected.title}</h3><p className="text-xs text-text-secondary mt-1">Raised by {selected.raisedBy} on {selected.date}</p></div>
              <div className="flex gap-2"><Badge>{selected.priority}</Badge><Badge dot>{selected.status}</Badge></div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[['Category', selected.category], ['Assignee', selected.assignee], ['SLA', selected.sla], ['Department', selected.raisedByDept]].map(([k, v]) => (
                <div key={k}><p className="text-xs text-text-secondary">{k}</p><p className="text-text font-medium">{v}</p></div>
              ))}
            </div>
            {selected.description && <div className="p-3 bg-surface-3 rounded-lg"><p className="text-xs text-text-secondary mb-1">Description</p><p className="text-sm text-text">{selected.description}</p></div>}
            {selected.resolution && <div className="p-3 bg-success/10 rounded-lg border border-success/20"><p className="text-xs text-success mb-1">Resolution</p><p className="text-sm text-text">{selected.resolution}</p></div>}
            <div className="flex gap-2 flex-wrap">
              {['Open','In Progress','Resolved','Closed','Escalated'].filter(s => s !== selected.status).map(s => (
                <Button key={s} size="sm" variant="secondary" onClick={() => handleStatusChange(selected, s)}>Mark {s}</Button>
              ))}
              <Button size="sm" variant="danger" onClick={() => handleDelete(selected)}>Delete</Button>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold text-text mb-2">Add Comment</p>
              <div className="flex gap-2">
                <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Type your comment..." className="flex-1 bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary" />
                <Button size="sm" icon={MessageSquare} onClick={handleAddComment}>Send</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
