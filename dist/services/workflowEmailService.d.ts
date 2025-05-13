interface EmailNotificationConfig {
    recipientEmail: string;
    sendOnCompletion?: boolean;
    sendOnFailure?: boolean;
}
interface EmailResult {
    success: boolean;
    message?: string;
    emailId?: string;
}
export declare function configureNotification(workflowId: string, config: EmailNotificationConfig): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    workflowId: string | null;
    recipientEmail: string;
    sendOnCompletion: boolean;
    sendOnFailure: boolean;
}>;
export declare function getNotificationSettings(workflowId: string): Promise<{
    id: string;
    workflowId: string | null;
    recipientEmail: string;
    sendOnCompletion: boolean;
    sendOnFailure: boolean;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function deleteNotification(workflowId: string): Promise<{
    success: boolean;
    deleted: boolean;
}>;
export declare function getEmailLogs(workflowId: string): Promise<{
    id: string;
    workflowId: string | null;
    recipientEmail: string;
    subject: string;
    status: string;
    attempts: number;
    sentAt: Date | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
}[]>;
export declare function retryEmail(emailLogId: string): Promise<EmailResult>;
export declare function sendWorkflowEmail(workflowId: string, recipientEmail: string): Promise<EmailResult>;
export {};
