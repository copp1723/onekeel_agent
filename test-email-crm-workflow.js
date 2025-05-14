/**
 * Test script for the Email-Only CRM Workflow
 * 
 * This script demonstrates the execution of the complete CRM workflow:
 * 1. Email-only ingestion for report retrieval 
 * 2. Data processing
 * 3. Insight generation
 * 
 * Usage: node test-email-crm-workflow.js
 */

import { workflowManager } from './src/services/workflowManagerFixed.js';
import emailCRMWorkflow from './src/workflows/email-crm-workflow.js';

// Set sample data flag for testing
process.env.USE_SAMPLE_DATA = 'true';

/**
 * Run the email-only CRM workflow test
 */
async function testEmailCRMWorkflow() {
  console.log('\n=== EMAIL-ONLY CRM WORKFLOW TEST ===\n');

  try {
    // Register the workflow
    console.log('Registering Email-Only CRM Workflow...');
    const workflowId = await workflowManager.registerWorkflow(emailCRMWorkflow);
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
      console.error(`❌ Step 1 failed: ${step1Result.error}`);
      return;
    }
    
    console.log(`✅ Step 1 completed successfully`);
    console.log(`Report path: ${step1Result.reportPath}`);
    
    // Execute second step
    console.log('\n--- Step 2: Process Data ---');
    const step2Result = await workflowManager.executeWorkflowStep(
      workflowId,
      1,
      workflowParams,
      { __lastStepResult: step1Result }
    );
    
    if (!step2Result.success) {
      console.error(`❌ Step 2 failed: ${step2Result.error}`);
      return;
    }
    
    console.log(`✅ Step 2 completed successfully`);
    console.log(`Processed ${step2Result.recordCount} records`);
    
    // Execute third step
    console.log('\n--- Step 3: Generate Insights ---');
    const step3Result = await workflowManager.executeWorkflowStep(
      workflowId,
      2,
      workflowParams,
      { __lastStepResult: step2Result }
    );
    
    if (!step3Result.success) {
      console.error(`❌ Step 3 failed: ${step3Result.error}`);
      return;
    }
    
    console.log(`✅ Step 3 completed successfully`);
    console.log(`Insights saved to: ${step3Result.filePath}`);
    
    // Print insights summary
    console.log('\n=== INSIGHTS SUMMARY ===');
    console.log(`Summary: ${step3Result.insights.summary}`);
    console.log(`Top Lead Source: ${step3Result.insights.leadSources.topSource}`);
    console.log(`Fastest Moving: ${step3Result.insights.inventoryHealth.fastestMoving}`);
    console.log(`Top Performer: ${step3Result.insights.salesPerformance.topPerformer}`);
    console.log('\nOpportunities:');
    step3Result.insights.opportunities.forEach((opp, i) => {
      console.log(`${i + 1}. ${opp}`);
    });
    
    console.log('\n=== WORKFLOW COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('\n❌ Workflow execution failed:');
    console.error(error);
  }
}

// Run the test
testEmailCRMWorkflow().catch(console.error);
