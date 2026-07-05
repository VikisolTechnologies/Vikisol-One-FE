import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatCurrency } from '../../utils/format';

// Reusable masking primitive for every confidential field in the app (salary, CTC, bank
// account, PAN, Aadhaar, etc.).
//
// Two modes:
// - Controlled (`revealed` prop passed, e.g. `revealed={pageRevealAll}` from `useSensitivityToggle`):
//   no per-field button is rendered at all - visibility is driven entirely by the page's single
//   global toggle. This is the enterprise pattern (Workday/SAP/Darwinbox) and the preferred mode
//   for pages with many sensitive fields, since a button next to every field is visual clutter.
// - Uncontrolled (`revealed` omitted): falls back to the original per-field click-to-reveal
//   toggle with its own sessionStorage-persisted state, kept for any page not yet migrated to the
//   global-toggle pattern.
const SESSION_KEY = 'vikisol_revealed_fields';

function getRevealedSet() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function persistRevealedSet(set) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify([...set]));
}

function mask(value, type) {
  const str = value === null || value === undefined ? '' : String(value);
  switch (type) {
    case 'currency':
      return '₹ ********';
    case 'account':
      return str.length >= 4 ? `XXXX XXXX ${str.slice(-4)}` : 'XXXX XXXX XXXX';
    case 'pan':
      return str.length === 10 ? `${str.slice(0, 5)}****${str.slice(-1)}` : 'XXXXX****X';
    case 'aadhaar':
      return str.length >= 4 ? `XXXX XXXX ${str.slice(-4)}` : 'XXXX XXXX XXXX';
    default:
      return '********';
  }
}

function display(value, type) {
  if (type === 'currency') return formatCurrency(value);
  return value === null || value === undefined || value === '' ? '-' : String(value);
}

/**
 * @param value - the raw underlying value (number for currency, string otherwise)
 * @param type - 'currency' | 'account' | 'pan' | 'aadhaar' | 'text'
 * @param id - stable unique key for this field, used to persist reveal state for the session (uncontrolled mode only)
 * @param canReveal - role-based permission gate; if false, the value stays masked with no toggle
 * @param className - applied to the value text
 * @param label - field name used in the reveal button's tooltip/aria-label (uncontrolled mode only)
 * @param revealed - controlled visibility; when provided, this component becomes read-only display with no button
 */
export default function SensitiveValue({ value, type = 'currency', id, canReveal = true, className = '', label = 'Value', revealed: revealedProp }) {
  const controlled = revealedProp !== undefined;
  const [selfRevealed, setSelfRevealed] = useState(() => (id ? getRevealedSet().has(id) : false));

  const toggle = () => {
    if (!canReveal || controlled) return;
    const next = !selfRevealed;
    setSelfRevealed(next);
    if (id) {
      const set = getRevealedSet();
      next ? set.add(id) : set.delete(id);
      persistRevealedSet(set);
    }
  };

  const shown = controlled ? (revealedProp && canReveal) : (selfRevealed && canReveal);

  return (
    <span className="inline-flex items-center gap-1">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={shown ? 'shown' : 'hidden'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={`tabular-nums ${className}`}
        >
          {shown ? display(value, type) : mask(value, type)}
        </motion.span>
      </AnimatePresence>
      {!controlled && canReveal && (
        <button
          type="button"
          onClick={toggle}
          title={shown ? `Hide ${label}` : `Show ${label}`}
          aria-label={shown ? `Hide ${label}` : `Show ${label}`}
          aria-pressed={shown}
          className="p-1 -m-1 rounded-md text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
        >
          {shown ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}
    </span>
  );
}
