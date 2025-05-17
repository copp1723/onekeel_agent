'use client';

import React from 'react';
import Button from './Button';
import Select from './Select';
import { useRouter } from 'next/navigation';
import { useTasks } from '@/hooks/useTasks';
import { TaskInput } from '@/lib/api';
import { useCredentials } from '@/hooks/useCredentials';
import { useToast } from './Feedback/ToastContext';
import { useForm, validationRules } from '@/hooks/useForm';
import FormWrapper from './Form/FormWrapper';
import Card from './UI/Card';

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

  // Get platforms from credentials
  const uniquePlatforms = Array.from(new Set(credentials.map(cred => cred.platform)));
  const platforms = uniquePlatforms.map(platform => ({
    value: platform,
    label: platform,
  }));

  const {
    values,
    errors,
    formError,
    isSubmitting,
    handleChange,
    handleSubmit
  } = useForm<TaskInput>({
    initialValues: {
      taskType: 'analyzeCRMData',
      taskText: intentOptions[0].value,
      platform: credentials[0]?.platform || '',
    },
    validationRules: {
      taskText: [validationRules.required('Intent is required')],
      platform: [validationRules.required('Platform is required')],
    },
    onSubmit: async (values) => {
      try {
        const result = await createTask.mutateAsync(values);
        showToast('Analysis task created successfully', 'success');
        router.push(`/results/${result.id}`);
      } catch (error) {
        showToast('Failed to create analysis task', 'error');
        throw new Error('Failed to create task. Please try again.');
      }
    },
  });

  if (platforms.length === 0) {
    return (
      <Card title="Request Analysis">
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
      </Card>
    );
  }

  return (
    <FormWrapper
      title="Request Analysis"
      onSubmit={handleSubmit}
      error={formError}
      isSubmitting={isSubmitting}
      className="max-w-lg mx-auto"
    >
      <Select
        label="Platform"
        name="platform"
        options={platforms}
        value={values.platform}
        onChange={handleChange}
        error={errors.platform}
        required
      />

      <Select
        label="What insights do you need?"
        name="taskText"
        options={intentOptions}
        value={values.taskText}
        onChange={handleChange}
        error={errors.taskText}
        required
      />

      <Button
        type="submit"
        className="w-full"
        isLoading={isSubmitting || createTask.isPending}
      >
        {isSubmitting || createTask.isPending ? 'Creating Analysis...' : 'Generate Insights'}
      </Button>
    </FormWrapper>
  );
}