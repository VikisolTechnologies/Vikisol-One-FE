// Centralized formatting so currency/number/date/percent never render differently across pages
// (the reported bug: "₹119,041" on one card vs "₹119,041.33" on another, same grid row).
// Always uses the Indian numbering system (lakh/crore grouping) and a fixed decimal count,
// so digit-count/decimal inconsistency can't cause layout shift between sibling values.

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INR_FORMATTER_NO_DECIMALS = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(value, { decimals = true } = {}) {
  const num = Number(value) || 0;
  return (decimals ? INR_FORMATTER : INR_FORMATTER_NO_DECIMALS).format(num);
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value) || 0);
}

export function formatPercent(value, { decimals = 1 } = {}) {
  const num = Number(value) || 0;
  return `${num.toFixed(decimals)}%`;
}

export function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
