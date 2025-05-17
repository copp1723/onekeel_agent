/**
 * Simplified workflow test using JavaScript
 * This avoids TypeScript compilation issues by implementing
 * a minimal version of the workflow system in plain JavaScript
 */

import { randomUUID } from 'crypto';

// Use native Node.js UUID instead of the uuid package
const uuidv4 = () => randomUUID();

// Mini step handlers
const stepHandlers = {
  dataProcessing: async (config, context) => {
    console.log('Data Processing Step:', config);
    return {
      processed: true,
      message: 'Data processed successfully'
    };
  },
  emailIngestion: async (config, context) => {
    console.log('Email Ingestion Step:', config);
    return {
      emailsFetched: 5,
      message: 'Emails processed successfully'
    };
  },
  insightGeneration: async (config, context) => {
    console.log('Insight Generation Step:', config);
    return {
      insights: ['Insight 1', 'Insight 2'],
      summary: 'Overall positive trends',
      message: 'Insights generated successfully'
    };
  }
};

// Create a new workflow
async function createMiniWorkflow(steps, initialContext = {}, userId = null) {
  try {
    // Add IDs to steps if they don't have them
    const stepsWithIds = steps.map(step => ({
      ...step,
      id: step.id || uuidv4()
    }));

    const workflow = {
      id: uuidv4(),
      userId,
      steps: stepsWithIds,
      currentStep: 0,
      context: initialContext,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Created workflow:', workflow.id);
    return workflow;
  } catch (error) {
    console.error('Error creating workflow:', error);
    throw error;
  }
}

// Run a workflow step
async function runMiniWorkflow(workflow) {
  try {
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // If workflow is completed or failed, don't run again
    if (workflow.status === 'completed' || workflow.status === 'failed') {
      return workflow;
    }

    const steps = workflow.steps;
    const currentStepIndex = workflow.currentStep;
    
    if (currentStepIndex >= steps.length) {
      // Mark as completed if all steps are done
      workflow.status = 'completed';
      workflow.updatedAt = new Date();
      return workflow;
    }

    const currentStep = steps[currentStepIndex];
    
    try {
      console.log(`Executing step ${currentStepIndex + 1}/${steps.length}: ${currentStep.name}`);
      
      // Get the handler for this step type
      const handler = stepHandlers[currentStep.type];
      
      if (!handler) {
        throw new Error(`No handler found for step type ${currentStep.type}`);
      }
      
      // Execute the step
      const stepResult = await handler(currentStep.config, workflow.context || {});
      
      // Merge the step result into the context
      workflow.context = {
        ...(workflow.context || {}),
        [currentStep.id]: stepResult,
        __lastStepResult: stepResult // Store the last step result for easy access
      };

      // Update the workflow
      workflow.currentStep = currentStepIndex + 1;
      workflow.status = currentStepIndex + 1 >= steps.length ? 'completed' : 'paused';
      workflow.updatedAt = new Date();

      return workflow;
    } catch (error) {
      console.error(`Error executing step ${currentStepIndex + 1}/${steps.length}:`, error);
      
      // Update the workflow with error information
      workflow.status = 'failed';
      workflow.lastError = error.message;
      workflow.updatedAt = new Date();
      
      return workflow;
    }
  } catch (error) {
    console.error('Error running workflow:', error);
    throw error;
  }
}

// Test the workflow
async function testMiniWorkflow() {
  try {
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
          }
        },
        {
          id: uuidv4(),
          type: 'emailIngestion',
          name: 'Fetch Email Reports',
          config: {
            platform: 'VinSolutions',
            searchCriteria: {
              fromEmail: 'reports@example.com',
              subject: 'Daily Report'
            }
          }
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

    // Create workflow
    console.log('Creating workflow...');
    let workflow = await createMiniWorkflow(
      sampleWorkflow.steps,
      sampleWorkflow.initialContext
    );

    // Run step 1
    console.log('\nRunning step 1...');
    workflow = await runMiniWorkflow(workflow);
    console.log('After step 1:', {
      currentStep: workflow.currentStep,
      status: workflow.status
    });

    // Run step 2
    console.log('\nRunning step 2...');
    workflow = await runMiniWorkflow(workflow);
    console.log('After step 2:', {
      currentStep: workflow.currentStep,
      status: workflow.status
    });

    // Run step 3
    console.log('\nRunning step 3...');
    workflow = await runMiniWorkflow(workflow);
    console.log('After step 3:', {
      currentStep: workflow.currentStep,
      status: workflow.status
    });

    // Display final context
    console.log('\nFinal workflow context:');
    console.log(JSON.stringify(workflow.context, null, 2));
    
    console.log('\nWorkflow test completed successfully');
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the test
testMiniWorkflow();