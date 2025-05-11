// Test script for the direct parser implementation
import { parseTaskDirect } from './src/services/taskParser-fix.js';

// Test cases
const testCases = [
  "Fetch yesterday's sales report from VinSolutions for dealer ABC123",
  "Get a sales report from my dealership",
  "I need the VinSolutions CRM report for dealer XYZ789",
  "Extract content from https://example.com"
];

console.log("Testing direct parser implementation...\n");

// Run test cases
testCases.forEach((task, index) => {
  console.log(`\n--- Test Case ${index + 1} ---`);
  console.log(`Task: "${task}"`);
  
  try {
    const result = parseTaskDirect(task);
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
  
  console.log("------------------------\n");
});

console.log("Direct parser tests completed.");