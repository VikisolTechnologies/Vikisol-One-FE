export default function Skeleton({ className = '', variant = 'rect' }) {
  const base = 'animate-pulse bg-surface-3 rounded-lg';
  const variants = {
    rect: 'h-4 w-full',
    circle: 'h-10 w-10 rounded-full',
    card: 'h-32 w-full rounded-xl',
    stat: 'h-24 w-full rounded-xl',
    table: 'h-12 w-full',
  };
  return <div className={`${base} ${variants[variant]} ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
