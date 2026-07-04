import { motion } from 'framer-motion';
import { useMemo } from 'react';

function MiniSparkline({ color = '#FF6B35' }) {
  const points = useMemo(() => Array.from({ length: 7 }, () => Math.random() * 24 + 4), []);
  const max = Math.max(...points);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${i * 10},${28 - (p / max) * 24}`).join(' ');
  const areaD = d + ` L60,28 L0,28 Z`;
  return (
    <svg width="64" height="28" viewBox="0 0 64 28" className="opacity-60 group-hover:opacity-100 transition-opacity">
      <defs><linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={areaD} fill={`url(#sg-${color.replace('#','')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const colorMap = {
  primary: { bg: 'bg-primary/10', text: 'text-primary', icon: 'text-primary', border: 'hover:border-primary/40', hex: '#FF6B35' },
  success: { bg: 'bg-success/10', text: 'text-success', icon: 'text-success', border: 'hover:border-success/40', hex: '#34D399' },
  warning: { bg: 'bg-warning/10', text: 'text-warning', icon: 'text-warning', border: 'hover:border-warning/40', hex: '#FBBF24' },
  danger: { bg: 'bg-danger/10', text: 'text-danger', icon: 'text-danger', border: 'hover:border-danger/40', hex: '#F87171' },
  info: { bg: 'bg-info/10', text: 'text-info', icon: 'text-info', border: 'hover:border-info/40', hex: '#60A5FA' },
  default: { bg: 'bg-surface-3', text: 'text-text-secondary', icon: 'text-text-secondary', border: 'hover:border-border', hex: '#94A3B8' },
};

export default function StatCard({ icon: Icon, label, value, change, changeType = 'positive', color = 'primary', delay = 0, showSparkline = true }) {
  const c = colorMap[color] || colorMap.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: delay * 0.06, duration: 0.35, ease: 'easeOut' }}
      className={`bg-surface-2 border border-border rounded-xl p-5 min-h-[128px] flex flex-col justify-between ${c.border} transition-all duration-200 group hover-glow cursor-pointer`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider">{label}</p>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay * 0.06 + 0.15, duration: 0.3 }}
            className="text-2xl font-bold text-text mt-1.5 tracking-tight tabular-nums truncate"
            title={typeof value === 'string' ? value : undefined}
          >
            {value}
          </motion.p>
          {change && (
            <p className={`text-[11px] mt-1 font-medium truncate ${changeType === 'positive' ? 'text-success' : 'text-danger'}`}>
              {changeType === 'positive' ? '↑' : '↓'} {change}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg} group-hover:scale-110 transition-transform duration-200`}>
            <Icon size={18} className={c.icon} />
          </div>
          {showSparkline && <MiniSparkline color={c.hex} />}
        </div>
      </div>
    </motion.div>
  );
}
