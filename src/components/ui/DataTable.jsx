import { useState, useMemo, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Download, FileSpreadsheet, Printer } from 'lucide-react';
import Button from './Button';
import EmptyState from './EmptyState';

// Escapes a cell value before it's interpolated into an HTML string for the Print window - both
// the old DataTable and SelectableTable built that HTML via unescaped template-string
// interpolation of raw row values (e.g. `<td>${row[c.key]}</td>`), which is a real stored-XSS
// vector: any column showing free-text user input (a leave reason, ticket title, employee name)
// containing HTML would be parsed and could execute in the print window. Every consumer of this
// table can render arbitrary user-supplied strings, so this isn't a hypothetical.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Unified table component - previously DataTable and SelectableTable were ~95% duplicated (same
// sort/paginate/export/print logic), which had already caused one real bug (SelectableTable's
// CSV export didn't quote comma-containing values the way DataTable's did) since a fix to one
// silently never applied to the other. Pass `selectable` + `selected`/`onSelectChange` to get the
// checkbox-selection behavior that used to be SelectableTable's only differentiator; omit them
// for the plain read-only table.
export default function DataTable({ columns, data, pageSize = 10, onRowClick, actions, selectable = false, selected = [], onSelectChange }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  // Real bug, confirmed live: applying/clearing a filter (or re-navigating to a page whose data
  // reloads) changes `data` but never reset this component's own page number. Landing on a page
  // number that no longer exists in the new, smaller dataset made `.slice()` return an empty
  // array while the "N total records" header (which reads `data.length` directly, not the sliced
  // page) kept showing the correct non-zero count - exactly the "shows 2 total records but the
  // table is empty" symptom reported across Resource Allocation, and likely other filtered tables
  // using this same component. Reset to page 0 whenever the underlying dataset changes.
  useEffect(() => { setPage(0); }, [data]);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  // Defensive clamp on top of the effect above - covers the one-frame window between data
  // shrinking and the effect's reset actually re-rendering.
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paged = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const displayColumns = columns.filter(c => c.key !== 'actions');

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const allPageSelected = selectable && paged.length > 0 && paged.every(r => selected.includes(r.id));
  const toggleAll = () => {
    if (allPageSelected) onSelectChange(selected.filter(id => !paged.find(r => r.id === id)));
    else onSelectChange([...new Set([...selected, ...paged.map(r => r.id)])]);
  };
  const toggleOne = (id) => {
    onSelectChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const exportCSV = () => {
    const headers = displayColumns.map(c => c.label);
    const rows = data.map(row => displayColumns.map(c => {
      const val = row[c.key];
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val ?? '';
    }));
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const printTable = () => {
    const w = window.open('', '_blank');
    const headerHtml = displayColumns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('');
    const bodyHtml = data.map(row =>
      `<tr>${displayColumns.map(c => `<td>${escapeHtml(row[c.key])}</td>`).join('')}</tr>`
    ).join('');
    w.document.write(`<style>table{border-collapse:collapse;width:100%;font-family:sans-serif;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5;font-weight:600}</style>
    <h2 style="font-family:sans-serif;margin-bottom:12px">Vikisol HRMS Export</h2>
    <table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`);
    w.document.close();
    w.print();
  };

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs text-text-secondary">{data.length} {selectable ? 'records' : 'total records'}{selectable && selected.length > 0 && ` · ${selected.length} selected`}</span>
        <div className="flex items-center gap-1">
          {actions}
          <Button variant="ghost" size="sm" icon={Download} onClick={exportCSV} title="Export CSV">CSV</Button>
          <Button variant="ghost" size="sm" icon={FileSpreadsheet} onClick={exportCSV} title="Export Excel">Excel</Button>
          <Button variant="ghost" size="sm" icon={Printer} onClick={printTable} title="Print">Print</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr className="border-b border-border">
              {selectable && <th className="py-3 px-3 w-10"><input type="checkbox" checked={allPageSelected} onChange={toggleAll} className="rounded accent-primary" /></th>}
              {columns.map(col => (
                <th key={col.key} className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  {col.sortable !== false && col.key !== 'actions' ? (
                    <button onClick={() => toggleSort(col.key)} className="flex items-center gap-1 hover:text-text transition-colors">
                      {col.label}
                      {sortKey === col.key ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={12} className="opacity-30" />}
                    </button>
                  ) : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr key={row.id || i} onClick={() => !selectable && onRowClick?.(row)}
                className={`border-b border-border/50 hover:bg-surface-3/70 hover:shadow-sm transition-all ${i % 2 === 1 ? 'bg-surface-2/40' : ''} ${onRowClick && !selectable ? 'cursor-pointer' : ''} ${selectable && selected.includes(row.id) ? 'bg-primary/5' : ''}`}>
                {selectable && <td className="py-3 px-3"><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleOne(row.id)} className="rounded accent-primary" /></td>}
                {columns.map(col => (
                  <td key={col.key} className="py-3 px-4 text-text" onClick={selectable ? () => col.key !== 'actions' && onRowClick?.(row) : undefined}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {paged.length === 0 && <EmptyState title="No records found" description="There's nothing to show here yet." />}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-xs text-text-secondary">Page {safePage + 1} of {totalPages} ({data.length} records)</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0} className="p-1.5 rounded-lg hover:bg-surface-3 disabled:opacity-30 text-text-secondary"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i;
              else if (safePage < 3) pageNum = i;
              else if (safePage > totalPages - 4) pageNum = totalPages - 5 + i;
              else pageNum = safePage - 2 + i;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-8 h-8 rounded-lg text-xs font-medium ${safePage === pageNum ? 'bg-primary text-white' : 'hover:bg-surface-3 text-text-secondary'}`}>{pageNum + 1}</button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1} className="p-1.5 rounded-lg hover:bg-surface-3 disabled:opacity-30 text-text-secondary"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
