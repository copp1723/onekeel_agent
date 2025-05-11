import { Router } from 'express';
import { storage } from '../storage.js';
import { isAuthenticated } from '../replitAuth.js';
// Type cast to help with TypeScript compatibility
const routeHandler = (fn) => fn;
const credentialsRouter = Router();
// Middleware to ensure routes are protected
credentialsRouter.use(isAuthenticated);
// Get all credentials for the current user
credentialsRouter.get('/', isAuthenticated, routeHandler(async (req, res) => {
    try {
        const userId = req.user?.claims?.sub;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized - User ID not found' });
            return;
        }
        const credentials = await storage.listCredentials(userId);
        // Return credentials without sensitive fields
        res.json(credentials.map(cred => ({
            id: cred.id,
            userId: cred.userId,
            site: cred.site,
            username: cred.username,
            createdAt: cred.createdAt
        })));
    }
    catch (error) {
        console.error('Error fetching credentials:', error);
        res.status(500).json({ message: 'Failed to fetch credentials' });
    }
}));
// Save a new credential
credentialsRouter.post('/', isAuthenticated, routeHandler(async (req, res) => {
    try {
        const userId = req.user?.claims?.sub;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized - User ID not found' });
            return;
        }
        const { site, username, password } = req.body;
        if (!site || !username || !password) {
            res.status(400).json({ message: 'Site, username, and password are required' });
            return;
        }
        const credential = await storage.saveCredential({
            userId,
            site,
            username,
            password
        });
        res.status(201).json({
            id: credential.id,
            userId: credential.userId,
            site: credential.site,
            username: credential.username,
            createdAt: credential.createdAt
        });
    }
    catch (error) {
        console.error('Error saving credential:', error);
        res.status(500).json({ message: 'Failed to save credential' });
    }
}));
// Delete a credential
credentialsRouter.delete('/:id', isAuthenticated, routeHandler(async (req, res) => {
    try {
        const userId = req.user?.claims?.sub;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized - User ID not found' });
            return;
        }
        const credentialId = req.params.id;
        if (!credentialId) {
            res.status(400).json({ message: 'Credential ID is required' });
            return;
        }
        const result = await storage.deleteCredential(credentialId, userId);
        if (!result) {
            res.status(404).json({ message: 'Credential not found or not owned by user' });
            return;
        }
        res.json({ message: 'Credential deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting credential:', error);
        res.status(500).json({ message: 'Failed to delete credential' });
    }
}));
export default credentialsRouter;
//# sourceMappingURL=credentials.js.map