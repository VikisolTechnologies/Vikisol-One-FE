export default function Input({ label, icon: Icon, error, className = '', ...props }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />}
        <input
          className={`w-full bg-surface-3 border ${error ? 'border-danger' : 'border-border'} rounded-lg py-2.5 ${Icon ? 'pl-10' : 'pl-3'} pr-3 text-sm text-text placeholder-text-secondary/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function Select({ label, options, className = '', ...props }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <select className="w-full bg-surface-3 border border-border rounded-lg py-2.5 px-3 text-sm text-text focus:outline-none focus:border-primary transition-all appearance-none" {...props}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Textarea({ label, className = '', ...props }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <textarea className="w-full bg-surface-3 border border-border rounded-lg py-2.5 px-3 text-sm text-text placeholder-text-secondary/60 focus:outline-none focus:border-primary transition-all resize-none" rows={4} {...props} />
    </div>
  );
}
