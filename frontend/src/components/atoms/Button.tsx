import React from 'react';
import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  disabled,
  children,
  className = '',
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-primary hover:bg-primary-hover text-surface',
    secondary: 'bg-surface hover:bg-background text-textPrimary border border-textPrimary/10',
    danger: 'bg-danger hover:opacity-90 text-surface',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading && <Spinner size="sm" className="mr-2" />}
      {children}
    </button>
  );
};
