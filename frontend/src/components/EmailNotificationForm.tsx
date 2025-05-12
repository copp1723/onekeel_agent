'use client';

import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';

interface EmailNotificationFormProps {
  defaultEmail?: string;
}

export default function EmailNotificationForm({ defaultEmail = '' }: EmailNotificationFormProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'notifications' | 'execution'>('notifications');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setError('');
    
    // Validate email
    if (!email) {
      setError('Please enter an email address');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Set loading state
    setStatus('sending');
    
    try {
      // Send test email API call
      const response = await fetch('/api/emails/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipientEmail: email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatus('sent');
        // Reset to idle after 3 seconds
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        setError(data.message || 'Failed to send test email');
      }
    } catch (err) {
      setStatus('error');
      setError('An error occurred while sending the test email');
      console.error('Error sending test email:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-primary-600">
          Workflow Email Notification System
        </h2>
        
        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-selected={activeTab === 'notifications'}
          >
            Email Notifications
          </button>
          <button
            onClick={() => setActiveTab('execution')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'execution'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-selected={activeTab === 'execution'}
          >
            Task Execution
          </button>
        </div>
        
        {activeTab === 'notifications' && (
          <div className="max-w-md mx-auto">
            {status === 'sent' && (
              <div className="bg-green-50 text-green-800 p-3 rounded mb-4">
                Test email sent successfully!
              </div>
            )}
            
            {status === 'error' && (
              <div className="bg-red-50 text-red-800 p-3 rounded mb-4">
                {error || 'Failed to send test email'}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Email:
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className={error ? 'border-red-500' : ''}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'email-error' : undefined}
                />
                {error && (
                  <p id="email-error" className="mt-1 text-sm text-red-600">
                    {error}
                  </p>
                )}
              </div>
              
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={status === 'sending'}
              >
                {status === 'sending' ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </div>
                ) : 'Send Test Email'}
              </Button>
            </form>
            
            <div className="mt-6 pt-5 border-t border-gray-200">
              <a 
                href="/email-logs" 
                className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
              >
                View Email Logs
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </a>
            </div>
          </div>
        )}
        
        {activeTab === 'execution' && (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500 mb-4">No active tasks available</p>
            <Button
              variant="outline"
              onClick={() => {
                // Navigate to task creation or show a modal
                window.location.href = '/tasks/new';
              }}
            >
              Go run a workflow →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}