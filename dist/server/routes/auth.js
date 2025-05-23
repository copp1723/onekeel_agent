import { Router } from 'express';
import { isAuthenticated } from '../replitAuth.js';
import { storage } from '../storage.js';
// Type cast to help with TypeScript compatibility
const routeHandler = (fn) => fn;
const authRouter = Router();
// Get the current user's information
authRouter.get('/user', isAuthenticated, routeHandler(async (req, res) => {
    try {
        const userId = req.user?.claims?.sub;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized - User ID not found' });
            return;
        }
        const user = await storage.getUser(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Return user without sensitive information
        const safeUser = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl
        };
        res.json(safeUser);
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Failed to fetch user' });
    }
}));
export default authRouter;
//# sourceMappingURL=auth.js.map