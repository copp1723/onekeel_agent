export interface EkoTool {
    name: string;
    description: string;
    parameters: any;
    handler: (args: any) => Promise<any>;
}
/**
 * Creates an extractCleanContent tool that uses Python's trafilatura to extract clean text from webpages
 * @returns A tool object that can be registered with Eko
 */
export declare function extractCleanContent(): EkoTool;
