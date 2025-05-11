// Simple test script to check if our task parser is generating errors correctly
import { parseTask } from './src/services/taskParser.ts';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testParserErrorHandling() {
  console.log("Testing parser error handling for tasks without URLs");
  
  const testCases = [
    "Summarize the latest blog posts",
    "Get me a summary of recent articles",
    "Extract content",
    "Crawl website"
  ];
  
  const apiKey = process.env.EKO_API_KEY || 'dummy-key';
  
  for (const testCase of testCases) {
    console.log("\n--- Test Case:", testCase, "---");
    
    try {
      const result = await parseTask(testCase, apiKey);
      console.log("Parser result:", JSON.stringify(result, null, 2));
      
      if (result.error) {
        console.log("✅ Error detected:", result.error);
      } else {
        console.log("❌ No error returned for task without URL");
      }
    } catch (error) {
      console.error("❌ Parser threw an exception:", error);
    }
  }
}

testParserErrorHandling();