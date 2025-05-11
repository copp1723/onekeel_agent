import { parseTask } from './src/services/taskParser.js';

// Test various URL formats with our enhanced parser
async function testUrlExtraction() {
  console.log('Testing task parser with various URL formats...\n');
  
  const tasks = [
    // Full URLs
    'Extract and summarize content from https://www.example.com/article',
    'Crawl website https://news.ycombinator.com and get top stories',
    'Get clean content from https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    // Domain-only URLs
    'Extract content from example.com',
    'Summarize the content on developer.mozilla.org',
    'Crawl news.ycombinator.com',
    // URLs with trailing punctuation
    'Can you extract content from https://www.example.com/article?',
    'Please summarize content from https://developer.mozilla.org.',
    'Get information from https://github.com/facebook/react)',
    // Malformed requests - missing URLs
    'Extract and summarize content',
    'Get clean text from an article',
    'Crawl website and tell me what it says'
  ];
  
  for (const task of tasks) {
    console.log(`Task: "${task}"`);
    try {
      // Use a placeholder API key since we're just testing URL extraction
      const result = await parseTask(task, 'placeholder-key');
      console.log('  Type:', result.type);
      console.log('  Parameters:', JSON.stringify(result.parameters));
      if (result.error) {
        console.log('  Error:', result.error);
      }
      if (result.plan) {
        console.log('  Has plan:', !!result.plan);
      }
    } catch (error) {
      console.error('  Parser error:', error.message);
    }
    console.log('---');
  }
}

// Run the tests
testUrlExtraction();