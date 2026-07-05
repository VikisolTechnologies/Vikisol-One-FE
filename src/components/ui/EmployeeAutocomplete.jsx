import { useState, useRef, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';

function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/25 text-inherit rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// Searchable employee picker - replaces a plain <select> that becomes unusable once the
// employee list grows past a screenful. Matches by name OR employee ID, highlights the matched
// substring, and supports both keyboard (arrows/enter/escape) and mouse selection.
export default function EmployeeAutocomplete({ employees = [], value, onChange, label = 'Employee', placeholder = 'Search by Name or Employee ID', excludeIds = [] }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  const selectedEmployee = employees.find(e => e.id === value) || null;

  const results = useMemo(() => {
    const excluded = new Set(excludeIds);
    const pool = employees.filter(e => !excluded.has(e.id));
    if (!query.trim()) return pool.slice(0, 8);
    const q = query.toLowerCase();
    return pool.filter(e => e.name?.toLowerCase().includes(q) || e.empId?.toLowerCase().includes(q)).slice(0, 8);
  }, [employees, query, excludeIds]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => setActiveIndex(0), [query, open]);

  const select = (emp) => {
    onChange(emp.id);
    setQuery('');
    setOpen(false);
  };

  const clear = () => {
    onChange('');
    setQuery('');
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[activeIndex]) select(results[activeIndex]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>}
      {selectedEmployee && !open ? (
        <div className="flex items-center justify-between bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm">
          <span className="text-text font-medium">{selectedEmployee.name} <span className="text-text-secondary font-normal">({selectedEmployee.empId})</span></span>
          <button type="button" onClick={clear} aria-label="Clear selection" className="text-text-secondary hover:text-text"><X size={14} /></button>
        </div>
      ) : (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="w-full bg-surface-3 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text focus:outline-none focus:border-primary placeholder-text-secondary/50"
          />
        </div>
      )}

      {open && !selectedEmployee && (
        <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-surface-2 border border-border rounded-lg shadow-xl py-1">
          {results.length === 0 && <p className="px-3 py-2 text-xs text-text-secondary">No employees found</p>}
          {results.map((e, i) => (
            <button
              key={e.id}
              type="button"
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => select(e)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${i === activeIndex ? 'bg-primary/10 text-text' : 'text-text hover:bg-surface-3'}`}
            >
              <span className="truncate">{highlight(e.name || '', query)}</span>
              <span className="text-[11px] text-text-secondary flex-shrink-0">{highlight(e.empId || '', query)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
