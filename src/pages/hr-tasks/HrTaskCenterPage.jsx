import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Breadcrumb from '../../components/ui/Breadcrumb';
import StatCard from '../../components/ui/StatCard';
import { useToast } from '../../components/ui/Toast';
import { getHrTaskCenter } from '../../api/hrTasks';
import {
  ShieldCheck, FileWarning, UserPlus, HourglassIcon, BadgeCheck, LogOut, Monitor, MessageSquareOff, ChevronDown, ChevronUp,
} from 'lucide-react';

// One entry per category - route/label mirror the deep-links these items should navigate to
// (e.g. a BGV item goes to /background-verification, an asset item goes to /offboarding), matching
// the real routes registered in App.jsx.
const CATEGORIES = [
  { key: 'bgvPending', label: 'BGV Pending', icon: ShieldCheck, color: 'warning', route: '/background-verification' },
  { key: 'documentsPending', label: 'Documents Pending', icon: FileWarning, color: 'warning', route: '/documents' },
  { key: 'joiningTomorrow', label: 'Joining Tomorrow', icon: UserPlus, color: 'info', route: '/employees' },
  { key: 'probationEnding', label: 'Probation Ending', icon: HourglassIcon, color: 'warning', route: '/employees' },
  { key: 'confirmationDue', label: 'Confirmation Due', icon: BadgeCheck, color: 'danger', route: '/employees' },
  { key: 'resignationPending', label: 'Resignation Pending', icon: LogOut, color: 'danger', route: '/offboarding' },
  { key: 'assetCollectionPending', label: 'Asset Collection Pending', icon: Monitor, color: 'warning', route: '/offboarding' },
];

export default function HrTaskCenterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await getHrTaskCenter();
        setData(result);
      } catch (err) {
        toast.error(err.message || 'Failed to load HR Task Center');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (key) => setExpanded((prev) => (prev === key ? null : key));

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'HR Task Center' }]} />
      <div>
        <h1 className="text-xl font-bold text-text">HR Task Center</h1>
        <p className="text-sm text-text-secondary">Everything HR needs to act on today, consolidated in one place.</p>
      </div>

      {loading && <p className="text-sm text-text-secondary">Loading...</p>}

      {!loading && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map((c) => (
              <StatCard
                key={c.key}
                label={c.label}
                value={data.counts?.[c.key] ?? 0}
                icon={c.icon}
                color={c.color}
                showSparkline={false}
              />
            ))}
          </div>

          <div className="space-y-3">
            {CATEGORIES.map((c) => {
              const items = data[c.key] || [];
              const isOpen = expanded === c.key;
              return (
                <Card key={c.key} padding={false}>
                  <button
                    className="w-full flex items-center justify-between p-4"
                    onClick={() => toggle(c.key)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center">
                        <c.icon size={16} className="text-text-secondary" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-text">{c.label}</p>
                        <p className="text-[11px] text-text-secondary">{items.length} item{items.length === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={items.length > 0 ? c.color : 'default'}>{items.length}</Badge>
                      {isOpen ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border px-4 pb-4 pt-2">
                      {items.length === 0 && (
                        <p className="text-xs text-text-secondary py-3">Nothing pending in this category.</p>
                      )}
                      <div className="divide-y divide-border">
                        {items.map((item, idx) => (
                          <button
                            key={`${item.employeeId}-${idx}`}
                            onClick={() => navigate(c.route)}
                            className="w-full flex items-center justify-between py-2.5 text-left hover:bg-surface-3 rounded-lg px-2 -mx-2 transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium text-text">{item.employeeName}</p>
                              <p className="text-[11px] text-text-secondary">{item.employeeCode} - {item.context}</p>
                            </div>
                            {item.date && <span className="text-[11px] text-text-secondary">{item.date}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Exit Interview Pending has no backing data source yet - the Offboarding module has
                no exit-interview concept as of this session, so this is shown as an honest gap
                rather than a fabricated empty/zero category. */}
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center">
                  <MessageSquareOff size={16} className="text-text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">Exit Interview Pending</p>
                  <p className="text-[11px] text-text-secondary">Not available yet - no exit interview tracking exists in the Offboarding module.</p>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
