'use client';

import React, { useState } from 'react';
import Input from './Input';
import Button from './Button';
import Select from './Select';
import { useRouter } from 'next/navigation';
import { useTasks } from '@/hooks/useTasks';
import { TaskInput } from '@/lib/api';
import { useCredentials } from '@/hooks/useCredentials';
import { useToast } from './Feedback/ToastContext';

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
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState<TaskInput>({
    taskType: 'analyzeCRMData',
    taskText: intentOptions[0].value,
    platform: credentials[0]?.platform || '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      showToast('Please fill in all required fields', 'error');
      return;
    }
    
    try {
      const result = await createTask.mutateAsync(formData);
      showToast('Analysis task created successfully', 'success');
      router.push(`/results/${result.id}`);
    } catch (error) {
      console.error('Failed to create task:', error);
      showToast('Failed to create analysis task', 'error');
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
        <h2 className="text-xl font-semibold mb-4">Request Analysis</h2>
        <div className="text-center py-6">
          <svg className="mx-auto h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H9"/>
          </svg>
          <p className="mt-4 text-neutral-600">
            You need to add credentials before you can request an analysis. 
          </p>
          <Button 
            variant="outline"
            onClick={() => router.push('/#credentials')}
            className="mt-4"
          >
            Add Credentials
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="card max-w-lg mx-auto">
      <h2 className="text-xl font-semibold mb-6">Request Analysis</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
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
          className="w-full"
          isLoading={createTask.isPending}
        >
          {createTask.isPending ? 'Creating Analysis...' : 'Generate Insights'}
        </Button>
      </form>
    </div>
  );
}