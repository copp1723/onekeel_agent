import { Router, Response } from 'express';
import { isAuthenticated } from '../replitAuth.js';
import { storage } from '../storage.js';
import { routeHandler, AuthenticatedRequest } from '../../utils/routeHandler.js';

const authRouter = Router();

// Get the current user's information
authRouter.get('/user', isAuthenticated, routeHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.claims?.sub;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized - User ID not found' });
  }

  const user = await storage.getUser(userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Return user without sensitive information
  const safeUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl
  };

  return res.json(safeUser);
}));

export default authRouter;