
import { EmailSendOptions } from './mailerService';
import { db } from '../shared/db.js';
import { emailQueue } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface QueuedEmail {
  id: string;
  options: EmailSendOptions;
  attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailQueue {
  private static instance: EmailQueue;
  private isProcessing: boolean = false;
  private maxRetries: number = 3;
  private retryDelay: number = 5000; // 5 seconds

  private constructor() {}

  static getInstance(): EmailQueue {
    if (!EmailQueue.instance) {
      EmailQueue.instance = new EmailQueue();
    }
    return EmailQueue.instance;
  }

  async enqueue(options: EmailSendOptions): Promise<string> {
    const id = uuidv4();
    
    await db.insert(emailQueue).values({
      id,
      options: JSON.stringify(options),
      attempts: 0,
      status: 'pending',
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
          .from(emailQueue)
          .where(eq(emailQueue.status, 'pending'))
          .orderBy(emailQueue.createdAt)
          .limit(1);

        if (!email) {
          break; // No more emails to process
        }

        // Mark as processing
        await db
          .update(emailQueue)
          .set({ 
            status: 'processing',
            updatedAt: new Date()
          })
          .where(eq(emailQueue.id, email.id));

        try {
          const options = JSON.parse(email.options);
          // Send email using mailerService
          await this.sendEmail(options);

          // Mark as completed
          await db
            .update(emailQueue)
            .set({ 
              status: 'completed',
              updatedAt: new Date()
            })
            .where(eq(emailQueue.id, email.id));

        } catch (error) {
          const attempts = email.attempts + 1;
          const status = attempts >= this.maxRetries ? 'failed' : 'pending';
          
          await db
            .update(emailQueue)
            .set({ 
              status,
              attempts,
              error: error instanceof Error ? error.message : String(error),
              updatedAt: new Date()
            })
            .where(eq(emailQueue.id, email.id));

          if (status === 'pending') {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendEmail(options: EmailSendOptions): Promise<void> {
    // Implementation will depend on your mailer service
    // This is a placeholder for the actual email sending logic
    throw new Error('sendEmail method must be implemented');
  }

  async getStatus(id: string): Promise<QueuedEmail | null> {
    const [email] = await db
      .select()
      .from(emailQueue)
      .where(eq(emailQueue.id, id));
    
    return email ? {
      ...email,
      options: JSON.parse(email.options)
    } : null;
  }
}

export const emailQueue = EmailQueue.getInstance();
