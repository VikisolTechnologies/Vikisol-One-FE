import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, Archive, ArchiveRestore, Search } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Breadcrumb from '../components/ui/Breadcrumb';
import { useData } from '../context/DataContext';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';

const typeColors = { leave: 'warning', interview: 'info', payroll: 'success', project: 'primary', asset: 'default', system: 'danger', announcement: 'primary', birthday: 'warning', anniversary: 'success' };
const priorityColors = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'default' };

export default function NotificationCenter() {
  const { markNotificationRead, markAllNotificationsRead, archiveNotification, unarchiveNotification, notifications, data, notificationsSource, notificationsLoading } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [tab, setTab] = useState('unread'); // unread | read | archived | all
  const [search, setSearch] = useState('');

  const allNotifs = data.notifications;

  const filtered = useMemo(() => {
    let list = allNotifs;
    if (tab === 'unread') list = list.filter(n => !n.read && !n.archived);
    else if (tab === 'read') list = list.filter(n => n.read && !n.archived);
    else if (tab === 'archived') list = list.filter(n => n.archived);
    else list = list.filter(n => !n.archived); // 'all' excludes archived by design - archived has its own tab
    if (typeFilter !== 'All') list = list.filter(n => n.type === typeFilter);
    if (priorityFilter !== 'All') list = list.filter(n => (n.priority || 'NONE') === priorityFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(n => n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q));
    }
    return list;
  }, [allNotifs, tab, typeFilter, priorityFilter, search]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
    } catch (err) {
      toast.error(err.message || 'Failed to mark notification as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(err.message || 'Failed to mark all notifications as read');
    }
  };

  const handleArchiveToggle = async (notif) => {
    try {
      if (notif.archived) {
        await unarchiveNotification(notif.id);
        toast.success('Notification unarchived');
      } else {
        await archiveNotification(notif.id);
        toast.success('Notification archived');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update notification');
    }
  };

  const handleDelete = async (notif) => {
    const ok = await confirm({ title: 'Delete Notification?', message: 'Remove this notification?', type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await notifications.remove(notif.id);
      toast.success('Notification deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete notification');
    }
  };

  const handleClick = (n) => {
    if (!n.read) handleMarkRead(n.id);
    if (n.deepLink) navigate(n.deepLink);
  };

  const unreadCount = allNotifs.filter(n => !n.read && !n.archived).length;
  const archivedCount = allNotifs.filter(n => n.archived).length;
  const types = ['All', ...new Set(allNotifs.map(n => n.type))];
  const priorities = ['All', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Notifications' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Notification Center</h1>
          <p className="text-sm text-text-secondary">
            {notificationsLoading ? 'Loading from server...' : `${unreadCount} unread notifications`}
            {!notificationsLoading && notificationsSource === 'mock' && <span className="ml-2 text-warning">(demo data)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={Check} onClick={handleMarkAllRead}>Mark All Read</Button>
        </div>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notifications..."
          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-surface-3 border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex bg-surface-3 rounded-lg p-0.5">
          {['unread', 'read', 'all', 'archived'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-xs font-medium rounded-md capitalize ${tab === t ? 'bg-primary text-white' : 'text-text-secondary'}`}>
              {t} {t === 'unread' && unreadCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">{unreadCount}</span>}
              {t === 'archived' && archivedCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">{archivedCount}</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {types.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`px-2.5 py-1 rounded-full text-[10px] font-medium capitalize ${typeFilter === t ? 'bg-primary text-white' : 'bg-surface-3 text-text-secondary hover:text-text'}`}>{t}</button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {priorities.map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)} className={`px-2.5 py-1 rounded-full text-[10px] font-medium capitalize ${priorityFilter === p ? 'bg-primary text-white' : 'bg-surface-3 text-text-secondary hover:text-text'}`}>{p === 'All' ? 'All Priorities' : p}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(n => (
          <div key={n.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:bg-surface-3/50 ${n.read ? 'bg-surface-2 border-border' : 'bg-surface-2 border-primary/20'}`}
            onClick={() => handleClick(n)}>
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${n.read ? 'text-text-secondary' : 'text-text font-medium'}`}>{n.message}</p>
              <p className="text-xs text-text-secondary mt-0.5">{n.time}</p>
            </div>
            {n.priority && <Badge variant={priorityColors[n.priority] || 'default'}>{n.priority}</Badge>}
            <Badge variant={typeColors[n.type] || 'default'}>{n.category || n.type}</Badge>
            <button onClick={(e) => { e.stopPropagation(); handleArchiveToggle(n); }} className="p-1.5 rounded-lg hover:bg-primary/10 text-text-secondary hover:text-primary" title={n.archived ? 'Unarchive' : 'Archive'}>
              {n.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(n); }} className="p-1.5 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger"><Trash2 size={14} /></button>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12"><Bell size={32} className="mx-auto text-text-secondary mb-3" /><p className="text-sm text-text-secondary">No notifications</p></div>}
      </div>
    </div>
  );
}
