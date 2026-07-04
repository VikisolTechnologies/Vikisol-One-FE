import { ChevronRight, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Breadcrumb({ items }) {
  const navigate = useNavigate();
  return (
    <nav className="flex items-center gap-1.5 text-xs text-text-secondary mb-4">
      <button onClick={() => navigate('/')} className="hover:text-primary transition-colors flex items-center gap-1"><Home size={12} /> Dashboard</button>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight size={12} />
          {item.path || item.onClick ? (
            <button onClick={() => (item.onClick ? item.onClick() : navigate(item.path))} className="hover:text-primary transition-colors">{item.label}</button>
          ) : (
            <span className="text-text font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
