import { useState, useMemo } from 'react';
import { Bell, Check, Trash2, Archive, Filter } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Breadcrumb from '../components/ui/Breadcrumb';
import { useData } from '../context/DataContext';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';

const typeColors = { leave: 'warning', interview: 'info', payroll: 'success', project: 'primary', asset: 'default', system: 'danger', announcement: 'primary', birthday: 'warning', anniversary: 'success' };

export default function NotificationCenter() {
  const { data, markNotificationRead, markAllNotificationsRead, notifications } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState('All');
  const [tab, setTab] = useState('unread');

  const allNotifs = data.notifications;
  const filtered = useMemo(() => {
    let list = allNotifs;
    if (tab === 'unread') list = list.filter(n => !n.read);
    if (tab === 'read') list = list.filter(n => n.read);
    if (filter !== 'All') list = list.filter(n => n.type === filter);
    return list;
  }, [allNotifs, tab, filter]);

  const handleMarkAllRead = () => { markAllNotificationsRead(); toast.success('All notifications marked as read'); };
  const handleDelete = async (notif) => {
    const ok = await confirm({ title: 'Delete Notification?', message: 'Remove this notification?', type: 'danger', confirmText: 'Delete' });
    if (ok) { notifications.remove(notif.id); toast.success('Notification deleted'); }
  };

  const unreadCount = allNotifs.filter(n => !n.read).length;
  const types = ['All', ...new Set(allNotifs.map(n => n.type))];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Notifications' }]} />
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-text">Notification Center</h1><p className="text-sm text-text-secondary">{unreadCount} unread notifications</p></div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={Check} onClick={handleMarkAllRead}>Mark All Read</Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-surface-3 rounded-lg p-0.5">
          {['unread', 'read', 'all'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-xs font-medium rounded-md capitalize ${tab === t ? 'bg-primary text-white' : 'text-text-secondary'}`}>
              {t} {t === 'unread' && unreadCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">{unreadCount}</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {types.map(t => (
            <button key={t} onClick={() => setFilter(t)} className={`px-2.5 py-1 rounded-full text-[10px] font-medium capitalize ${filter === t ? 'bg-primary text-white' : 'bg-surface-3 text-text-secondary hover:text-text'}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(n => (
          <div key={n.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:bg-surface-3/50 ${n.read ? 'bg-surface-2 border-border' : 'bg-surface-2 border-primary/20'}`}
            onClick={() => { if (!n.read) markNotificationRead(n.id); }}>
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${n.read ? 'text-text-secondary' : 'text-text font-medium'}`}>{n.message}</p>
              <p className="text-xs text-text-secondary mt-0.5">{n.time}</p>
            </div>
            <Badge variant={typeColors[n.type] || 'default'}>{n.type}</Badge>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(n); }} className="p-1.5 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger"><Trash2 size={14} /></button>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12"><Bell size={32} className="mx-auto text-text-secondary mb-3" /><p className="text-sm text-text-secondary">No notifications</p></div>}
      </div>
    </div>
  );
}
