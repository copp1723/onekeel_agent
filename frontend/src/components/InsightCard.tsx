'use client';

import React from 'react';
import { Task } from '@/lib/api';

interface InsightCardProps {
  task: Task;
}

export default function InsightCard({ task }: InsightCardProps) {
  // Since insights are optional, we need to handle cases when no result is available
  if (!task.result) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-neutral-900">
          {task.taskType}: {task.status}
        </h2>
        <p className="text-neutral-500 mt-2">
          {task.status === 'processing' ? 'Analysis in progress...' : 'No results available'}
        </p>
        {task.error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {task.error}
          </div>
        )}
      </div>
    );
  }

  const score = task.result.score ?? 0;
  let scoreColor = 'text-red-500';
  if (score >= 8) {
    scoreColor = 'text-green-500';
  } else if (score >= 5) {
    scoreColor = 'text-yellow-500';
  }

  return (
    <div className="card">
      <div className="flex justify-between items-start">
        <h2 className="text-xl font-semibold text-neutral-900">
          {task.result.title || `Analysis for ${task.taskType}`}
        </h2>
        
        {task.result.score !== undefined && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${scoreColor} bg-opacity-10`}>
            Quality: {task.result.score}/10
          </span>
        )}
      </div>
      
      {task.result.description && (
        <p className="text-neutral-700 mt-3 mb-6">
          {task.result.description}
        </p>
      )}
      
      {task.result.insights && task.result.insights.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-neutral-900 mb-3">Key Insights</h3>
          <ul className="list-disc list-inside space-y-2 text-neutral-700">
            {task.result.insights.map((insight, idx) => (
              <li key={idx}>{insight}</li>
            ))}
          </ul>
        </div>
      )}
      
      {task.result.actionItems && task.result.actionItems.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-neutral-900 mb-3">Recommended Actions</h3>
          <ul className="list-disc list-inside space-y-2 text-neutral-700">
            {task.result.actionItems.map((action, idx) => (
              <li key={idx}>{action}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="mt-6 text-sm text-neutral-500">
        Completed on: {new Date(task.completedAt || task.createdAt).toLocaleString()}
      </div>
    </div>
  );
}