import React from 'react';

export function Table({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found.',
  isLoading = false
}) {
  return (
    <div className="w-full overflow-x-auto border border-gray-200/60 rounded-large bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={`md-table-header ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-[3px] border-primary border-t-transparent animate-spin rounded-full" />
                  <span className="text-sm text-gray-500">Loading details...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={keyExtractor(row)} className="hover:bg-gray-50/50 transition-colors duration-150">
                {columns.map((col, cIdx) => (
                  <td key={cIdx} className={`md-table-cell ${col.className || ''}`}>
                    {typeof col.accessor === 'function'
                      ? col.accessor(row)
                      : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
