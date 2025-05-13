
import { EmailSendOptions, sendEmail as sendEmailService } from './mailerService.js';
import { db } from '../shared/db.js';
import { emailQueue as emailQueueTable } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface QueuedEmail {
  id: string;
  options: EmailSendOptions;
  attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailQueueOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffFactor?: number;
}

export class EmailQueueService {
  private static instance: EmailQueueService;
  private isProcessing: boolean = false;
  private maxRetries: number = 3;
  private retryDelay: number = 5000; // 5 seconds in milliseconds
  private backoffFactor: number = 2; // Exponential backoff factor

  private constructor(options?: EmailQueueOptions) {
    if (options) {
      if (options.maxRetries !== undefined) this.maxRetries = options.maxRetries;
      if (options.retryDelay !== undefined) this.retryDelay = options.retryDelay;
      if (options.backoffFactor !== undefined) this.backoffFactor = options.backoffFactor;
    }
  }

  static getInstance(options?: EmailQueueOptions): EmailQueueService {
    if (!EmailQueueService.instance) {
      EmailQueueService.instance = new EmailQueueService(options);
    }
    return EmailQueueService.instance;
  }

  async enqueue(options: EmailSendOptions): Promise<string> {
    const id = uuidv4();

    // Extract email data from options
    const to = Array.isArray(options.to) ? options.to[0] : options.to;

    await db.insert(emailQueueTable).values({
      id,
      recipientEmail: to.email,
      subject: options.content.subject,
      body: options.content.text || '',
      htmlBody: options.content.html || null,
      options: JSON.stringify(options),
      attempts: 0,
      status: 'pending',
      maxAttempts: this.maxRetries,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue().catch(console.error);
    }

    return id;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;

      while (true) {
        // Get next pending email
        const [email] = await db
          .select()
          .from(emailQueueTable)
          .where(eq(emailQueueTable.status, 'pending'))
          .orderBy(emailQueueTable.createdAt)
          .limit(1);

        if (!email) {
          break; // No more emails to process
        }

        // Mark as processing
        await db
          .update(emailQueueTable)
          .set({
            status: 'processing',
            updatedAt: new Date()
          })
          .where(eq(emailQueueTable.id, email.id));

        try {
          const options = JSON.parse(email.options as string);
          // Send email using mailerService
          await this.sendEmail(options);

          // Mark as completed
          await db
            .update(emailQueueTable)
            .set({
              status: 'completed',
              updatedAt: new Date()
            })
            .where(eq(emailQueueTable.id, email.id));

        } catch (error) {
          const attempts = (email.attempts as number) + 1;
          const status = attempts >= this.maxRetries ? 'failed' : 'pending';

          // Calculate exponential backoff delay
          const retryDelay = this.calculateBackoff(attempts);

          await db
            .update(emailQueueTable)
            .set({
              status,
              attempts,
              lastError: error instanceof Error ? error.message : String(error),
              updatedAt: new Date(),
              // Add processAfter field for delayed retry
              processAfter: status === 'pending' ? new Date(Date.now() + retryDelay) : null
            })
            .where(eq(emailQueueTable.id, email.id));

          if (status === 'pending') {
            // Log retry information
            console.log(`Email ${email.id} failed, will retry in ${retryDelay/1000}s (attempt ${attempts}/${this.maxRetries})`);

            // Wait before continuing to next email
            await new Promise(resolve => setTimeout(resolve, Math.min(retryDelay, this.retryDelay)));
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Calculate exponential backoff delay based on attempt number
   */
  private calculateBackoff(attempt: number): number {
    return Math.min(
      // Cap at 1 hour to prevent extremely long delays
      60 * 60 * 1000,
      // Exponential backoff: baseDelay * (factor ^ attempt)
      this.retryDelay * Math.pow(this.backoffFactor, attempt - 1)
    );
  }

  /**
   * Send an email using the mailer service
   */
  private async sendEmail(options: EmailSendOptions): Promise<void> {
    try {
      await sendEmailService(options);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Get the status of an email in the queue
   */
  async getStatus(id: string): Promise<QueuedEmail | null> {
    const [email] = await db
      .select()
      .from(emailQueueTable)
      .where(eq(emailQueueTable.id, id));

    if (!email) return null;

    return {
      id: email.id,
      options: JSON.parse(email.options as string),
      attempts: email.attempts as number,
      status: email.status as 'pending' | 'processing' | 'completed' | 'failed',
      error: email.lastError || '',
      createdAt: email.createdAt as Date,
      updatedAt: email.updatedAt as Date
    };
  }

  /**
   * Manually retry a failed email
   */
  async retryEmail(id: string): Promise<boolean> {
    const [email] = await db
      .select()
      .from(emailQueueTable)
      .where(eq(emailQueueTable.id, id));

    if (!email || email.status !== 'failed') {
      return false;
    }

    try {
      // Reset the email for retry
      const updateQuery = db.update(emailQueueTable);

      updateQuery.set({
        status: 'pending',
        attempts: 0,
        lastError: null,
        updatedAt: new Date(),
        processAfter: null
      });

      await updateQuery.where(eq(emailQueueTable.id, id));

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue().catch(console.error);
      }

      return true;
    } catch (error) {
      console.error('Failed to retry email:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const emailQueue = EmailQueueService.getInstance();
