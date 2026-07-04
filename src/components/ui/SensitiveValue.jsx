import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

// Reusable hide/reveal control for every confidential field in the app (salary, CTC, bank
// account, PAN, Aadhaar, etc.) - one component so masking rules, the reveal toggle, and
// permission handling behave identically everywhere instead of being reimplemented per page.
//
// Reveal state persists in sessionStorage (cleared when the tab closes) keyed by `id`, so a
// field a user has already revealed stays revealed across re-renders/navigation within the same
// session, per the "remember only for the current session" requirement - without a shared
// global toggle, since each field should be independently revealable per the enterprise pattern
// (Payroll platforms show one masked value at a time, not an all-or-nothing switch).
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
 * @param id - stable unique key for this field, used to persist reveal state for the session
 * @param canReveal - role-based permission gate; if false, the value stays masked with no toggle
 * @param className - applied to the value text
 */
export default function SensitiveValue({ value, type = 'currency', id, canReveal = true, className = '' }) {
  const [revealed, setRevealed] = useState(() => (id ? getRevealedSet().has(id) : false));

  const toggle = () => {
    if (!canReveal) return;
    const next = !revealed;
    setRevealed(next);
    if (id) {
      const set = getRevealedSet();
      next ? set.add(id) : set.delete(id);
      persistRevealedSet(set);
    }
  };

  const shown = revealed && canReveal;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`tabular-nums ${className}`}>
        {shown ? display(value, type) : mask(value, type)}
      </span>
      {canReveal && (
        <button
          type="button"
          onClick={toggle}
          aria-label={shown ? 'Hide value' : 'Reveal value'}
          aria-pressed={shown}
          className="text-text-secondary hover:text-text transition-colors"
        >
          {shown ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      )}
    </span>
  );
}
