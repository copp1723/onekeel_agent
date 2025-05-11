/**
 * Test for direct task parsing with the fixed server implementation
 */

// Simple HTTP client
const axios = require('axios');

// Our test tasks - focusing on VinSolutions CRM report requests
const testTasks = [
  {
    description: "Standard VinSolutions request",
    task: "Fetch yesterday's sales report from VinSolutions for dealer ABC123"
  },
  {
    description: "Alternative phrasing",
    task: "Get the sales report from VinSolutions for dealership XYZ456"
  },
  {
    description: "Generic sales report",
    task: "Pull sales report for yesterday from dealer ABC123"
  }
];

// Test server connection
async function testServerHealth() {
  try {
    const response = await axios.get('http://localhost:5000/health');
    console.log('Server health check:', response.data);
    return true;
  } catch (error) {
    console.error('Error connecting to server:', error.message);
    return false;
  }
}

// Test task parsing
async function testTaskParsing() {
  console.log('\n=== Testing Direct Task Parsing ===\n');
  
  // Check if server is running
  const isServerHealthy = await testServerHealth();
  if (!isServerHealthy) {
    console.error('Server is not running, please start the Fixed Server Demo workflow');
    return;
  }
  
  // Test each task
  for (const testCase of testTasks) {
    console.log(`\nTesting: ${testCase.description}`);
    console.log(`Task: "${testCase.task}"`);
    
    try {
      const response = await axios.post('http://localhost:5000/submit-task', {
        task: testCase.task
      });
      
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
      // Check if the task was correctly identified
      if (response.data.taskType === 'fetch_crm_report') {
        console.log('✅ Task correctly identified as CRM report request');
      } else {
        console.log('❌ Task not identified as CRM report request');
      }
    } catch (error) {
      console.error('Error submitting task:', error.message);
    }
  }
}

// Run the tests
testTaskParsing();