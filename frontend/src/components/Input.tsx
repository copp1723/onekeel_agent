'use client';

import React, { useId } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string;
  helpText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  helpText,
  className = '',
  required,
  disabled,
  leftIcon,
  rightIcon,
  type = 'text',
  ...props
}: InputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-neutral-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-neutral-500">{leftIcon}</span>
          </div>
        )}
        
        <input
          id={id}
          type={type}
          className={`
            w-full rounded-md
            ${leftIcon ? 'pl-10' : 'pl-3'}
            ${rightIcon ? 'pr-10' : 'pr-3'}
            py-2 border
            ${error ? 'border-red-300' : 'border-neutral-300'}
            ${disabled ? 'bg-neutral-50 text-neutral-500' : 'bg-white'}
            focus:outline-none focus:ring-2
            ${error ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-primary-500 focus:border-primary-500'}
            transition-colors
            ${className}
          `}
          aria-invalid={!!error}
          aria-describedby={`${error ? errorId : ''} ${helpText ? descriptionId : ''}`}
          required={required}
          disabled={disabled}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-neutral-500">{rightIcon}</span>
          </div>
        )}
      </div>
      
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      
      {helpText && (
        <p id={descriptionId} className="mt-1 text-sm text-neutral-500">
          {helpText}
        </p>
      )}
    </div>
  );
}