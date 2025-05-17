'use client';

import React from 'react';
import { Upload } from '@/components/Upload';

export default function UploadTestPage() {
  const handleUploadSuccess = (uploadId: string, fileName: string) => {
    console.log('Upload successful:', { uploadId, fileName });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary-600">Upload Test Page</h1>
        <p className="text-neutral-600 mt-2">Test the Upload component functionality</p>
      </header>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <Upload onUploadSuccess={handleUploadSuccess} />
      </div>
    </div>
  );
}
