import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Trash2, Download, Mail, UserPlus } from 'lucide-react';
import Button from './Button';

export default function BulkActions({ selectedCount, onApprove, onReject, onDelete, onExport, onEmail, onAssign, onClear }) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface-2 border border-border rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3"
        >
          <span className="text-sm font-semibold text-text">{selectedCount} selected</span>
          <div className="w-px h-6 bg-border" />
          {onApprove && <Button size="sm" icon={Check} onClick={onApprove}>Approve</Button>}
          {onReject && <Button size="sm" variant="danger" icon={X} onClick={onReject}>Reject</Button>}
          {onDelete && <Button size="sm" variant="danger" icon={Trash2} onClick={onDelete}>Delete</Button>}
          {onExport && <Button size="sm" variant="secondary" icon={Download} onClick={onExport}>Export</Button>}
          {onEmail && <Button size="sm" variant="secondary" icon={Mail} onClick={onEmail}>Email</Button>}
          {onAssign && <Button size="sm" variant="secondary" icon={UserPlus} onClick={onAssign}>Assign</Button>}
          <button onClick={onClear} className="text-xs text-text-secondary hover:text-text ml-1">Clear</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
