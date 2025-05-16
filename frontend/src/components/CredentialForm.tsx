'use client';

import React from 'react';
import Input from './Input';
import Button from './Button';
import Select from './Select';
import { CredentialInput } from '@/lib/api';
import { useCredentials } from '@/hooks/useCredentials';
import { useForm, validationRules } from '@/hooks/useForm';
import FormWrapper from './Form/FormWrapper';

const platforms = [
  { value: 'VinSolutions', label: 'VinSolutions' },
  { value: 'VAUTO', label: 'VAUTO' },
  { value: 'CDK', label: 'CDK' },
  { value: 'Reynolds', label: 'Reynolds' },
];

export default function CredentialForm() {
  const { createCredential } = useCredentials();

  const {
    values,
    errors,
    formError,
    isSubmitting,
    handleChange,
    handleSubmit,
    resetForm
  } = useForm<CredentialInput>({
    initialValues: {
      platform: platforms[0].value,
      username: '',
      password: '',
    },
    validationRules: {
      platform: [validationRules.required('Platform is required')],
      username: [validationRules.required('Username is required')],
      password: [validationRules.required('Password is required')],
    },
    onSubmit: async (values) => {
      await createCredential.mutateAsync(values);
      resetForm();
    },
  });

  return (
    <FormWrapper
      title="Add Credentials"
      onSubmit={handleSubmit}
      error={formError}
      isSubmitting={isSubmitting}
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

      <Input
        label="Username"
        name="username"
        type="text"
        placeholder="Enter your username"
        value={values.username}
        onChange={handleChange}
        error={errors.username}
        required
      />

      <Input
        label="Password"
        name="password"
        type="password"
        placeholder="Enter your password"
        value={values.password}
        onChange={handleChange}
        error={errors.password}
        required
      />

      <Button
        type="submit"
        className="w-full mt-2"
        isLoading={isSubmitting || createCredential.isPending}
      >
        Save Credentials
      </Button>
    </FormWrapper>
  );
}