// Browsers already restrict type="number" fields to digits/decimal, but still let people type
// "e", "+", "-", which produces confusing values like "1e5" in a CTC or weight field. Block those.
const BLOCKED_NUMBER_KEYS = new Set(['e', 'E', '+', '-']);

function handleNumberKeyDown(e, onKeyDown) {
  if (BLOCKED_NUMBER_KEYS.has(e.key)) e.preventDefault();
  onKeyDown?.(e);
}

// Also guards against pasting non-numeric text into a number field.
function handleNumberPaste(e, onPaste) {
  const text = e.clipboardData?.getData('text') ?? '';
  if (text && !/^-?\d*\.?\d*$/.test(text)) e.preventDefault();
  onPaste?.(e);
}

// Chrome's native date input lets fast typing overflow the year segment past 4 digits
// (e.g. "52022-02-25"), which the backend then fails to parse as a LocalDate. Clamp it.
function handleDateChange(e, onChange) {
  const value = e.target.value;
  const match = /^(\d+)-(\d{2})-(\d{2})$/.exec(value);
  if (match && match[1].length > 4) {
    e.target.value = `${match[1].slice(-4)}-${match[2]}-${match[3]}`;
  }
  onChange?.(e);
}

export default function Input({ label, icon: Icon, error, className = '', type, onKeyDown, onPaste, onChange, ...props }) {
  const isNumber = type === 'number';
  const isDate = type === 'date';
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />}
        <input
          type={type}
          className={`w-full bg-surface-3 border ${error ? 'border-danger' : 'border-border'} rounded-lg py-2.5 ${Icon ? 'pl-10' : 'pl-3'} pr-3 text-sm text-text placeholder-text-secondary/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all`}
          onKeyDown={isNumber ? (e) => handleNumberKeyDown(e, onKeyDown) : onKeyDown}
          onPaste={isNumber ? (e) => handleNumberPaste(e, onPaste) : onPaste}
          onWheel={isNumber ? (e) => e.currentTarget.blur() : undefined}
          onChange={isDate ? (e) => handleDateChange(e, onChange) : onChange}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function Select({ label, options, className = '', placeholder, ...props }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <select className="w-full bg-surface-3 border border-border rounded-lg py-2.5 px-3 text-sm text-text focus:outline-none focus:border-primary transition-all appearance-none" {...props}>
        {placeholder && <option value="">{placeholder}</option>}
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
