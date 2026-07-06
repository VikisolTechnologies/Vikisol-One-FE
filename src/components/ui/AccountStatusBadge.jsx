import Badge from './Badge';

// Single source of truth for how the 6 account-status values render, so every surface in the
// app (Linked Accounts panel, Security Center, anywhere else this is added) looks identical
// instead of each screen inventing its own color mapping.
const VARIANTS = {
  ACTIVE: 'success',
  LOCKED: 'danger',
  PENDING_ACTIVATION: 'warning',
  PASSWORD_EXPIRED: 'warning',
  SUSPENDED: 'danger',
  DISABLED: 'default',
  NO_ACCOUNT: 'default',
};

export default function AccountStatusBadge({ status }) {
  const key = status || 'NO_ACCOUNT';
  return (
    <Badge variant={VARIANTS[key] || 'default'} dot>
      {key.replace(/_/g, ' ')}
    </Badge>
  );
}
