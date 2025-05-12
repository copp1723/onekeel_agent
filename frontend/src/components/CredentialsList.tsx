'use client';

import React from 'react';
import Button from './Button';
import { useCredentials } from '@/hooks/useCredentials';

export default function CredentialsList() {
  const { credentials, isLoading, deleteCredential } = useCredentials();

  if (isLoading) {
    return (
      <div className="card">
        <h2>Your Credentials</h2>
        <div className="flex items-center justify-center p-4">
          <svg className="animate-spin h-5 w-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="card">
        <h2>Your Credentials</h2>
        <p className="text-neutral-500">No credentials found. Add your first credential using the form.</p>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this credential?')) {
      try {
        await deleteCredential.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete credential:', error);
        alert('Failed to delete credential. Please try again.');
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
              <tr key={credential.id}>
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