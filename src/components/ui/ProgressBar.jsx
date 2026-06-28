export default function ProgressBar({ value, max = 100, color = 'primary', size = 'md', showLabel = false }) {
  const pct = Math.min((value / max) * 100, 100);
  const colors = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', info: 'bg-info' };
  const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };

  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 bg-surface-3 rounded-full overflow-hidden ${heights[size]}`}>
        <div className={`${colors[color]} ${heights[size]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-xs font-medium text-text-secondary w-10 text-right">{Math.round(pct)}%</span>}
    </div>
  );
}
