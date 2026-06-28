export default function Table({ columns, data, onRowClick }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map(col => (
              <th key={col.key} className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
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
      {data.length === 0 && <p className="text-center py-8 text-text-secondary text-sm">No data available</p>}
    </div>
  );
}
