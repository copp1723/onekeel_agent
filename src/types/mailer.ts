export interface MailerConfig {
  provider: 'sendgrid' | 'nodemailer';
  apiKey: string | null;
  defaultFrom: string;
  defaultFromName: string;
  useNodemailerFallback: boolean;
  testAccount: any | null;
}

export interface EmailContent {
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailParams {
  to: string | EmailRecipient | (string | EmailRecipient)[];
  from?: string | EmailRecipient;
  content: EmailContent;
  workflowId?: string;
  logId?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  previewUrl?: string;
  logId?: string;
}
