/**
 * Email Templates Service
 * Provides templates for various email types in the application
 */
interface TemplateData {
    workflowId: string;
    workflowStatus: string;
    summary?: string;
    insights?: any[];
    createdAt: Date;
    completedAt?: Date;
    error?: string;
    [key: string]: any;
}
/**
 * Generate a workflow summary email (HTML)
 */
export declare function generateWorkflowSummaryHtml(data: TemplateData): string;
/**
 * Generate a workflow summary email (plain text)
 */
export declare function generateWorkflowSummaryText(data: TemplateData): string;
export {};
