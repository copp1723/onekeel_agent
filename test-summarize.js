import { summarizeText } from './src/tools/summarizeText.ts';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSummarization() {
  try {
    console.log('Testing summarization tool...');
    
    // Create the summarizeText tool
    const summarizeTool = summarizeText('dummy-key'); // API key comes from env now
    
    // Test with a simple text
    const testText = `
      OpenAI is an American artificial intelligence research laboratory consisting of the non-profit 
      OpenAI Incorporated and its for-profit subsidiary OpenAI Limited Partnership. OpenAI conducts 
      AI research with the declared intention of developing "safe and beneficial" artificial general 
      intelligence, which they define as "highly autonomous systems that outperform humans at most 
      economically valuable work".
    `;
    
    console.log('Calling summarizeText with sample text...');
    const result = await summarizeTool.handler({ text: testText });
    
    console.log('Summarization result:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testSummarization();