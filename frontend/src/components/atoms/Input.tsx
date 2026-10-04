import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={`w-full px-3 py-2 text-sm bg-surface border rounded-lg text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:ring-2 transition-colors ${
            error
              ? 'border-danger focus:ring-danger/20'
              : 'border-border focus:border-primary focus:ring-primary/20'
          } disabled:bg-background disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
