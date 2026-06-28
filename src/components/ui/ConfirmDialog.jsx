import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import Button from './Button';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback(({ title = 'Are you sure?', message = '', type = 'danger', confirmText = 'Confirm', cancelText = 'Cancel' } = {}) => {
    return new Promise((resolve) => {
      setState({ title, message, type, confirmText, cancelText, resolve });
    });
  }, []);

  const handleAction = (result) => {
    state?.resolve(result);
    setState(null);
  };

  const icons = { danger: Trash2, warning: AlertTriangle, info: Info };
  const iconColors = { danger: 'bg-danger/10 text-danger', warning: 'bg-warning/10 text-warning', info: 'bg-info/10 text-info' };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {state && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => handleAction(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-surface-2 border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex flex-col items-center text-center">
                {(() => { const Icon = icons[state.type]; return (
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${iconColors[state.type]}`}>
                    <Icon size={24} />
                  </div>
                ); })()}
                <h3 className="text-lg font-semibold text-text mb-1">{state.title}</h3>
                {state.message && <p className="text-sm text-text-secondary mb-5">{state.message}</p>}
                <div className="flex gap-3 w-full">
                  <Button variant="secondary" className="flex-1" onClick={() => handleAction(false)}>{state.cancelText}</Button>
                  <Button variant={state.type === 'danger' ? 'danger' : 'primary'} className="flex-1" onClick={() => handleAction(true)}>{state.confirmText}</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
