import axios from 'axios';

// Define the interface for the tool arguments
interface CrawlWebsiteArgs {
  url: string;
  selector?: string;
  depth?: number;
  extractFields?: string[];
}

/**
 * Creates a crawlWebsite tool that uses Firecrawl to scrape websites
 * @param apiKey - The Firecrawl API key
 * @returns A tool object that can be registered with Eko
 */
export function crawlWebsite(apiKey: string) {
  return {
    name: 'crawlWebsite',
    description: 'Crawls a website and extracts structured data from web pages using Firecrawl API',
    schema: {
      type: 'function',
      function: {
        name: 'crawlWebsite',
        description: 'Crawls a website and extracts structured data from web pages',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to crawl'
            },
            selector: {
              type: 'string',
              description: 'CSS selector to target specific elements (optional)'
            },
            depth: {
              type: 'number',
              description: 'How many levels of links to follow (optional, default is 1)'
            },
            extractFields: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Fields to extract from the page (optional)'
            }
          },
          required: ['url']
        }
      }
    },
    handler: async (args: CrawlWebsiteArgs) => {
      try {
        const { url, selector, depth = 1, extractFields = [] } = args;
        
        console.log(`Crawling website: ${url}`);
        console.log(`Selector: ${selector || 'none'}`);
        console.log(`Depth: ${depth}`);
        console.log(`Extract fields: ${extractFields.length ? extractFields.join(', ') : 'none'}`);
        
        // Call the Firecrawl API
        const response = await axios({
          method: 'POST',
          url: 'https://api.firecrawl.dev/v1/crawl',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          data: {
            url,
            selector,
            depth,
            extractFields: extractFields.length > 0 ? extractFields : undefined
          }
        });
        
        console.log('Successfully crawled website');
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const statusCode = error.response?.status;
          const errorMessage = error.response?.data?.message || error.message;
          
          console.error(`Firecrawl API error (${statusCode}): ${errorMessage}`);
          throw new Error(`Firecrawl API error (${statusCode}): ${errorMessage}`);
        }
        
        console.error(`Failed to crawl website: ${(error as Error).message}`);
        throw new Error(`Failed to crawl website: ${(error as Error).message}`);
      }
    }
  };
}
