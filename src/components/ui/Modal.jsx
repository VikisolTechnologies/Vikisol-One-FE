import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

let idCounter = 0;
// Module-level stack of every currently-open modal's id, in open order - lets a nested modal
// (e.g. "Generate Document" opened from inside the "Employee Profile" modal) render strictly
// above its parent (every Modal previously used the same flat z-50, so two open modals occupied
// the same stacking layer) and ensures the Escape key only closes the TOPMOST modal instead of
// every open modal's listener firing at once (previously all of them were attached to `document`
// with no awareness of each other).
const openModalStack = [];

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  const dialogRef = useRef(null);
  const titleId = useRef(`modal-title-${idCounter++}`).current;
  const modalId = titleId;
  const [stackIndex, setStackIndex] = useState(0);

  // `onClose` is passed as a fresh arrow function by nearly every caller (`onClose={() =>
  // setX(null)}`), so its identity changes on every parent re-render - including on every
  // keystroke into a controlled input inside the modal (each keystroke's setState re-renders the
  // parent, which recreates the closure). Previously this effect depended on `[open, onClose]`,
  // so it tore down and re-ran on every keystroke, which re-executed `focusable()?.[0]?.focus()`
  // and stole focus away from whatever the user was typing into (usually onto the header's close
  // button, 1-2 keystrokes before the Escape-key listener - re-attached with the same stale timing
  // - ended up closing the modal entirely). Fix: keep a ref to the latest onClose so the effect
  // itself only needs to depend on `open`, and only runs its setup/teardown once per open/close
  // transition, not once per render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    openModalStack.push(modalId);
    setStackIndex(openModalStack.length - 1);

    const previouslyFocused = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusable = () => dialogRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable()?.[0]?.focus();

    const handleKeyDown = (e) => {
      // Only the topmost modal in the stack should respond to Escape/Tab - otherwise opening a
      // "child" modal (e.g. Generate Document) on top of a "parent" one (Employee Profile) meant
      // both modals' listeners fired on a single Escape press, closing both at once and leaving
      // the parent in whatever half-torn-down state its own cleanup left it in.
      if (openModalStack[openModalStack.length - 1] !== modalId) return;
      if (e.key === 'Escape') { onCloseRef.current?.(); return; }
      if (e.key !== 'Tab') return;
      const nodes = focusable();
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      const idx = openModalStack.indexOf(modalId);
      if (idx !== -1) openModalStack.splice(idx, 1);
      document.removeEventListener('keydown', handleKeyDown);
      // Only restore scrolling once every modal has closed - if a parent modal is still open
      // underneath, forcing overflow back to 'visible' here would let the page scroll behind it.
      if (openModalStack.length === 0) document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 50 + stackIndex * 10 }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          {/* overflow-y-auto lives on the plain inner div, NOT the motion.div - Framer Motion
              leaves a non-identity `transform` on its animated element even after the enter
              animation settles, and Chromium mis-hit-tests scrollbar-thumb drags (though not
              wheel/keyboard scrolling) on any element that's simultaneously `overflow: auto` and
              transformed. Splitting "animated wrapper" from "scrolling container" avoids that. */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative bg-surface-2 border border-border rounded-xl ${sizes[size]} w-full max-h-[85vh] flex flex-col`}
          >
            <div className="overflow-y-auto min-h-0 rounded-xl">
              <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface-2 z-10 rounded-t-xl">
                <h2 id={titleId} className="text-lg font-semibold text-text">{title}</h2>
                <button onClick={onClose} aria-label="Close dialog" className="p-1 hover:bg-surface-3 rounded-lg transition-colors text-text-secondary"><X size={18} /></button>
              </div>
              <div className="p-5">{children}</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
