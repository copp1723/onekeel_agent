import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Credential, CredentialInput, credentialsApi } from '@/lib/api';

export function useCredentials() {
  const queryClient = useQueryClient();
  
  const { data: credentials = [], isLoading, error } = useQuery({
    queryKey: ['credentials'],
    queryFn: credentialsApi.getAll,
  });
  
  const createCredential = useMutation({
    mutationFn: (newCredential: CredentialInput) => credentialsApi.create(newCredential),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
  
  const updateCredential = useMutation({
    mutationFn: ({ id, credential }: { id: string; credential: Partial<CredentialInput> }) => 
      credentialsApi.update(id, credential),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
  
  const deleteCredential = useMutation({
    mutationFn: (id: string) => credentialsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
  
  return {
    credentials,
    isLoading,
    error,
    createCredential,
    updateCredential,
    deleteCredential,
  };
}