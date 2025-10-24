import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'w-full px-4 py-2 bg-input border rounded-md transition-all duration-200',
          'focus-ring hover:border-primary/50',
          error ? 'border-red-500 focus:ring-red-500' : 'border-border',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500 animate-in fade-in duration-200">{error}</p>
      )}
    </div>
  );
}
