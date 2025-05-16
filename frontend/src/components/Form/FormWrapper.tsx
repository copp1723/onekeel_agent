'use client';

import React, { ReactNode } from 'react';

interface FormWrapperProps {
  title?: string;
  description?: string;
  onSubmit: (e: React.FormEvent) => void;
  error?: string | null;
  children: ReactNode;
  className?: string;
  isSubmitting?: boolean;
}

/**
 * A wrapper component for forms with consistent styling and error handling
 */
export default function FormWrapper({
  title,
  description,
  onSubmit,
  error,
  children,
  className = '',
  isSubmitting = false,
}: FormWrapperProps) {
  return (
    <div className={`card ${className}`}>
      {title && <h2>{title}</h2>}
      {description && <p className="text-neutral-600 mb-4">{description}</p>}
      
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
            {error}
          </div>
        )}
        
        {/* Disable form while submitting */}
        <fieldset disabled={isSubmitting} className="space-y-4">
          {children}
        </fieldset>
      </form>
    </div>
  );
}
