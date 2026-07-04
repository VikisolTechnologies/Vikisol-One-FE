// Single shared loading spinner - replaces 3 copy-pasted identical `animate-spin` divs
// (App.jsx's route fallback, CompanyBranding.jsx, DocumentStudio.jsx) with one component, so any
// future async page reaches for this instead of re-inventing the markup again.
const SIZES = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-9 h-9 border-[3px]' };

export default function Loader({ size = 'md', label, fullPage = false, className = '' }) {
  const spinner = (
    <div
      role="status"
      aria-label={label || 'Loading'}
      className={`${SIZES[size]} border-primary border-t-transparent rounded-full animate-spin ${className}`}
    />
  );

  if (!fullPage) return spinner;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      {spinner}
      {label && <p className="text-sm text-text-secondary">{label}</p>}
    </div>
  );
}
