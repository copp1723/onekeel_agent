/**
 * Credential management routes
 * Handles CRUD operations for user credentials with authentication
 */

import express from 'express';
import { isAuthenticated } from '../replitAuth.js';
import { 
  addCredential, 
  getCredentials, 
  getCredentialById,
  updateCredential,
  deleteCredential
} from '../../services/credentialVault.js';
import { type CredentialData } from '../../shared/schema.js';

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

/**
 * Get all credentials for the authenticated user
 * Optional platform filter
 */
router.get('/', async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const platform = req.query.platform! as string | undefined;
    
    const results = await getCredentials(userId, platform);
    
    // Map results to safe response objects (don't send IVs to client)
    const response = results.map(({ credential, data }) => ({
      id: credential.id,
      platform: credential.platform!,
      label: credential.label,
      created: credential.createdAt,
      updated: credential.updatedAt,
      hasRefreshToken: !!credential.refreshToken,
      data
    }));
    
    res.json(response);
  } catch (error) {
    console.error('Error getting credentials:', error);
    res.status(500).json({ error: 'Failed to retrieve credentials' });
  }
});

/**
 * Get a specific credential by ID
 */
router.get('/:id', async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const credentialId = req.params.id;
    
    const { credential, data } = await getCredentialById(credentialId, userId);
    
    res.json({
      id: credential.id,
      platform: credential.platform!,
      label: credential.label,
      created: credential.createdAt,
      updated: credential.updatedAt,
      hasRefreshToken: !!credential.refreshToken,
      data
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
      res.status(404).json({ error: 'Credential not found' });
    } else {
      console.error('Error getting credential:', error);
      res.status(500).json({ error: 'Failed to retrieve credential' });
    }
  }
});

/**
 * Add a new credential
 */
router.post('/', async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
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
    
    res.status(201).json({
      id: credential.id,
      platform: credential.platform!,
      label: credential.label,
      created: credential.createdAt
    });
  } catch (error) {
    console.error('Error creating credential:', error);
    res.status(500).json({ error: 'Failed to create credential' });
  }
});

/**
 * Update a credential
 */
router.put('/:id', async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const credentialId = req.params.id;
    const { label, data, refreshToken, refreshTokenExpiry, active } = req.body;
    
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
    
    res.json({
      id: credential.id,
      platform: credential.platform!,
      label: credential.label,
      updated: credential.updatedAt
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
      res.status(404).json({ error: 'Credential not found' });
    } else {
      console.error('Error updating credential:', error);
      res.status(500).json({ error: 'Failed to update credential' });
    }
  }
});

/**
 * Delete a credential (soft delete)
 */
router.delete('/:id', async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const credentialId = req.params.id;
    
    const success = await deleteCredential(credentialId, userId);
    
    if (success) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Credential not found' });
    }
  } catch (error: unknown) {
    console.error('Error deleting credential:', error);
    res.status(500).json({ error: 'Failed to delete credential' });
  }
});

export default router;