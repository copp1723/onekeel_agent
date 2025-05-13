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
const validateScheduleId = async (req, res, next) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Schedule ID is required' 
    });
  }
  
  const schedule = await getSchedule(id);
  
  if (!schedule) {
    return res.status(404).json({ 
      success: false, 
      message: 'Schedule not found' 
    });
  }
  
  req.schedule = schedule;
  next();
};

// Get all schedules with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      userId = null,
      status,
      platform,
      intent,
      limit = 20,
      offset = 0
    } = req.query;
    
    // Basic auth check - should use proper auth middleware in production
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }
    
    const options = {
      userId,
      status,
      platform,
      intent,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    };
    
    const schedules = await listSchedules(options);
    
    return res.json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    console.error('Error listing schedules:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list schedules',
      error: error.message
    });
  }
});

// Create a new schedule
router.post('/', async (req, res) => {
  try {
    const { intent, platform, cronExpression, workflowId } = req.body;
    const userId = req.body.userId || 'test-user';
    
    // Validate required fields
    if (!intent || !platform || !cronExpression) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: intent, platform, and cronExpression are required'
      });
    }
    
    const schedule = await createSchedule({
      userId,
      intent,
      platform,
      cronExpression,
      workflowId
    });
    
    return res.json({
      success: true,
      message: 'Schedule created successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create schedule',
      error: error.message
    });
  }
});

// Get a schedule by ID
router.get('/:id', validateScheduleId, async (req, res, next) => {
  try {
    return res.json({
      success: true,
      data: req.schedule
    });
  } catch (error) {
    console.error('Error retrieving schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve schedule',
      error: error.message
    });
  }
});

// Update a schedule
router.put('/:id', validateScheduleId, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { intent, platform, cronExpression, status } = req.body;
    
    // Validate at least one field is provided
    if (!intent && !platform && !cronExpression && !status) {
      return res.status(400).json({
        success: false,
        message: 'No update fields provided'
      });
    }
    
    const updateData = {};
    if (intent) updateData.intent = intent;
    if (platform) updateData.platform = platform;
    if (cronExpression) updateData.cronExpression = cronExpression;
    if (status) updateData.status = status;
    
    const updatedSchedule = await updateSchedule(id, updateData);
    
    return res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: updatedSchedule
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update schedule',
      error: error.message
    });
  }
});

// Delete a schedule
router.delete('/:id', validateScheduleId, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await deleteSchedule(id);
    
    return res.json({
      success: true,
      message: result 
        ? 'Schedule deleted successfully' 
        : 'Schedule not found or already deleted',
      data: { deleted: result }
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete schedule',
      error: error.message
    });
  }
});

// Retry a failed schedule
router.post('/:id/retry', validateScheduleId, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Only retry failed schedules
    if (req.schedule.status !== 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Only failed schedules can be retried'
      });
    }
    
    const retriedSchedule = await retrySchedule(id);
    
    return res.json({
      success: true,
      message: 'Schedule retry initiated successfully',
      data: retriedSchedule
    });
  } catch (error) {
    console.error('Error retrying schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retry schedule',
      error: error.message
    });
  }
});

// Get logs for a schedule
router.get('/:id/logs', validateScheduleId, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const logs = await getScheduleLogs(id);
    
    return res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Error retrieving schedule logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve schedule logs',
      error: error.message
    });
  }
});

export default router;