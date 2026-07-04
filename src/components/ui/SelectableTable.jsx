import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Download, FileSpreadsheet, Printer } from 'lucide-react';
import Button from './Button';
import EmptyState from './EmptyState';

export default function SelectableTable({ columns, data, pageSize = 10, onRowClick, selected = [], onSelectChange, actions }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1; if (bv == null) return -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const allPageSelected = paged.length > 0 && paged.every(r => selected.includes(r.id));
  const toggleAll = () => {
    if (allPageSelected) onSelectChange(selected.filter(id => !paged.find(r => r.id === id)));
    else onSelectChange([...new Set([...selected, ...paged.map(r => r.id)])]);
  };
  const toggleOne = (id) => {
    onSelectChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const exportCSV = () => {
    const headers = columns.filter(c => c.key !== 'actions').map(c => c.label);
    const rows = data.map(row => columns.filter(c => c.key !== 'actions').map(c => {
      const val = row[c.key];
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val ?? '';
    }));
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'export.csv'; a.click();
  };

  const printTable = () => {
    const w = window.open('', '_blank');
    w.document.write(`<style>table{border-collapse:collapse;width:100%;font-family:sans-serif;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style>
    <h2 style="font-family:sans-serif">Vikisol HRMS</h2>
    <table><thead><tr>${columns.filter(c=>c.key!=='actions').map(c=>`<th>${c.label}</th>`).join('')}</tr></thead>
    <tbody>${data.map(row=>`<tr>${columns.filter(c=>c.key!=='actions').map(c=>`<td>${row[c.key]??''}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    w.document.close(); w.print();
  };

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs text-text-secondary">{data.length} records{selected.length > 0 && ` · ${selected.length} selected`}</span>
        <div className="flex items-center gap-1">
          {actions}
          <Button variant="ghost" size="sm" icon={Download} onClick={exportCSV}>CSV</Button>
          <Button variant="ghost" size="sm" icon={FileSpreadsheet} onClick={exportCSV}>Excel</Button>
          <Button variant="ghost" size="sm" icon={Printer} onClick={printTable}>Print</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="py-3 px-3 w-10"><input type="checkbox" checked={allPageSelected} onChange={toggleAll} className="rounded accent-primary" /></th>
            {columns.map(col => (
              <th key={col.key} className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {col.sortable !== false && col.key !== 'actions' ? (
                  <button onClick={() => toggleSort(col.key)} className="flex items-center gap-1 hover:text-text">
                    {col.label}
                    {sortKey === col.key ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={12} className="opacity-30" />}
                  </button>
                ) : col.label}
              </th>
            ))}
          </tr></thead>
          <tbody>
            {paged.map((row, i) => (
              <tr key={row.id || i} className={`border-b border-border/50 hover:bg-surface-3/50 transition-colors ${selected.includes(row.id) ? 'bg-primary/5' : ''}`}>
                <td className="py-3 px-3"><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleOne(row.id)} className="rounded accent-primary" /></td>
                {columns.map(col => (
                  <td key={col.key} className="py-3 px-4 text-text" onClick={() => col.key !== 'actions' && onRowClick?.(row)}>
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
          <span className="text-xs text-text-secondary">Page {page + 1} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-lg hover:bg-surface-3 disabled:opacity-30 text-text-secondary"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pn = totalPages <= 5 ? i : page < 3 ? i : page > totalPages - 4 ? totalPages - 5 + i : page - 2 + i;
              return <button key={pn} onClick={() => setPage(pn)} className={`w-8 h-8 rounded-lg text-xs font-medium ${page === pn ? 'bg-primary text-white' : 'hover:bg-surface-3 text-text-secondary'}`}>{pn + 1}</button>;
            })}
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg hover:bg-surface-3 disabled:opacity-30 text-text-secondary"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
