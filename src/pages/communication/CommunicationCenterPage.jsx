import { useEffect, useMemo, useState } from 'react';
import { Mail, Search, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Loader from '../../components/ui/Loader';
import { useToast } from '../../components/ui/Toast';
import * as communicationApi from '../../api/communication';

const CATEGORIES = ['OFFER', 'INTERVIEW', 'JOINING', 'WELCOME', 'EXIT', 'REMINDER', 'OTHER'];
const STATUSES = ['SENT', 'FAILED', 'RETRIED'];

const statusVariant = { SENT: 'success', FAILED: 'danger', RETRIED: 'warning' };

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

// Admin/CEO/HR_MANAGER-facing audit log of every outbound email the system has sent (offers,
// interview invites, welcome/activation, exit package, reminders, etc.) - distinct from the
// personal Notification Center, which is per-user in-app alerts.
//
// Note on "Retry": EmailLog only records the recipient/subject/status/error for audit purposes -
// it deliberately does NOT store the original HTML body, so there is no safe way to literally
// resend a failed email from this table without either re-triggering the original business
// action (offer regeneration, interview reschedule, etc.) or duplicating a lot of templating
// logic here. Rather than ship a "Retry" button that doesn't actually retry anything, failed
// rows just show their error message - the real fix is to redo the underlying action.
export default function CommunicationCenterPage() {
  const toast = useToast();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    communicationApi.getEmails({
      page, size: 20, category: category || undefined, status: status || undefined,
      search: search || undefined,
      fromDate: fromDate ? `${fromDate}T00:00:00` : undefined,
      toDate: toDate ? `${toDate}T23:59:59` : undefined,
    })
      .then(res => {
        setEmails(res.items);
        setTotalPages(res.totalPages);
      })
      .catch(err => {
        setError(err.message || 'Failed to load emails');
        toast.error(err.message || 'Failed to load emails');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, status, search, fromDate, toDate]);

  const counts = useMemo(() => {
    const c = { SENT: 0, FAILED: 0, RETRIED: 0 };
    emails.forEach(e => { if (c[e.status] !== undefined) c[e.status]++; });
    return c;
  }, [emails]);

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Communication Center' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Communication Center</h1>
          <p className="text-sm text-text-secondary">Audit log of all outbound emails sent by the system</p>
        </div>
        <button onClick={() => setPage(p => p)} className="p-2 rounded-lg hover:bg-surface-3 text-text-secondary" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="!p-4"><p className="text-xs text-text-secondary">Sent (this page)</p><p className="text-xl font-bold text-success mt-1">{counts.SENT}</p></Card>
        <Card className="!p-4"><p className="text-xs text-text-secondary">Failed (this page)</p><p className="text-xl font-bold text-danger mt-1">{counts.FAILED}</p></Card>
        <Card className="!p-4"><p className="text-xs text-text-secondary">Retried (this page)</p><p className="text-xl font-bold text-warning mt-1">{counts.RETRIED}</p></Card>
      </div>

      <Card className="!p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={search} onChange={e => { setPage(0); setSearch(e.target.value); }} placeholder="Search recipient or subject..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-surface-3 border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={category} onChange={e => { setPage(0); setCategory(e.target.value); }} className="px-3 py-2 text-sm rounded-lg bg-surface-3 border border-border">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={status} onChange={e => { setPage(0); setStatus(e.target.value); }} className="px-3 py-2 text-sm rounded-lg bg-surface-3 border border-border">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={e => { setPage(0); setFromDate(e.target.value); }} className="px-3 py-2 text-sm rounded-lg bg-surface-3 border border-border" />
          <input type="date" value={toDate} onChange={e => { setPage(0); setToDate(e.target.value); }} className="px-3 py-2 text-sm rounded-lg bg-surface-3 border border-border" />
        </div>
      </Card>

      <Card padding={false}>
        {loading ? (
          <div className="p-12 flex justify-center"><Loader /></div>
        ) : error ? (
          <div className="p-12 text-center text-sm text-danger">{error}</div>
        ) : emails.length === 0 ? (
          <div className="p-12 text-center">
            <Mail size={32} className="mx-auto text-text-secondary mb-3" />
            <p className="text-sm text-text-secondary">No emails found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Recipient</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                </tr>
              </thead>
              <tbody>
                {emails.map(e => (
                  <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-surface-3/50">
                    <td className="px-4 py-3 text-text">{e.recipientEmail}</td>
                    <td className="px-4 py-3 text-text-secondary max-w-[280px] truncate" title={e.subject}>{e.subject}</td>
                    <td className="px-4 py-3"><Badge variant="default">{e.category}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[e.status] || 'default'}>{e.status}</Badge>
                      {e.status === 'FAILED' && e.errorMessage && (
                        <p className="text-[11px] text-danger/80 mt-1 max-w-[220px] truncate" title={e.errorMessage}>{e.errorMessage}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{timeAgo(e.sentAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
            className="px-3 py-1.5 text-xs rounded-lg bg-surface-3 disabled:opacity-40 text-text-secondary">Previous</button>
          <span className="text-xs text-text-secondary">Page {page + 1} of {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-xs rounded-lg bg-surface-3 disabled:opacity-40 text-text-secondary">Next</button>
        </div>
      )}
    </div>
  );
}
