import { Inbox } from 'lucide-react';
import Button from './Button';

export default function EmptyState({ icon: Icon = Inbox, title = 'No data found', description, action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
        <Icon size={28} className="text-text-secondary" />
      </div>
      <h3 className="text-base font-semibold text-text mb-1">{title}</h3>
      {description && <p className="text-sm text-text-secondary max-w-sm">{description}</p>}
      {action && <Button className="mt-4" onClick={action}>{actionLabel}</Button>}
    </div>
  );
}
