/**
 * Test Script for the Prompt Engine
 * 
 * This script tests the prompt engine utilities for listing, loading,
 * and analyzing with prompts.
 */

import { 
  loadPrompt, 
  analyzeWithPrompt, 
  listPrompts, 
  getPromptMetadata, 
  initializePrompts 
} from './src/utils/promptEngine.js';

async function testPromptEngine() {
  try {
    console.log("=== Prompt Engine Test ===");
    
    // Initialize prompts if needed
    console.log("Initializing prompts directory...");
    await initializePrompts();
    
    // List available prompts
    console.log("\nListing available prompts:");
    const promptFiles = await listPrompts();
    promptFiles.forEach(file => console.log(`- ${file}`));
    
    // Get prompt metadata
    console.log("\nGetting prompt metadata:");
    const metadata = await getPromptMetadata();
    console.log(JSON.stringify(metadata, null, 2));
    
    // Test loading a specific prompt
    console.log("\nLoading automotive-analyst.json:");
    const prompt = await loadPrompt('automotive-analyst.json');
    console.log(`Loaded ${prompt.name} v${prompt.version}`);
    console.log(`Description: ${prompt.description}`);
    
    console.log("\nPrompt engine test completed successfully.");
  } catch (error) {
    console.error("Error testing prompt engine:", error);
  }
}

// Run the test
testPromptEngine();