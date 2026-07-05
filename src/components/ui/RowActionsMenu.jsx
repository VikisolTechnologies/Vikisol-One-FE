import { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { createPortal } from 'react-dom';

// Consolidates per-row action buttons (View/Download/Print/Email/Delete...) into a single
// "kebab" trigger - built for tables where each row previously rendered 3-5 separate icon
// buttons, which crowds the row and doesn't scale as more actions are added.
// `actions`: [{ label, icon, onClick, danger }]
export default function RowActionsMenu({ actions = [] }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = (e) => {
    e.stopPropagation();
    if (!open) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.right - 160 });
    }
    setOpen(o => !o);
  };

  return (
    <>
      <button ref={btnRef} onClick={toggle} aria-label="Row actions" aria-haspopup="menu" aria-expanded={open}
        className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary">
        <MoreVertical size={16} />
      </button>
      {open && createPortal(
        <div ref={menuRef} role="menu" style={{ position: 'fixed', top: coords.top, left: coords.left }}
          className="w-40 py-1 bg-surface-2 border border-border rounded-lg shadow-xl z-50">
          {actions.map((a, i) => (
            <button key={i} role="menuitem" onClick={(e) => { e.stopPropagation(); setOpen(false); a.onClick(); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-surface-3 transition-colors ${a.danger ? 'text-danger' : 'text-text'}`}>
              {a.icon && <a.icon size={14} />} {a.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
