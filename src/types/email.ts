export interface EmailConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  authTimeout?: number;
  keepalive?: {
    interval: number;
    idleInterval: number;
    forceNoop: boolean;
  };
}
export interface EmailSearchCriteria {
  criteria: Array<Array<string | Date>>;
  filePattern: RegExp;
}
export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}
export interface ParsedEmail {
  attachments?: EmailAttachment[];
  subject: string;
  from: string;
  to: string;
  date: Date;
  messageId: string;
}
