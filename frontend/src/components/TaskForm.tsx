'use client';

import React, { useState } from 'react';
import Input from './Input';
import Button from './Button';
import Select from './Select';
import { useRouter } from 'next/navigation';
import { useTasks } from '@/hooks/useTasks';
import { TaskInput } from '@/lib/api';
import { useCredentials } from '@/hooks/useCredentials';

const intentOptions = [
  { value: 'inventoryAging', label: 'Inventory Aging' },
  { value: 'salesTrends', label: 'Sales Trends' },
  { value: 'customerAnalysis', label: 'Customer Analysis' },
  { value: 'leadPerformance', label: 'Lead Performance' },
];

export default function TaskForm() {
  const router = useRouter();
  const { createTask } = useTasks();
  const { credentials } = useCredentials();
  
  const [formData, setFormData] = useState<TaskInput>({
    taskType: 'analyzeCRMData',
    taskText: intentOptions[0].value,
    platform: credentials[0]?.platform || '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when field is updated
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.taskText) {
      newErrors.taskText = 'Intent is required';
    }
    
    if (!formData.platform) {
      newErrors.platform = 'Platform is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    try {
      const result = await createTask.mutateAsync(formData);
      // Navigate to results page with task ID
      router.push(`/results/${result.id}`);
    } catch (error) {
      console.error('Failed to create task:', error);
      setErrors({ form: 'Failed to create task. Please try again.' });
    }
  };

  // Get platforms from credentials
  const uniquePlatforms = Array.from(new Set(credentials.map(cred => cred.platform)));
  const platforms = uniquePlatforms.map(platform => ({
    value: platform,
    label: platform,
  }));

  if (platforms.length === 0) {
    return (
      <div className="card">
        <h2>Request Analysis</h2>
        <p className="text-neutral-500 mb-4">
          You need to add credentials before you can request an analysis. 
          Please add your credentials using the form above.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Request Analysis</h2>
      
      <form onSubmit={handleSubmit}>
        {errors.form && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errors.form}
          </div>
        )}
        
        <Select
          label="Platform"
          name="platform"
          options={platforms}
          value={formData.platform}
          onChange={handleChange}
          error={errors.platform}
          required
        />
        
        <Select
          label="What insights do you need?"
          name="taskText"
          options={intentOptions}
          value={formData.taskText}
          onChange={handleChange}
          error={errors.taskText}
          required
        />
        
        <Button 
          type="submit" 
          className="w-full mt-2"
          isLoading={createTask.isPending}
        >
          Generate Insights
        </Button>
      </form>
    </div>
  );
}