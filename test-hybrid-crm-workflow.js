/**
 * Test script for the Hybrid CRM Workflow
 * 
 * This script demonstrates the execution of the complete CRM workflow:
 * 1. Hybrid ingestion for report retrieval 
 * 2. Data processing
 * 3. Insight generation
 * 
 * Usage: node test-hybrid-crm-workflow.js
 */

import { workflowManager } from './src/services/workflowManagerFixed.js';
import hybridCRMWorkflow from './src/workflows/hybrid-crm-workflow.js';

// Set sample data flag for testing
process.env.USE_SAMPLE_DATA = 'true';

/**
 * Run the hybrid CRM workflow test
 */
async function testHybridCRMWorkflow() {
  console.log('\n=== HYBRID CRM WORKFLOW TEST ===\n');

  try {
    // Register the workflow
    console.log('Registering Hybrid CRM Workflow...');
    const workflowId = await workflowManager.registerWorkflow(hybridCRMWorkflow);
    console.log(`Workflow registered with ID: ${workflowId}`);

    // Add workflow parameters
    const workflowParams = {
      platform: 'VinSolutions',
      startedBy: 'test-script',
      timestamp: new Date().toISOString()
    };

    // Execute the workflow
    console.log('\nExecuting workflow...');
    console.log(`Platform: ${workflowParams.platform}`);
    console.log(`Started by: ${workflowParams.startedBy}`);
    console.log(`Timestamp: ${workflowParams.timestamp}`);
    console.log('\n--- Step 1: Fetch CRM Report ---');
    
    // Execute first step
    const step1Result = await workflowManager.executeWorkflowStep(
      workflowId,
      0,
      workflowParams
    );

    if (!step1Result.success) {
      console.error(`Error in step 1: ${step1Result.error}`);
      return;
    }

    console.log(`✓ Step 1 completed successfully`);
    console.log(`Report path: ${step1Result.reportPath}`);

    // Execute second step
    console.log('\n--- Step 2: Process Data ---');
    const step2Result = await workflowManager.executeWorkflowStep(
      workflowId,
      1,
      {
        ...workflowParams,
        __lastStepResult: step1Result
      }
    );

    if (!step2Result.success) {
      console.error(`Error in step 2: ${step2Result.error}`);
      return;
    }

    console.log(`✓ Step 2 completed successfully`);
    console.log(`Processed ${step2Result.recordCount} records`);

    // Execute third step
    console.log('\n--- Step 3: Generate Insights ---');
    const step3Result = await workflowManager.executeWorkflowStep(
      workflowId,
      2,
      {
        ...workflowParams,
        __lastStepResult: {
          ...step2Result,
          platform: workflowParams.platform
        }
      }
    );

    if (!step3Result.success) {
      console.error(`Error in step 3: ${step3Result.error}`);
      return;
    }

    console.log(`✓ Step 3 completed successfully`);
    console.log(`Insights saved to: ${step3Result.filePath}`);

    // Display insights summary
    console.log('\n=== INSIGHTS SUMMARY ===');
    console.log(step3Result.insights.summary);
    console.log('\nTop opportunities:');
    step3Result.insights.opportunities.forEach((opportunity, index) => {
      console.log(`  ${index + 1}. ${opportunity}`);
    });

    console.log('\n=== WORKFLOW COMPLETED SUCCESSFULLY ===');

    // Clean up
    console.log('\nCleaning up workflow...');
    const deleteResult = await workflowManager.deleteWorkflow(workflowId);
    console.log(`Workflow deleted: ${deleteResult}`);
  } catch (error) {
    console.error('Error during workflow execution:', error);
  }
}

// Run the test
testHybridCRMWorkflow().catch(console.error);