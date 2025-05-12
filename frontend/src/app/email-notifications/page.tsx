'use client';

import React from 'react';
import EmailNotificationForm from '@/components/EmailNotificationForm';
import Link from 'next/link';

export default function EmailNotificationsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary-600">Email Notifications</h1>
          <Link 
            href="/" 
            className="text-primary-500 hover:text-primary-700 font-medium flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to Dashboard
          </Link>
        </div>
        <p className="text-neutral-600 mt-2">Configure and test email notifications for workflow updates</p>
      </header>
      
      <div className="grid grid-cols-1 gap-6">
        <EmailNotificationForm />
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Email Notification Settings</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Global Settings</h3>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center">
                <input 
                  id="send-on-completion" 
                  type="checkbox" 
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  defaultChecked 
                />
                <label htmlFor="send-on-completion" className="ml-2 block text-sm text-gray-700">
                  Send notifications on successful workflow completion
                </label>
              </div>
              <div className="flex items-center">
                <input 
                  id="send-on-failure" 
                  type="checkbox" 
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  defaultChecked 
                />
                <label htmlFor="send-on-failure" className="ml-2 block text-sm text-gray-700">
                  Send notifications on workflow failure
                </label>
              </div>
            </div>
          </div>
          
          <button 
            className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Save Settings
          </button>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Email Activity</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex justify-between">
              <span className="font-medium">Email</span>
              <span className="font-medium">Status</span>
            </div>
          </div>
          
          <div className="divide-y">
            <div className="p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">user@example.com</p>
                <p className="text-sm text-gray-500">Workflow #12345 - Completion</p>
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                Delivered
              </span>
            </div>
            
            <div className="p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">admin@company.com</p>
                <p className="text-sm text-gray-500">Workflow #12344 - Failure</p>
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                Failed
              </span>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 border-t">
            <Link
              href="/email-logs"
              className="text-primary-500 hover:text-primary-700 font-medium text-sm flex items-center justify-center"
            >
              View All Logs
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}