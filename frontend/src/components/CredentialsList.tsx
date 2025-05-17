'use client';

import React from 'react';
import Button from './Button';
import { useCredentials } from '@/hooks/useCredentials';
import { useToast } from './Feedback/ToastContext';
import Skeleton from './Feedback/Skeleton';

export default function CredentialsList() {
  const { credentials, isLoading, deleteCredential } = useCredentials();
  const { showToast } = useToast();

  if (isLoading) {
    return (
      <div className="card">
        <h2>Your Credentials</h2>
        <div className="space-y-4">
          <Skeleton className="h-12" count={3} />
        </div>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="card">
        <h2>Your Credentials</h2>
        <div className="text-center py-6">
          <svg className="mx-auto h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
          </svg>
          <p className="mt-4 text-neutral-600">
            No credentials found. Add your first credential using the form.
          </p>
        </div>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this credential?')) {
      try {
        await deleteCredential.mutateAsync(id);
        showToast('Credential deleted successfully', 'success');
      } catch (error) {
        console.error('Failed to delete credential:', error);
        showToast('Failed to delete credential', 'error');
      }
    }
  };

  return (
    <div className="card">
      <h2>Your Credentials</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Platform
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Username
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {credentials.map((credential) => (
              <tr key={credential.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="font-medium text-neutral-900">
                    {credential.platform}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="text-neutral-900">
                    {credential.username}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(credential.id)}
                    isLoading={deleteCredential.isPending && deleteCredential.variables === credential.id}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}