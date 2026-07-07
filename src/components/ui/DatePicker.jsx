import { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toDateOnly(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function toIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function formatDisplay(date) {
  return date ? `${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)} ${date.getFullYear()}` : '';
}

// Replaces the native browser date input (whose popup calendar looks inconsistent across
// browsers and clashes with the app's dark theme) with a themed picker matching the rest of the
// UI - includes quick month/year dropdowns since date-of-birth entry needs to jump back decades,
// not just click "previous month" dozens of times.
export default function DatePicker({ label, value, onChange, max, min, placeholder = 'Select date' }) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => toDateOnly(value), [value]);
  const [viewDate, setViewDate] = useState(() => selected || new Date());
  const containerRef = useRef(null);

  useEffect(() => { if (selected) setViewDate(selected); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const maxDate = max ? toDateOnly(max) : null;
  const minDate = min ? toDateOnly(min) : null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const start = minDate ? minDate.getFullYear() : currentYear - 100;
    const end = maxDate ? maxDate.getFullYear() : currentYear;
    return Array.from({ length: end - start + 1 }, (_, i) => end - i);
  }, [minDate, maxDate]);

  const isDisabled = (day) => {
    const d = new Date(year, month, day);
    if (maxDate && d > maxDate) return true;
    if (minDate && d < minDate) return true;
    return false;
  };

  const selectDay = (day) => {
    if (isDisabled(day)) return;
    onChange(toIso(new Date(year, month, day)));
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="text-xs font-medium text-text-secondary block mb-1.5">{label}</label>}
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-surface-3 border border-border rounded-lg py-2.5 pl-10 pr-3 text-sm text-left text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all relative">
        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <span className={selected ? 'text-text' : 'text-text-secondary/60'}>{selected ? formatDisplay(selected) : placeholder}</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-72 bg-surface-2 border border-border rounded-xl shadow-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-surface-3 text-text-secondary"><ChevronLeft size={16} /></button>
            <select value={month} onChange={e => setViewDate(new Date(year, Number(e.target.value), 1))}
              className="flex-1 bg-surface-3 border border-border rounded-lg py-1 px-2 text-xs text-text focus:outline-none">
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setViewDate(new Date(Number(e.target.value), month, 1))}
              className="bg-surface-3 border border-border rounded-lg py-1 px-2 text-xs text-text focus:outline-none">
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-surface-3 text-text-secondary"><ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map(w => <div key={w} className="text-center text-[10px] text-text-secondary font-medium py-1">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const isSelected = selected && selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day;
              const disabled = isDisabled(day);
              return (
                <button key={day} type="button" disabled={disabled} onClick={() => selectDay(day)}
                  className={`aspect-square rounded-lg text-xs transition-colors ${
                    isSelected ? 'bg-primary text-white font-semibold' :
                    disabled ? 'text-text-secondary/30 cursor-not-allowed' :
                    'text-text hover:bg-surface-3'
                  }`}>
                  {day}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => { onChange(toIso(new Date())); setOpen(false); }}
            className="w-full mt-2 pt-2 border-t border-border text-xs text-primary hover:underline">Today</button>
        </div>
      )}
    </div>
  );
}
