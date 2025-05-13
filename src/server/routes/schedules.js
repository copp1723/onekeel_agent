/**
 * API Routes for Task Scheduler
 * Handles CRUD operations for schedules and schedule execution
 */
import express from 'express';
import {
  createSchedule,
  getSchedule,
  listSchedules,
  updateSchedule,
  deleteSchedule,
  retrySchedule,
  getScheduleLogs
} from '../../services/scheduler.js';

const router = express.Router();

// Middleware to validate schedule ID
const validateScheduleId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid schedule ID format' });
  }
  
  next();
};

// Create a new schedule
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const { intent, platform, cronExpression, workflowId } = req.body;
    
    if (!intent || !platform || !cronExpression) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: 'Intent, platform, and cronExpression are required'
      });
    }
    
    // Create the schedule
    const schedule = await createSchedule({
      userId: req.user?.claims?.sub || 'anonymous',
      intent,
      platform,
      cronExpression,
      workflowId
    });
    
    res.status(201).json(schedule);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({
      error: 'Failed to create schedule',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get all schedules for the authenticated user
router.get('/', async (req, res) => {
  try {
    // Extract query parameters
    const status = req.query.status;
    const platform = req.query.platform;
    const intent = req.query.intent;
    
    // List schedules with filtering
    const schedulesList = await listSchedules({
      userId: req.user?.claims?.sub || 'anonymous',
      status,
      platform,
      intent
    });
    
    res.json(schedulesList);
  } catch (error) {
    console.error('Error listing schedules:', error);
    res.status(500).json({
      error: 'Failed to list schedules',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get a specific schedule by ID
router.get('/:id', validateScheduleId, async (req, res) => {
  try {
    const schedule = await getSchedule(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    // Check if the schedule belongs to the authenticated user
    if (req.user?.claims?.sub && schedule.userId !== req.user.claims.sub) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(schedule);
  } catch (error) {
    console.error(`Error getting schedule ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to get schedule',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update a schedule
router.put('/:id', validateScheduleId, async (req, res) => {
  try {
    // Get the schedule to check ownership
    const existingSchedule = await getSchedule(req.params.id);
    
    if (!existingSchedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    // Check if the schedule belongs to the authenticated user
    if (req.user?.claims?.sub && existingSchedule.userId !== req.user.claims.sub) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Validate request body
    const { cronExpression, status, intent, platform } = req.body;
    
    if (!cronExpression && !status && !intent && !platform) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: 'At least one field to update must be provided'
      });
    }
    
    // Update the schedule
    const updatedSchedule = await updateSchedule(
      req.params.id,
      { cronExpression, status, intent, platform }
    );
    
    res.json(updatedSchedule);
  } catch (error) {
    console.error(`Error updating schedule ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to update schedule',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Delete a schedule
router.delete('/:id', validateScheduleId, async (req, res) => {
  try {
    // Get the schedule to check ownership
    const existingSchedule = await getSchedule(req.params.id);
    
    if (!existingSchedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    // Check if the schedule belongs to the authenticated user
    if (req.user?.claims?.sub && existingSchedule.userId !== req.user.claims.sub) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Delete the schedule
    const result = await deleteSchedule(req.params.id);
    
    if (result) {
      res.status(204).end();
    } else {
      res.status(500).json({ error: 'Failed to delete schedule' });
    }
  } catch (error) {
    console.error(`Error deleting schedule ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to delete schedule',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Retry a failed schedule
router.post('/:id/retry', validateScheduleId, async (req, res) => {
  try {
    // Get the schedule to check ownership
    const existingSchedule = await getSchedule(req.params.id);
    
    if (!existingSchedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    // Check if the schedule belongs to the authenticated user
    if (req.user?.claims?.sub && existingSchedule.userId !== req.user.claims.sub) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Only allow retrying failed schedules
    if (existingSchedule.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed schedules can be retried' });
    }
    
    // Retry the schedule
    const updatedSchedule = await retrySchedule(req.params.id);
    
    res.json(updatedSchedule);
  } catch (error) {
    console.error(`Error retrying schedule ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to retry schedule',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get execution logs for a schedule
router.get('/:id/logs', validateScheduleId, async (req, res) => {
  try {
    // Get the schedule to check ownership
    const existingSchedule = await getSchedule(req.params.id);
    
    if (!existingSchedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    // Check if the schedule belongs to the authenticated user
    if (req.user?.claims?.sub && existingSchedule.userId !== req.user.claims.sub) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get logs for the schedule
    const logs = await getScheduleLogs(req.params.id);
    
    res.json(logs);
  } catch (error) {
    console.error(`Error getting logs for schedule ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to get schedule logs',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;