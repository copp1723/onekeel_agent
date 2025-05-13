export interface ParsedTask {
    id: string;
    type: string;
    title?: string;
    description?: string;
    steps?: string[];
    priority?: number;
    userId?: string;
    status?: string;
    planId?: string;
    parameters?: Record<string, any>;
    original?: string;
    metadata?: Record<string, any>;
    createdAt?: Date;
    context?: Record<string, any>;
}
export interface ParserResult {
    task: ParsedTask;
    executionPlan?: any;
    error?: string;
}
export declare class TaskParser {
    private eko;
    private logger;
    constructor(apiKey?: string, logger?: any);
    parseUserRequest(userInput: string): Promise<ParserResult>;
    private extractTaskInfo;
    private fallbackExtraction;
}
