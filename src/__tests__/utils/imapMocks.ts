/**
 * IMAP Client Mock Utilities
 *
 * This file provides mock implementations for IMAP clients used in the application.
 * It includes mocks for both imap-simple and ImapFlow libraries, ensuring that
 * the mock implementations match the actual method signatures and behavior.
 *
 * These mocks can be used in tests to simulate IMAP client behavior without
 * connecting to actual IMAP servers.
 */

import { vi } from 'vitest';
import type { ImapSimple } from 'imap-simple';
import type { ImapFlow } from 'imapflow';

/**
 * Type for email message parts used in imap-simple
 */
export interface MessagePart {
  which: string;
  size: number;
  body: string;
}

/**
 * Type for email message attributes used in imap-simple
 */
export interface MessageAttributes {
  uid: number;
  flags: string[];
  date: Date;
  size: number;
}

/**
 * Type for email message used in imap-simple
 */
export interface Message {
  attributes: MessageAttributes;
  parts: MessagePart[];
  seqno?: number;
}

/**
 * Creates a mock imap-simple client with all required methods
 *
 * @returns A mock imap-simple client that can be used in tests
 */
export function createMockImapSimpleClient(): ImapSimple {
  return {
    // Core methods
    openBox: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
    end: vi.fn().mockResolvedValue(undefined),

    // Message operations
    append: vi.fn().mockResolvedValue(undefined),
    addFlags: vi.fn().mockResolvedValue(undefined),
    delFlags: vi.fn().mockResolvedValue(undefined),
    setFlags: vi.fn().mockResolvedValue(undefined),
    addKeywords: vi.fn().mockResolvedValue(undefined),
    delKeywords: vi.fn().mockResolvedValue(undefined),
    setKeywords: vi.fn().mockResolvedValue(undefined),

    // Mailbox operations
    getBoxes: vi.fn().mockResolvedValue({}),
    moveMessage: vi.fn().mockResolvedValue(undefined),
    deleteMessage: vi.fn().mockResolvedValue(undefined),
    copyMessage: vi.fn().mockResolvedValue(undefined),

    // Underlying IMAP object
    imap: {
      on: vi.fn(),
      once: vi.fn(),
      emit: vi.fn(),
      removeListener: vi.fn(),
      state: 'authenticated',
    },
  } as unknown as ImapSimple;
}

/**
 * Creates a mock ImapFlow client with all required methods
 *
 * @returns A mock ImapFlow client that can be used in tests
 */
export function createMockImapFlowClient(): ImapFlow {
  return {
    // Connection methods
    connect: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),

    // Mailbox operations
    getMailboxLock: vi.fn().mockImplementation(async () => ({
      release: vi.fn().mockResolvedValue(undefined),
    })),
    mailboxOpen: vi.fn().mockResolvedValue({}),
    mailboxClose: vi.fn().mockResolvedValue(undefined),

    // Message operations
    search: vi.fn().mockResolvedValue([]),
    fetchOne: vi.fn().mockResolvedValue(null),
    fetch: vi.fn().mockImplementation(async function* () {}),
    download: vi.fn().mockResolvedValue(Buffer.from('')),

    // Message manipulation
    messageDelete: vi.fn().mockResolvedValue(undefined),
    messageMove: vi.fn().mockResolvedValue(undefined),
    messageCopy: vi.fn().mockResolvedValue(undefined),
    messageFlags: vi.fn().mockResolvedValue(undefined),

    // Event handlers
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),

    // Status properties
    authenticated: true,
    usable: true,
  } as unknown as ImapFlow;
}

/**
 * Mock for imap-simple.connect function
 *
 * @param _options - Connection options
 * @returns A mock imap-simple client
 */
export function mockImapSimpleConnect(_options?: unknown): Promise<ImapSimple> {
  return Promise.resolve(createMockImapSimpleClient());
}

/**
 * Creates a sample email message for testing
 *
 * @param uid - Message UID
 * @param subject - Email subject
 * @param body - Email body
 * @param _attachmentFilename - Optional attachment filename
 * @returns A mock email message
 */
export function createSampleMessage(
  uid: number,
  subject: string,
  body: string,
  _attachmentFilename?: string
): Message {
  return {
    attributes: {
      uid,
      flags: [],
      date: new Date(),
      size: body.length,
    },
    parts: [
      {
        which: 'HEADER',
        size: 100,
        body: `Subject: ${subject}\r\nFrom: test@example.com\r\nTo: recipient@example.com\r\n`,
      },
      {
        which: 'TEXT',
        size: body.length,
        body,
      },
      {
        which: '',
        size: body.length + 200,
        body: `Subject: ${subject}\r\nFrom: test@example.com\r\nTo: recipient@example.com\r\n\r\n${body}`,
      },
    ],
  };
}
