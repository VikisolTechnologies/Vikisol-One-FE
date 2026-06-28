import { Check, X, Send, RefreshCw, Clock } from 'lucide-react';
import Avatar from './Avatar';

const actionIcons = { Submitted: Send, Approved: Check, Rejected: X, 'Override: Approved': RefreshCw, 'Override: Rejected': RefreshCw };
const actionColors = { Submitted: 'bg-info/10 text-info border-info/30', Approved: 'bg-success/10 text-success border-success/30', Rejected: 'bg-danger/10 text-danger border-danger/30' };

export default function ApprovalTimeline({ history = [] }) {
  if (history.length === 0) return <p className="text-xs text-text-secondary py-4 text-center">No approval history</p>;

  return (
    <div className="space-y-0">
      {history.map((entry, i) => {
        const Icon = actionIcons[entry.action] || Clock;
        const color = Object.entries(actionColors).find(([k]) => entry.action.includes(k))?.[1] || 'bg-surface-3 text-text-secondary border-border';
        const isLast = i === history.length - 1;
        return (
          <div key={entry.id || i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${color} flex-shrink-0`}>
                <Icon size={14} />
              </div>
              {!isLast && <div className="w-0.5 h-full bg-border min-h-[24px]" />}
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{entry.action}</span>
                <span className="text-[10px] text-text-secondary">{new Date(entry.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Avatar name={entry.by} size="sm" />
                <div>
                  <p className="text-sm font-medium text-text">{entry.by}</p>
                  <p className="text-[10px] text-text-secondary">{entry.designation}</p>
                </div>
              </div>
              {entry.reason && <p className="mt-1.5 text-xs text-text-secondary bg-surface-3 rounded-lg px-3 py-2">"{entry.reason}"</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
