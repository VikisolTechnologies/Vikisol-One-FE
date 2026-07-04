import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

// Shared "failed to load, here's why, try again" state - the request spec calls for every
// data-fetching page to show this instead of silently falling back to mock/empty data with no
// indication anything went wrong.
export default function ErrorState({ message = 'Something went wrong while loading this data.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mb-4">
        <AlertTriangle size={28} className="text-danger" />
      </div>
      <h3 className="text-base font-semibold text-text mb-1">Couldn't load this data</h3>
      <p className="text-sm text-text-secondary max-w-sm">{message}</p>
      {onRetry && <Button className="mt-4" icon={RefreshCw} onClick={onRetry}>Retry</Button>}
    </div>
  );
}
