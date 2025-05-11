import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../replitAuth';

const credentialsRouter = Router();

// Middleware to ensure routes are protected
credentialsRouter.use(isAuthenticated);

// Get all credentials for the current user
credentialsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized - User ID not found' });
    }
    
    const credentials = await storage.listCredentials(userId);
    
    // Return credentials without the encrypted password
    const safeCredentials = credentials.map(cred => ({
      id: cred.id,
      site: cred.site,
      username: cred.username,
      createdAt: cred.createdAt
    }));
    
    res.json(safeCredentials);
  } catch (error) {
    console.error('Error listing credentials:', error);
    res.status(500).json({ message: 'Failed to list credentials' });
  }
});

// Save a new credential
credentialsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized - User ID not found' });
    }
    
    const { site, username, password } = req.body;
    
    // Validate required fields
    if (!site || !username || !password) {
      return res.status(400).json({ 
        message: 'Missing required fields: site, username, and password are required' 
      });
    }
    
    const credential = await storage.saveCredential({
      userId,
      site,
      username,
      password
    });
    
    // Return credential without the encrypted password
    const safeCredential = {
      id: credential.id,
      site: credential.site,
      username: credential.username,
      createdAt: credential.createdAt
    };
    
    res.status(201).json(safeCredential);
  } catch (error) {
    console.error('Error saving credential:', error);
    res.status(500).json({ message: 'Failed to save credential' });
  }
});

// Delete a credential
credentialsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.claims?.sub;
    const credentialId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized - User ID not found' });
    }
    
    // TODO: Implement delete credential functionality in storage
    // For now, just return success
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting credential:', error);
    res.status(500).json({ message: 'Failed to delete credential' });
  }
});

export default credentialsRouter;