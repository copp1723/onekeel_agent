/**
 * IMAP Filters Admin API
 * 
 * This module provides API endpoints for managing IMAP filters.
 */
import express from 'express';
import { db } from '../../../../../shared/db.js';
import { imapFilters } from '../../../../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../../../../../shared/logger.js';
import { isError, getErrorMessage } from '../../../../../utils/errorUtils.js';
import { rateLimiters } from '../../../../../shared/middleware/rateLimiter.js';
import { isAdmin } from '../../../../../shared/middleware/auth.js';
const router = express.Router();
// Apply rate limiting and admin-only access
router.use(rateLimiters.api);
router.use(isAdmin);
/**
 * GET /api/admin/imap-filters
 * Get all IMAP filters
 */
router.get('/', async (req, res) => {
  try {
    const filters = await db.select().from(imapFilters);
    res.json(filters);
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Error fetching IMAP filters:', errorMessage);
    res.status(500).json({
      error: 'Failed to fetch IMAP filters',
      message: errorMessage
    });
  }
});
/**
 * GET /api/admin/imap-filters/:id
 * Get a specific IMAP filter by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    const filter = await db
      .select()
      .from(imapFilters)
      .where(eq(imapFilters.id, id.toString()))
      .limit(1);
    if (filter.length === 0) {
      return res.status(404).json({ error: 'IMAP filter not found' });
    }
    res.json(filter[0]);
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Error fetching IMAP filter:', errorMessage);
    res.status(500).json({
      error: 'Failed to fetch IMAP filter',
      message: errorMessage
    });
  }
});
/**
 * POST /api/admin/imap-filters
 * Create a new IMAP filter
 */
router.post('/', async (req, res) => {
  try {
    const { vendor, fromAddress, subjectRegex, daysBack, filePattern, active } = req.body;
    // Validate required fields
    if (!vendor || !fromAddress || !subjectRegex) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'vendor, fromAddress, and subjectRegex are required'
      });
    }
    // Validate regex patterns
    try {
      new RegExp(subjectRegex);
      if (filePattern) new RegExp(filePattern);
    } catch (regexError) {
      return res.status(400).json({
        error: 'Invalid regex pattern',
        message: getErrorMessage(regexError)
      });
    }
    // Create the filter
    const result = await db
      .insert(imapFilters)
      .values({
        vendor,
        fromAddress,
        subjectRegex,
        daysBack: daysBack || 7,
        filePattern: filePattern || null,
        active: active !== false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    res.status(201).json(result[0]);
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Error creating IMAP filter:', errorMessage);
    res.status(500).json({
      error: 'Failed to create IMAP filter',
      message: errorMessage
    });
  }
});
/**
 * PUT /api/admin/imap-filters/:id
 * Update an existing IMAP filter
 */
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    const { vendor, fromAddress, subjectRegex, daysBack, filePattern, active } = req.body;
    // Validate required fields
    if (!vendor || !fromAddress || !subjectRegex) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'vendor, fromAddress, and subjectRegex are required'
      });
    }
    // Validate regex patterns
    try {
      new RegExp(subjectRegex);
      if (filePattern) new RegExp(filePattern);
    } catch (regexError) {
      return res.status(400).json({
        error: 'Invalid regex pattern',
        message: getErrorMessage(regexError)
      });
    }
    // Check if filter exists
    const existingFilter = await db
      .select()
      .from(imapFilters)
      .where(eq(imapFilters.id, id.toString()))
      .limit(1);
    if (existingFilter.length === 0) {
      return res.status(404).json({ error: 'IMAP filter not found' });
    }
    // Update the filter
    const result = await db
      .update(imapFilters)
      .set({
        vendor,
        fromAddress,
        subjectRegex,
        daysBack: daysBack || 7,
        filePattern: filePattern || null,
        active: active !== false,
        updatedAt: new Date()
      })
      .where(eq(imapFilters.id, id.toString()))
      .returning();
    res.json(result[0]);
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Error updating IMAP filter:', errorMessage);
    res.status(500).json({
      error: 'Failed to update IMAP filter',
      message: errorMessage
    });
  }
});
/**
 * DELETE /api/admin/imap-filters/:id
 * Delete an IMAP filter
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    // Check if filter exists
    const existingFilter = await db
      .select()
      .from(imapFilters)
      .where(eq(imapFilters.id, id.toString()))
      .limit(1);
    if (existingFilter.length === 0) {
      return res.status(404).json({ error: 'IMAP filter not found' });
    }
    // Delete the filter
    await db
      .delete(imapFilters)
      .where(eq(imapFilters.id, id.toString()));
    res.status(204).end();
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Error deleting IMAP filter:', errorMessage);
    res.status(500).json({
      error: 'Failed to delete IMAP filter',
      message: errorMessage
    });
  }
});
/**
 * POST /api/admin/imap-filters/:id/toggle
 * Toggle the active status of an IMAP filter
 */
router.post('/:id/toggle', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    // Get current filter
    const existingFilter = await db
      .select()
      .from(imapFilters)
      .where(eq(imapFilters.id, id.toString()))
      .limit(1);
    if (existingFilter.length === 0) {
      return res.status(404).json({ error: 'IMAP filter not found' });
    }
    // Toggle active status
    const newActiveStatus = !existingFilter[0].active;
    const result = await db
      .update(imapFilters)
      .set({
        active: newActiveStatus,
        updatedAt: new Date()
      })
      .where(eq(imapFilters.id, id.toString()))
      .returning();
    res.json(result[0]);
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Error toggling IMAP filter:', errorMessage);
    res.status(500).json({
      error: 'Failed to toggle IMAP filter',
      message: errorMessage
    });
  }
});
export default router;
