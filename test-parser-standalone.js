/**
 * Standalone test script for the fixed task parser
 * No database dependencies
 */
import { parseTaskDirect, TaskType } from './src/services/taskParser-fix.js';

// Test cases - focusing on sales report requests
const TEST_CASES = [
  {
    description: "Standard VinSolutions request",
    task: "Fetch yesterday's sales report from VinSolutions for dealer ABC123"
  },
  {
    description: "Alternative phrasing with 'get'",
    task: "Get the sales report from VinSolutions for dealership XYZ456"
  },
  {
    description: "Alternative phrasing with 'pull'",
    task: "Pull yesterday's sales report from VinSolutions for dealer DEF789"
  },
  {
    description: "No verb, just keywords",
    task: "VinSolutions sales report for dealer GHI101112"
  },
  {
    description: "Different order of keywords",
    task: "Sales report from VinSolutions for yesterday for dealer JKL131415"
  },
  {
    description: "Generic sales report (non-VinSolutions)",
    task: "Pull sales report for dealer MNO161718"
  }
];

// Run the tests
async function runTests() {
  console.log("=== TASK PARSER STANDALONE TEST ===");
  console.log("Using parser from: src/services/taskParser-fix.js");
  console.log("-------------------------------------");
  
  for (const testCase of TEST_CASES) {
    console.log(`\nTesting: ${testCase.description}`);
    console.log(`Input: "${testCase.task}"`);
    
    try {
      const result = await parseTaskDirect(testCase.task);
      
      console.log("Result:", JSON.stringify(result, null, 2));
      
      // Check if it correctly identified a CRM report
      if (result.type === TaskType.FetchCRMReport) {
        console.log("✓ PASS: Correctly identified as CRM report");
        console.log(`  Site: ${result.parameters.site}`);
        console.log(`  Dealer ID: ${result.parameters.dealerId}`);
      } else {
        console.log(`✗ FAIL: Not identified as CRM report. Type: ${result.type}`);
      }
    } catch (error) {
      console.error("Error parsing task:", error);
    }
  }
}

// Run the tests
runTests().catch(console.error);