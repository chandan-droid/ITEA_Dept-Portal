import React from 'react';

export const LoadingSpinner = ({
  size = 'md',
  color = 'border-primary',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-t-transparent ${color} ${sizeClasses[size]}`}
        role="status"
        aria-label="loading"
      />
    </div>
  );
};
