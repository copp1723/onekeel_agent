// Test script for CRM report extraction
const axios = require('axios');

/**
 * Tests the CRM report extraction functionality
 */
async function testCRMReport() {
  try {
    console.log('Testing CRM Report Extraction');
    console.log('-----------------------------');
    
    // Test direct CRM report extraction
    console.log('\n1. Testing direct CRM report extraction:');
    const response1 = await axios.post('http://localhost:5000/submit-task', {
      task: 'Fetch yesterday\'s sales report from VinSolutions for dealer ABC123'
    });
    
    console.log('Response status:', response1.status);
    console.log('Response data:', JSON.stringify(response1.data, null, 2));
    
    // Test multi-step workflow with login first
    console.log('\n2. Testing multi-step workflow with login first:');
    const response2 = await axios.post('http://localhost:5000/submit-task', {
      task: 'Login to dealer ABC123 and get yesterday\'s sales report from VinSolutions'
    });
    
    console.log('Response status:', response2.status);
    console.log('Task ID:', response2.data.taskId);
    
    // Poll for results
    const taskId = response2.data.taskId;
    let complete = false;
    let attempts = 0;
    
    while (!complete && attempts < 10) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const statusResponse = await axios.get(`http://localhost:5000/api/tasks/${taskId}`);
      const status = statusResponse.data.status;
      
      console.log(`Polling attempt ${attempts}, status: ${status}`);
      
      if (status === 'completed' || status === 'failed') {
        complete = true;
        console.log('Final result:', JSON.stringify(statusResponse.data, null, 2));
      }
    }
    
    if (!complete) {
      console.log('Task did not complete in the expected time');
    }
    
  } catch (error) {
    console.error('Error testing CRM report:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testCRMReport().catch(console.error);