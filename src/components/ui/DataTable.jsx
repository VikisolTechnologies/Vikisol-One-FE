import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Download, FileSpreadsheet, Printer } from 'lucide-react';
import Button from './Button';
import EmptyState from './EmptyState';

export default function DataTable({ columns, data, pageSize = 10, onRowClick, actions }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

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
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const exportCSV = () => {
    const headers = columns.filter(c => c.key !== 'actions').map(c => c.label);
    const rows = data.map(row => columns.filter(c => c.key !== 'actions').map(c => {
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
    const printContent = document.createElement('div');
    printContent.innerHTML = `<style>table{border-collapse:collapse;width:100%;font-family:sans-serif;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5;font-weight:600}</style>
    <h2 style="font-family:sans-serif;margin-bottom:12px">Vikisol HRMS Export</h2>
    <table><thead><tr>${columns.filter(c=>c.key!=='actions').map(c=>`<th>${c.label}</th>`).join('')}</tr></thead>
    <tbody>${data.map(row=>`<tr>${columns.filter(c=>c.key!=='actions').map(c=>`<td>${row[c.key]??''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const w = window.open('', '_blank');
    w.document.write(printContent.innerHTML);
    w.document.close();
    w.print();
  };

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs text-text-secondary">{data.length} total records</span>
        <div className="flex items-center gap-1">
          {actions}
          <Button variant="ghost" size="sm" icon={Download} onClick={exportCSV} title="Export CSV">CSV</Button>
          <Button variant="ghost" size="sm" icon={FileSpreadsheet} onClick={exportCSV} title="Export Excel">Excel</Button>
          <Button variant="ghost" size="sm" icon={Printer} onClick={printTable} title="Print">Print</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
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
              <tr key={row.id || i} onClick={() => onRowClick?.(row)} className={`border-b border-border/50 hover:bg-surface-3/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}>
                {columns.map(col => (
                  <td key={col.key} className="py-3 px-4 text-text">
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
          <span className="text-xs text-text-secondary">Page {page + 1} of {totalPages} ({data.length} records)</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-lg hover:bg-surface-3 disabled:opacity-30 text-text-secondary"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i;
              else if (page < 3) pageNum = i;
              else if (page > totalPages - 4) pageNum = totalPages - 5 + i;
              else pageNum = page - 2 + i;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-8 h-8 rounded-lg text-xs font-medium ${page === pageNum ? 'bg-primary text-white' : 'hover:bg-surface-3 text-text-secondary'}`}>{pageNum + 1}</button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg hover:bg-surface-3 disabled:opacity-30 text-text-secondary"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
