const variants = {
  success: 'bg-success/15 text-success border-success/20',
  warning: 'bg-warning/15 text-warning border-warning/20',
  danger: 'bg-danger/15 text-danger border-danger/20',
  info: 'bg-info/15 text-info border-info/20',
  primary: 'bg-primary/15 text-primary border-primary/20',
  default: 'bg-surface-3 text-text-secondary border-border',
};

const statusMap = {
  Active: 'success', 'On Track': 'success', Approved: 'success', Resolved: 'success', Completed: 'success', Submitted: 'success',
  'On Leave': 'warning', Pending: 'warning', 'In Progress': 'warning', 'At Risk': 'warning', Medium: 'warning',
  Inactive: 'danger', Rejected: 'danger', Open: 'danger', Delayed: 'danger', High: 'danger',
  Low: 'info', Draft: 'info',
};

export default function Badge({ children, variant, dot = false, className = '' }) {
  const v = variant || statusMap[children] || 'default';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${variants[v]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current`} />}
      {children}
    </span>
  );
}
