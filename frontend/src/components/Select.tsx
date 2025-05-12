'use client';

import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Option[];
  id?: string;
}

export default function Select({ 
  label, 
  error, 
  options, 
  className = '', 
  id,
  ...props 
}: SelectProps) {
  const selectId = id || props.name || Math.random().toString(36).substring(2, 9);
  
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={selectId} className="label">
          {label}
        </label>
      )}
      <select 
        id={selectId}
        className={`select ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props} 
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}