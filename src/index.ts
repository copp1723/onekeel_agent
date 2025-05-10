import dotenv from 'dotenv';
import { Eko, LLMs } from '@eko-ai/eko';
import { crawlWebsite } from './tools/crawlWebsite.js';
import { getApiKey } from './services/supabase.js';
import { logTask } from './shared/logger.js';
import { checkFlightStatus } from './tools/checkFlightStatus.js';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('Starting AI agent...');
    
    // Get the Firecrawl API key from Supabase
    let firecrawlApiKey = await getApiKey('firecrawl');
    if (!firecrawlApiKey) {
      console.log('⚠️ Firecrawl API key not found in Supabase database');
      console.log('Using default placeholder key for demonstration purposes.');
      console.log('To set a real key, run: npm run setup-key YOUR_FIRECRAWL_API_KEY');
      
      // For demonstration, use a placeholder key
      firecrawlApiKey = 'demo_firecrawl_key';
    }
    
    // Configure LLMs (using the default provider)
    const llms: LLMs = {
      default: {
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: process.env.EKO_API_KEY || '',
      }
    };
    
    // Initialize Eko agent with configurations
    const eko = new Eko({ 
      llms,
      agents: [], // Use default agents
      tools: [
        crawlWebsite(firecrawlApiKey),
        checkFlightStatus()
      ] // Register available tools
    });
    
    // Define a sample task
    const task = "Crawl https://news.ycombinator.com and extract the title, url, and score of the top 5 posts";
    
    console.log(`Executing task: "${task}"`);
    
    try {
      // Generate and execute the workflow
      const workflow = await eko.generate(task);
      const result = await eko.execute(workflow);
      
      // Log successful task execution
      await logTask({
        userInput: task,
        tool: 'crawlWebsite', // Ideally, we would detect this from the workflow
        status: 'success',
        output: result
      });
      
      console.log('Execution result:');
      console.log(JSON.stringify(result, null, 2));
    } catch (err: any) {
      console.error('Task execution failed:', err);
      
      // Log failed task execution
      await logTask({
        userInput: task,
        tool: 'crawlWebsite', // Ideally, we would detect this from the workflow
        status: 'error',
        output: { error: err.message || String(err) }
      });
    }
    
  } catch (error) {
    console.error('Error in AI agent:', error);
  }
}

main();
