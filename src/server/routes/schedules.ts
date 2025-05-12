/**
 * API routes for managing workflow schedules
 */

import { Router, Request, Response, Express } from 'express';
import { 
  createSchedule, 
  getSchedule, 
  listSchedules, 
  updateSchedule, 
  deleteSchedule 
} from '../../services/schedulerService.js';
import { isAuthenticated } from '../replitAuth.js';

export function registerScheduleRoutes(app: Express): void {
  const router = Router();
  
  /**
   * Create a new schedule
   * POST /api/schedules
   */
  router.post('/', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
    try {
      const { workflowId, cron, enabled = true } = req.body;
      
      if (!workflowId || !cron) {
        res.status(400).json({ 
          error: 'Missing required fields: workflowId and cron are required' 
        });
        return;
      }
      
      const newSchedule = await createSchedule(workflowId, cron, enabled);
      res.status(201).json(newSchedule);
    } catch (error: unknown) {
      console.error('Error creating schedule:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create schedule';
      res.status(500).json({ error: errorMessage });
    }
  });
  
  /**
   * Get all schedules
   * GET /api/schedules
   */
  router.get('/', isAuthenticated, async (_req: Request, res: Response): Promise<void> => {
    try {
      const allSchedules = await listSchedules();
      res.json(allSchedules);
    } catch (error: unknown) {
      console.error('Error listing schedules:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to list schedules';
      res.status(500).json({ error: errorMessage });
    }
  });
  
  /**
   * Get a schedule by ID
   * GET /api/schedules/:id
   */
  router.get('/:id', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const schedule = await getSchedule(id);
      
      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }
      
      res.json(schedule);
    } catch (error: unknown) {
      console.error(`Error getting schedule ${req.params.id}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get schedule';
      res.status(500).json({ error: errorMessage });
    }
  });
  
  /**
   * Update a schedule
   * PATCH /api/schedules/:id
   */
  router.patch('/:id', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { cron, enabled } = req.body;
      
      // At least one field to update should be provided
      if (cron === undefined && enabled === undefined) {
        res.status(400).json({ 
          error: 'At least one field (cron or enabled) must be provided' 
        });
        return;
      }
      
      const updates: { cron?: string; enabled?: boolean } = {};
      if (cron !== undefined) updates.cron = cron;
      if (enabled !== undefined) updates.enabled = enabled;
      
      const updatedSchedule = await updateSchedule(id, updates);
      
      if (!updatedSchedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }
      
      res.json(updatedSchedule);
    } catch (error: unknown) {
      console.error(`Error updating schedule ${req.params.id}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update schedule';
      res.status(500).json({ error: errorMessage });
    }
  });
  
  /**
   * Delete a schedule
   * DELETE /api/schedules/:id
   */
  router.delete('/:id', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const success = await deleteSchedule(id);
      
      if (!success) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }
      
      res.status(204).end();
    } catch (error: unknown) {
      console.error(`Error deleting schedule ${req.params.id}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete schedule';
      res.status(500).json({ error: errorMessage });
    }
  });
  
  // Register the router
  app.use('/api/schedules', router);
  console.log('Schedule routes registered');
}