'use client';

import React, { useId } from 'react';
import { useKeyboard } from '@/hooks/useKeyboard';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  options: Option[];
  error?: string;
  helpText?: string;
}

export default function Select({
  label,
  options,
  error,
  helpText,
  className = '',
  required,
  disabled,
  onChange,
  ...props
}: SelectProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  
  // Handle keyboard navigation
  useKeyboard('ArrowDown', (e) => {
    if (document.activeElement === e.target) {
      e.preventDefault();
      const select = e.target as HTMLSelectElement;
      if (select.selectedIndex < select.options.length - 1) {
        select.selectedIndex++;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  useKeyboard('ArrowUp', (e) => {
    if (document.activeElement === e.target) {
      e.preventDefault();
      const select = e.target as HTMLSelectElement;
      if (select.selectedIndex > 0) {
        select.selectedIndex--;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-neutral-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      
      <select
        id={id}
        className={`
          px-3 py-2 w-full rounded-md border
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
        onChange={onChange}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
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