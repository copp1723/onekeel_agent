/**
 * API Routes for Workflow Management
 */
import express, { Request, Response, NextFunction } from 'express';
import { 
  createWorkflow, 
  getWorkflow, 
  listWorkflows, 
  runWorkflow, 
  resetWorkflow, 
  deleteWorkflow 
} from '../../services/workflowService.js';
import { WorkflowStep, WorkflowStatus } from '../../shared/schema.js';
import { isAuthenticated } from '../replitAuth.js';

// Extend the Express Request type to include user claims
declare global {
  namespace Express {
    interface User {
      claims?: {
        sub: string;
        email?: string;
        [key: string]: any;
      };
      [key: string]: any;
    }
  }
}

export const workflowRoutes = express.Router();

// Create a new workflow
workflowRoutes.post('/', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const { steps, initialContext } = req.body;
    
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      res.status(400).json({ message: 'Workflow must have at least one step' });
      return;
    }
    
    // Get user ID from authenticated request
    const userId = req.user?.claims?.sub;
    
    const workflow = await createWorkflow(steps, initialContext, userId);
    
    res.status(201).json(workflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ 
      message: 'Failed to create workflow', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get a specific workflow
workflowRoutes.get('/:id', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const workflow = await getWorkflow(id);
    
    if (!workflow) {
      res.status(404).json({ message: 'Workflow not found' });
      return;
    }
    
    // Check if user has access to this workflow
    const userId = req.user?.claims?.sub;
    if (workflow.userId && workflow.userId !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }
    
    res.json(workflow);
  } catch (error) {
    console.error('Error getting workflow:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve workflow', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// List workflows
workflowRoutes.get('/', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as WorkflowStatus | undefined;
    
    // Get user ID from authenticated request
    const userId = req.user?.claims?.sub;
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    
    const workflowList = await listWorkflows(status, userId, limit);
    
    res.json(workflowList);
  } catch (error) {
    console.error('Error listing workflows:', error);
    res.status(500).json({ 
      message: 'Failed to list workflows', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Run a workflow (execute next step)
workflowRoutes.post('/:id/run', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if workflow exists and user has access
    const existingWorkflow = await getWorkflow(id);
    
    if (!existingWorkflow) {
      res.status(404).json({ message: 'Workflow not found' });
      return;
    }
    
    // Check if user has access to this workflow
    const userId = req.user?.claims?.sub;
    if (existingWorkflow.userId && existingWorkflow.userId !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }
    
    // Run the workflow
    const updatedWorkflow = await runWorkflow(id);
    
    res.json(updatedWorkflow);
  } catch (error) {
    console.error('Error running workflow:', error);
    res.status(500).json({ 
      message: 'Failed to run workflow', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Reset a workflow
workflowRoutes.post('/:id/reset', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if workflow exists and user has access
    const existingWorkflow = await getWorkflow(id);
    
    if (!existingWorkflow) {
      res.status(404).json({ message: 'Workflow not found' });
      return;
    }
    
    // Check if user has access to this workflow
    const userId = req.user?.claims?.sub;
    if (existingWorkflow.userId && existingWorkflow.userId !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }
    
    // Reset the workflow
    const updatedWorkflow = await resetWorkflow(id);
    
    res.json(updatedWorkflow);
  } catch (error) {
    console.error('Error resetting workflow:', error);
    res.status(500).json({ 
      message: 'Failed to reset workflow', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Delete a workflow
workflowRoutes.delete('/:id', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if workflow exists and user has access
    const existingWorkflow = await getWorkflow(id);
    
    if (!existingWorkflow) {
      res.status(404).json({ message: 'Workflow not found' });
      return;
    }
    
    // Check if user has access to this workflow
    const userId = req.user?.claims?.sub;
    if (existingWorkflow.userId && existingWorkflow.userId !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }
    
    // Delete the workflow
    await deleteWorkflow(id);
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ 
      message: 'Failed to delete workflow', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});