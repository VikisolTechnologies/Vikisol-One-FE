import { Eye, EyeOff } from 'lucide-react';
import Button from './Button';

// Single toolbar control that shows/hides every sensitive field on the current page at once -
// replaces a per-field eye icon on every row (visual clutter at scale). Only rendered by the
// caller when the viewing user actually has permission to see the underlying data; for users
// without permission, values stay masked with no toggle at all (see canReveal usage sites).
export default function SensitivityToggle({ revealed, onToggle }) {
  return (
    <Button variant={revealed ? 'primary' : 'secondary'} icon={revealed ? EyeOff : Eye} size="sm" onClick={onToggle}>
      {revealed ? 'Hide Sensitive Data' : 'Show Sensitive Data'}
    </Button>
  );
}
