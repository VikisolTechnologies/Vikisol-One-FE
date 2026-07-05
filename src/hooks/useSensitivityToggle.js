import { useState, useCallback } from 'react';

// One global "reveal all sensitive data" switch per page, instead of an eye icon next to every
// field. Scoped to `pageKey` (e.g. 'payroll', 'employee-profile') so revealing salary in Payroll
// doesn't also reveal it in Reports - each page remembers its own state. Persisted in
// sessionStorage only (cleared when the tab closes), matching the existing per-field reveal
// convention in SensitiveValue.
const STORAGE_PREFIX = 'vikisol_reveal_page_';

export default function useSensitivityToggle(pageKey) {
  const storageKey = `${STORAGE_PREFIX}${pageKey}`;
  const [revealed, setRevealed] = useState(() => sessionStorage.getItem(storageKey) === '1');

  const toggle = useCallback(() => {
    setRevealed(prev => {
      const next = !prev;
      sessionStorage.setItem(storageKey, next ? '1' : '0');
      return next;
    });
  }, [storageKey]);

  return [revealed, toggle];
}
