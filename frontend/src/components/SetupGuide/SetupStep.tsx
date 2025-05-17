'use client';

import React, { ReactNode } from 'react';

interface SetupStepProps {
  title: string;
  description?: string;
  children: ReactNode;
  isActive: boolean;
  isCompleted: boolean;
  stepNumber: number;
  onActivate?: () => void;
}

export default function SetupStep({
  title,
  description,
  children,
  isActive,
  isCompleted,
  stepNumber,
  onActivate,
}: SetupStepProps) {
  return (
    <div 
      className={`border rounded-lg mb-4 transition-all ${
        isActive 
          ? 'border-primary-500 shadow-md' 
          : isCompleted 
            ? 'border-green-500 bg-green-50' 
            : 'border-neutral-200'
      }`}
    >
      <div 
        className={`p-4 flex items-center cursor-pointer ${
          isActive ? 'bg-primary-50' : isCompleted ? 'bg-green-50' : 'bg-white'
        }`}
        onClick={onActivate}
      >
        <div 
          className={`flex items-center justify-center w-8 h-8 rounded-full mr-3 ${
            isCompleted 
              ? 'bg-green-500 text-white' 
              : isActive 
                ? 'bg-primary-500 text-white' 
                : 'bg-neutral-200 text-neutral-700'
          }`}
        >
          {isCompleted ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          ) : (
            <span>{stepNumber}</span>
          )}
        </div>
        <div>
          <h3 className={`font-medium ${isActive ? 'text-primary-700' : isCompleted ? 'text-green-700' : 'text-neutral-700'}`}>
            {title}
          </h3>
          {description && <p className="text-sm text-neutral-500 mt-1">{description}</p>}
        </div>
        <div className="ml-auto">
          {isActive ? (
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          )}
        </div>
      </div>
      
      {isActive && (
        <div className="p-4 border-t border-neutral-200 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}
