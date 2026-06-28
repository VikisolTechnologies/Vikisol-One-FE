import { useState } from 'react';
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

export default function SearchFilter({ searchValue, onSearch, filters = [], activeFilters = {}, onFilterChange, onClearFilters, placeholder = 'Search...' }) {
  const [showFilters, setShowFilters] = useState(false);
  const activeCount = Object.values(activeFilters).filter(v => v && v !== 'All').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={searchValue} onChange={e => onSearch(e.target.value)} placeholder={placeholder}
            className="w-full bg-surface-2 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary transition-all placeholder-text-secondary/50" />
          {searchValue && <button onClick={() => onSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"><X size={14} /></button>}
        </div>
        <Button variant="secondary" icon={SlidersHorizontal} size="sm" onClick={() => setShowFilters(!showFilters)}>
          Filters {activeCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-primary text-white text-[10px] rounded-full">{activeCount}</span>}
        </Button>
        {activeCount > 0 && <button onClick={onClearFilters} className="text-xs text-primary hover:underline">Clear all</button>}
      </div>
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex flex-wrap gap-3 p-4 bg-surface-2 border border-border rounded-xl">
              {filters.map(f => (
                <div key={f.key} className="space-y-1">
                  <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">{f.label}</label>
                  <select value={activeFilters[f.key] || 'All'} onChange={e => onFilterChange(f.key, e.target.value)}
                    className="bg-surface-3 border border-border rounded-lg px-3 py-2 text-xs text-text appearance-none focus:outline-none focus:border-primary min-w-[140px]">
                    <option value="All">All {f.label}</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
