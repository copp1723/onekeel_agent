/**
 * API routes for managing workflow schedules
 */
import { Router } from 'express';
import { createSchedule, getSchedule, listSchedules, updateSchedule, deleteSchedule } from '../../services/schedulerService.js';
import { isAuthenticated } from '../replitAuth.js';
export function registerScheduleRoutes(app) {
    const router = Router();
    /**
     * Create a new schedule
     * POST /api/schedules
     */
    router.post('/', isAuthenticated, async (req, res) => {
        try {
            const { workflowId, cron, enabled = true } = req.body;
            if (!workflowId || !cron) {
                return res.status(400).json({
                    error: 'Missing required fields: workflowId and cron are required'
                });
            }
            const newSchedule = await createSchedule(workflowId, cron, enabled);
            res.status(201).json(newSchedule);
        }
        catch (error) {
            console.error('Error creating schedule:', error);
            res.status(500).json({
                error: error.message || 'Failed to create schedule'
            });
        }
    });
    /**
     * Get all schedules
     * GET /api/schedules
     */
    router.get('/', isAuthenticated, async (req, res) => {
        try {
            const allSchedules = await listSchedules();
            res.json(allSchedules);
        }
        catch (error) {
            console.error('Error listing schedules:', error);
            res.status(500).json({
                error: error.message || 'Failed to list schedules'
            });
        }
    });
    /**
     * Get a schedule by ID
     * GET /api/schedules/:id
     */
    router.get('/:id', isAuthenticated, async (req, res) => {
        try {
            const { id } = req.params;
            const schedule = await getSchedule(id);
            if (!schedule) {
                return res.status(404).json({ error: 'Schedule not found' });
            }
            res.json(schedule);
        }
        catch (error) {
            console.error(`Error getting schedule ${req.params.id}:`, error);
            res.status(500).json({
                error: error.message || 'Failed to get schedule'
            });
        }
    });
    /**
     * Update a schedule
     * PATCH /api/schedules/:id
     */
    router.patch('/:id', isAuthenticated, async (req, res) => {
        try {
            const { id } = req.params;
            const { cron, enabled } = req.body;
            // At least one field to update should be provided
            if (cron === undefined && enabled === undefined) {
                return res.status(400).json({
                    error: 'At least one field (cron or enabled) must be provided'
                });
            }
            const updates = {};
            if (cron !== undefined)
                updates.cronExpression = cron;
            if (enabled !== undefined)
                updates.enabled = enabled;
            const updatedSchedule = await updateSchedule(id, updates);
            if (!updatedSchedule) {
                return res.status(404).json({ error: 'Schedule not found' });
            }
            res.json(updatedSchedule);
        }
        catch (error) {
            console.error(`Error updating schedule ${req.params.id}:`, error);
            res.status(500).json({
                error: error.message || 'Failed to update schedule'
            });
        }
    });
    /**
     * Delete a schedule
     * DELETE /api/schedules/:id
     */
    router.delete('/:id', isAuthenticated, async (req, res) => {
        try {
            const { id } = req.params;
            const success = await deleteSchedule(id);
            if (!success) {
                return res.status(404).json({ error: 'Schedule not found' });
            }
            res.status(204).end();
        }
        catch (error) {
            console.error(`Error deleting schedule ${req.params.id}:`, error);
            res.status(500).json({
                error: error.message || 'Failed to delete schedule'
            });
        }
    });
    // Register the router
    app.use('/api/schedules', router);
    console.log('Schedule routes registered');
}
//# sourceMappingURL=schedules.js.map