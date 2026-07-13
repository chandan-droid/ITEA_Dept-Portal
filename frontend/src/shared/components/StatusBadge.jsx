import React from 'react';

export const StatusBadge = ({ status, className = '' }) => {
  const isActive = status.toUpperCase() === 'ACTIVE' || status.toUpperCase() === 'SUCCESS';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
        isActive
          ? 'bg-green-100 text-green-800 border border-green-200'
          : 'bg-red-100 text-red-800 border border-red-200'
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
      {status}
    </span>
  );
};
