/**
 * Fixed Scheduler Service
 * This is a fixed version of the scheduler service that replaces the problematic node-cron
 * with our simplified interval-based solution.
 */

import * as simpleScheduler from './schedulerServiceSimple.js';

// Export the simple scheduler functions
export const initializeScheduler = simpleScheduler.initializeScheduler;
export const createSchedule = simpleScheduler.createSchedule;
export const startSchedule = simpleScheduler.startSchedule;
export const stopSchedule = simpleScheduler.stopSchedule;
export const executeWorkflowById = simpleScheduler.executeWorkflowById;
export const getSchedule = simpleScheduler.getSchedule;
export const listSchedules = simpleScheduler.listSchedules;
export const updateSchedule = simpleScheduler.updateSchedule;
export const deleteSchedule = simpleScheduler.deleteSchedule;