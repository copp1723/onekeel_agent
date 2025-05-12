'use client';

import React, { useState } from 'react';
import Input from './Input';
import Button from './Button';
import Select from './Select';
import { CredentialInput } from '@/lib/api';
import { useCredentials } from '@/hooks/useCredentials';

const platforms = [
  { value: 'VinSolutions', label: 'VinSolutions' },
  { value: 'VAUTO', label: 'VAUTO' },
  { value: 'CDK', label: 'CDK' },
  { value: 'Reynolds', label: 'Reynolds' },
];

export default function CredentialForm() {
  const { createCredential } = useCredentials();
  const [formData, setFormData] = useState<CredentialInput>({
    platform: platforms[0].value,
    username: '',
    password: '',
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
    
    if (!formData.platform) {
      newErrors.platform = 'Platform is required';
    }
    
    if (!formData.username) {
      newErrors.username = 'Username is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
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
      await createCredential.mutateAsync(formData);
      // Reset form on success
      setFormData({
        platform: platforms[0].value,
        username: '',
        password: '',
      });
    } catch (error) {
      console.error('Failed to save credential:', error);
      setErrors({ form: 'Failed to save credential. Please try again.' });
    }
  };

  return (
    <div className="card">
      <h2>Add Credentials</h2>
      
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
        
        <Input
          label="Username"
          name="username"
          type="text"
          placeholder="Enter your username"
          value={formData.username}
          onChange={handleChange}
          error={errors.username}
          required
        />
        
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          required
        />
        
        <Button 
          type="submit" 
          className="w-full mt-2"
          isLoading={createCredential.isPending}
        >
          Save Credentials
        </Button>
      </form>
    </div>
  );
}