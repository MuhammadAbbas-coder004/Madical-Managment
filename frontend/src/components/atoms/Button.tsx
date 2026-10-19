import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  children: React.ReactNode;
}

const ButtonSpinner: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <svg
    className={`h-4 w-4 shrink-0 animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3.5"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);

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
      className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading && <ButtonSpinner className="mr-2" />}
      {children}
    </button>
  );
};
