import React from 'react';

export const Card = ({
  title,
  subtitle,
  actions,
  children,
  className = '',
}) => {
  return (
    <div className={`md-card ${className}`}>
      {(title || subtitle || actions) && (
        <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
          <div>
            {title && <h3 className="text-lg font-semibold text-secondary-dark">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
