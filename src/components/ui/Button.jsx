const variants = {
  primary: 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20',
  secondary: 'bg-surface-3 hover:bg-surface-4 text-text border border-border',
  danger: 'bg-danger hover:bg-danger/80 text-white',
  ghost: 'hover:bg-surface-3 text-text-secondary hover:text-text',
  outline: 'border border-primary text-primary hover:bg-primary/10',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
};

export default function Button({ children, variant = 'primary', size = 'md', icon: Icon, className = '', ...props }) {
  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}
