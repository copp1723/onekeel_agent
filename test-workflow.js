/**
 * Test script for the persistent multi-step workflow system
 * This script demonstrates the creation and execution of workflows
 * with state persistence, step handling, and error recovery.
 * 
 * Usage: node test-workflow.js
 */

// Import the TypeScript-compiled version from dist directory
import {
  createWorkflow,
  runWorkflow,
  getWorkflow,
  listWorkflows,
  resetWorkflow,
  deleteWorkflow
} from './dist/services/workflowService.js';

import { v4 as uuidv4 } from 'uuid';

async function testWorkflows() {
  try {
    console.log('Testing Workflow System...');

    // Define a simple workflow
    const sampleWorkflow = {
      steps: [
        {
          id: uuidv4(),
          type: 'dataProcessing',
          name: 'Process Data',
          config: {
            operation: 'transform',
            data: { sample: 'data' }
          },
          maxRetries: 3,
          backoffFactor: 2
        },
        {
          id: uuidv4(),
          type: 'emailIngestion',
          name: 'Fetch Email Reports',
          config: {
            platform: 'VinSolutions',
            searchCriteria: {
              fromEmail: 'reports@vinsolutions.com',
              subject: 'Daily Report'
            }
          },
          maxRetries: 2
        },
        {
          id: uuidv4(),
          type: 'insightGeneration',
          name: 'Generate Insights',
          config: {
            platform: 'VinSolutions'
          }
        }
      ],
      initialContext: {
        startedBy: 'test-script',
        timestamp: new Date().toISOString()
      }
    };

    // Create the workflow
    console.log('Creating workflow...');
    const workflow = await createWorkflow(
      sampleWorkflow.steps,
      sampleWorkflow.initialContext
    );
    console.log('Workflow created:', workflow.id);

    // Run the first step
    console.log('Running first step...');
    const afterStep1 = await runWorkflow(workflow.id);
    console.log('After step 1:', {
      currentStep: afterStep1.currentStep,
      status: afterStep1.status
    });

    // Run the second step
    if (afterStep1.status !== 'failed') {
      console.log('Running second step...');
      const afterStep2 = await runWorkflow(workflow.id);
      console.log('After step 2:', {
        currentStep: afterStep2.currentStep,
        status: afterStep2.status
      });

      // Run the third step
      if (afterStep2.status !== 'failed') {
        console.log('Running third step...');
        const afterStep3 = await runWorkflow(workflow.id);
        console.log('After step 3:', {
          currentStep: afterStep3.currentStep,
          status: afterStep3.status,
          context: afterStep3.context
        });
      }
    }

    // Get the workflow
    const retrievedWorkflow = await getWorkflow(workflow.id);
    console.log('Retrieved workflow status:', retrievedWorkflow.status);

    // List workflows
    const allWorkflows = await listWorkflows();
    console.log(`Found ${allWorkflows.length} workflows`);

    // Reset the workflow
    const resetWorkflowResult = await resetWorkflow(workflow.id);
    console.log('Reset workflow:', {
      currentStep: resetWorkflowResult.currentStep,
      status: resetWorkflowResult.status
    });

    // Clean up (optional)
    // Uncomment this to delete the test workflow
    // await deleteWorkflow(workflow.id);
    // console.log('Workflow deleted');

    console.log('Workflow test completed successfully');
  } catch (error) {
    console.error('Error testing workflows:', error);
  }
}

testWorkflows();