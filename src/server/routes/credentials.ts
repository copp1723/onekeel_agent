/**
 * Credential management routes
 * Handles CRUD operations for user credentials with authentication
 */

import { Router } from 'express';
import { isAuthenticated } from '../replitAuth.js';
import {
  addCredential,
  getCredentials,
  getCredentialById,
  updateCredential,
  deleteCredential
} from '../../services/credentialVault.js';
import { type CredentialData } from '../../shared/schema.js';
import { routeHandler, AuthenticatedRequest } from '../../utils/routeHandler.js';

const router = Router();

// All routes require authentication
router.use(isAuthenticated);

/**
 * Get all credentials for the authenticated user
 * Optional platform filter
 */
router.get('/', routeHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - User ID not found' });
  }

  const platform = req.query.platform as string | undefined;

  const results = await getCredentials(userId, platform);

  // Map results to safe response objects (don't send IVs to client)
  const response = results.map(({ credential, data }) => ({
    id: credential.id,
    platform: credential.platform,
    label: credential.label,
    created: credential.createdAt,
    updated: credential.updatedAt,
    hasRefreshToken: !!credential.refreshToken,
    data
  }));

  return res.json(response);
}));

/**
 * Get a specific credential by ID
 */
router.get('/:id', routeHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - User ID not found' });
  }

  const credentialId = req.params.id;

  try {
    const { credential, data } = await getCredentialById(credentialId, userId);

    return res.json({
      id: credential.id,
      platform: credential.platform,
      label: credential.label,
      created: credential.createdAt,
      updated: credential.updatedAt,
      hasRefreshToken: !!credential.refreshToken,
      data
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
      return res.status(404).json({ error: 'Credential not found' });
    }
    throw error;
  }
}));

/**
 * Add a new credential
 */
router.post('/', routeHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - User ID not found' });
  }

  const { platform, label, data, refreshToken, refreshTokenExpiry } = req.body;

  // Validate required fields
  if (!platform || !data) {
    return res.status(400).json({ error: 'Platform and credential data are required' });
  }

  // Create credential
  const credential = await addCredential(
    userId,
    platform,
    data as CredentialData,
    {
      label,
      refreshToken,
      refreshTokenExpiry: refreshTokenExpiry ? new Date(refreshTokenExpiry) : undefined
    }
  );

  return res.status(201).json({
    id: credential.id,
    platform: credential.platform,
    label: credential.label,
    created: credential.createdAt
  });
}));

/**
 * Update a credential
 */
router.put('/:id', routeHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - User ID not found' });
  }

  const credentialId = req.params.id;
  const { label, data, refreshToken, refreshTokenExpiry, active } = req.body;

  try {
    // Update credential
    const credential = await updateCredential(
      credentialId,
      userId,
      data as CredentialData | undefined,
      {
        label,
        refreshToken,
        refreshTokenExpiry: refreshTokenExpiry ? new Date(refreshTokenExpiry) : undefined,
        active
      }
    );

    return res.json({
      id: credential.id,
      platform: credential.platform,
      label: credential.label,
      updated: credential.updatedAt
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
      return res.status(404).json({ error: 'Credential not found' });
    }
    throw error;
  }
}));

/**
 * Delete a credential (soft delete)
 */
router.delete('/:id', routeHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - User ID not found' });
  }

  const credentialId = req.params.id;

  const success = await deleteCredential(credentialId, userId);

  if (success) {
    return res.status(204).send();
  } else {
    return res.status(404).json({ error: 'Credential not found' });
  }
}));

export default router;