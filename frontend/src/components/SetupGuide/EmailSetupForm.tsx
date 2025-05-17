'use client';

import React, { useState } from 'react';
import Input from '../Input';
import Button from '../Button';
import { useForm, validationRules } from '@/hooks/useForm';
import { useToast } from '../Feedback/ToastContext';

interface EmailConfig {
  email: string;
  password: string;
  host: string;
  port: string;
  useTLS: boolean;
}

interface EmailSetupFormProps {
  onComplete: (config: EmailConfig) => void;
  onTest: (config: EmailConfig) => Promise<boolean>;
}

export default function EmailSetupForm({ onComplete, onTest }: EmailSetupFormProps) {
  const { showToast } = useToast();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const {
    values,
    errors,
    formError,
    isSubmitting,
    handleChange,
    handleSubmit,
    setFieldValue
  } = useForm<EmailConfig>({
    initialValues: {
      email: '',
      password: '',
      host: '',
      port: '993',
      useTLS: true,
    },
    validationRules: {
      email: [
        validationRules.required('Email is required'),
        validationRules.email('Please enter a valid email address'),
      ],
      password: [
        validationRules.required('Password is required'),
      ],
      host: [
        validationRules.required('IMAP host is required'),
      ],
      port: [
        validationRules.required('Port is required'),
        validationRules.pattern(/^\d+$/, 'Port must be a number'),
      ],
    },
    onSubmit: async (values) => {
      try {
        onComplete(values);
      } catch (error) {
        showToast('Failed to save email configuration', 'error');
        throw new Error('Failed to save email configuration');
      }
    },
  });

  // Helper function to auto-fill host based on email domain
  const autoDetectHost = () => {
    const email = values.email;
    if (!email.includes('@')) return;
    
    const domain = email.split('@')[1].toLowerCase();
    
    if (domain === 'gmail.com') {
      setFieldValue('host', 'imap.gmail.com');
      setFieldValue('port', '993');
      setFieldValue('useTLS', true);
    } else if (domain.includes('outlook.com') || domain.includes('hotmail.com') || domain.includes('live.com')) {
      setFieldValue('host', 'outlook.office365.com');
      setFieldValue('port', '993');
      setFieldValue('useTLS', true);
    } else if (domain.includes('yahoo.com')) {
      setFieldValue('host', 'imap.mail.yahoo.com');
      setFieldValue('port', '993');
      setFieldValue('useTLS', true);
    }
  };

  const handleTestConnection = async () => {
    // Validate form first
    const hasErrors = Object.values(errors).some(error => error);
    const emptyFields = Object.entries(values).some(([key, value]) => 
      key !== 'useTLS' && !value
    );
    
    if (hasErrors || emptyFields) {
      showToast('Please fill in all required fields correctly', 'error');
      return;
    }
    
    setIsTestingConnection(true);
    setTestResult(null);
    
    try {
      const success = await onTest(values);
      setTestResult(success ? 'success' : 'error');
      showToast(
        success ? 'Connection successful!' : 'Connection failed. Please check your settings.',
        success ? 'success' : 'error'
      );
    } catch (error) {
      setTestResult('error');
      showToast('Connection test failed', 'error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Detect common email providers
  const handleEmailBlur = () => {
    autoDetectHost();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
          {formError}
        </div>
      )}
      
      <Input
        label="Email Address"
        name="email"
        type="email"
        value={values.email}
        onChange={handleChange}
        onBlur={handleEmailBlur}
        error={errors.email}
        required
        placeholder="your.email@example.com"
      />
      
      <Input
        label="Password or App Password"
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
        error={errors.password}
        required
        placeholder="••••••••••••••••"
        helpText="For Gmail or other services with 2FA, use an app password"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="IMAP Host"
          name="host"
          value={values.host}
          onChange={handleChange}
          error={errors.host}
          required
          placeholder="imap.example.com"
        />
        
        <Input
          label="IMAP Port"
          name="port"
          value={values.port}
          onChange={handleChange}
          error={errors.port}
          required
          placeholder="993"
        />
      </div>
      
      <div className="flex items-center">
        <input
          id="useTLS"
          name="useTLS"
          type="checkbox"
          checked={values.useTLS}
          onChange={(e) => setFieldValue('useTLS', e.target.checked)}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label htmlFor="useTLS" className="ml-2 block text-sm text-gray-700">
          Use TLS (recommended)
        </label>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:justify-between space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleTestConnection}
          isLoading={isTestingConnection}
          loadingText="Testing..."
          className={`
            ${testResult === 'success' ? 'border-green-500 text-green-700' : ''}
            ${testResult === 'error' ? 'border-red-500 text-red-700' : ''}
          `}
        >
          {testResult === 'success' && (
            <svg className="w-5 h-5 mr-1.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          )}
          {testResult === 'error' && (
            <svg className="w-5 h-5 mr-1.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          )}
          Test Connection
        </Button>
        
        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingText="Saving..."
          disabled={isTestingConnection}
        >
          Save Configuration
        </Button>
      </div>
    </form>
  );
}
