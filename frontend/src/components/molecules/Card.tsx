import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
}) => {
  return (
    <div className={`gsap-card bg-surface border border-textPrimary/10 rounded-xl shadow-sm p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-textPrimary">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-textSecondary mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
