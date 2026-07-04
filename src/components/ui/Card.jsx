import { motion } from 'framer-motion';

export default function Card({ children, className = '', style, title, subtitle, action, padding = true, hoverable = false, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={style}
      onClick={onClick}
      className={`bg-surface-2 border border-border rounded-xl shadow-sm ${padding ? 'p-5' : ''} ${hoverable ? 'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer' : 'transition-colors'} ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-text">{title}</h3>}
            {subtitle && <p className="text-[11px] text-text-secondary mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </motion.div>
  );
}
