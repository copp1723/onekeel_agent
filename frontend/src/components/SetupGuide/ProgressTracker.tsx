'use client';

import React from 'react';

interface ProgressTrackerProps {
  steps: string[];
  currentStep: number;
  completedSteps: number[];
}

export default function ProgressTracker({
  steps,
  currentStep,
  completedSteps,
}: ProgressTrackerProps) {
  const totalSteps = steps.length;
  const completedCount = completedSteps.length;
  const progressPercentage = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-medium text-neutral-700">Setup Progress</h2>
        <span className="text-sm font-medium text-neutral-500">
          {completedCount} of {totalSteps} steps completed ({progressPercentage}%)
        </span>
      </div>
      
      <div className="w-full bg-neutral-200 rounded-full h-2.5">
        <div 
          className="bg-primary-500 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = currentStep === index;
          
          return (
            <div 
              key={index}
              className={`
                px-3 py-2 rounded-md text-sm font-medium
                ${isCompleted 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : isCurrent 
                    ? 'bg-primary-100 text-primary-800 border border-primary-200' 
                    : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                }
              `}
            >
              <div className="flex items-center">
                <div 
                  className={`
                    w-5 h-5 rounded-full flex items-center justify-center mr-2
                    ${isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isCurrent 
                        ? 'bg-primary-500 text-white' 
                        : 'bg-neutral-300 text-neutral-700'
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                <span className="truncate">{step}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
