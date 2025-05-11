export function extractAndSummarize(url: any): Promise<{
    url: any;
    originalContent: any;
    summary: any;
    stats: {
        originalLength: any;
        summaryLength: any;
        compressionRatio: string;
    };
    steps: {
        name: string;
        status: string;
    }[];
}>;
