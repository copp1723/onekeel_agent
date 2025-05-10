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
export declare function crawlWebsite(apiKey: string): {
    name: string;
    description: string;
    schema: {
        type: string;
        function: {
            name: string;
            description: string;
            parameters: {
                type: string;
                properties: {
                    url: {
                        type: string;
                        description: string;
                    };
                    selector: {
                        type: string;
                        description: string;
                    };
                    depth: {
                        type: string;
                        description: string;
                    };
                    extractFields: {
                        type: string;
                        items: {
                            type: string;
                        };
                        description: string;
                    };
                };
                required: string[];
            };
        };
    };
    handler: (args: CrawlWebsiteArgs) => Promise<any>;
};
export {};
