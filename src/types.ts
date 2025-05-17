/**
 * Common type definitions for the project
 */
// Module declarations for JSON imports
declare module '*.json' {
  const content: any;
  export default content;
}
/**
 * Flow step interface for Playwright automation
 */
export interface FlowStep {
  action: string;
  selector?: string;
  value?: string;
  args?: string[];
  rowSelector?: string;
  buttonSelector?: string;
  saveAs?: string;
  clickAfter?: string;
}
/**
 * Type for environment variables map
 */
export type EnvVars = Record<string, string>;
/**
 * CRM Platform type
 */
export type CRMPlatform = 'VinSolutions' | 'VAUTO';
/**
 * CRM Report options
 */
export interface CRMReportOptions {
  platform: string;
  dealerId: string;
  reportType?: string;
  dateRange?: string;
}
/**
 * Task types enumeration
 */
export enum TaskType {
  CrawlWebsite = 'crawlWebsite',
  ExtractContent = 'extractContent',
  SummarizeText = 'summarizeText',
  FlightStatus = 'flightStatus',
  DealerLogin = 'dealerLogin',
  FetchCRMReport = 'fetchCRMReport',
  MultiStep = 'multiStep',
  WebCrawling = 'webCrawling',
  WebContentExtraction = 'webContentExtraction',
  VehicleData = 'vehicleData',
  Unknown = 'unknown',
}
/**
 * Task type for crawler
 */
export interface CrawlWebsiteArgs {
  url: string;
  depth?: number;
  maxPages?: number;
  excludeUrls?: string[];
  includeUrls?: string[];
  [key: string]: any; // Allow for additional properties to prevent type errors
}
/**
 * Task type for flight status check
 */
export interface CheckFlightStatusArgs {
  flightNumber: string;
  date?: string;
  [key: string]: any; // Allow for additional properties to prevent type errors
}
/**
 * Platform configuration for CRM automation
 */
export interface PlatformConfig {
  loginSteps: FlowStep[];
  otpStep?: FlowStep;
  navigationSteps: FlowStep[];
  downloadSteps: FlowStep[];
}
/**
 * Error handling types
 */
export interface AppErrorContext {
  [key: string]: any;
}
export interface AppError extends Error {
  code: string;
  statusCode: number;
  readonly context: AppErrorContext;
  isOperational: boolean;
}
/**
 * Database schema types
 */
// Workflow related types
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  status: WorkflowStatus;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  dealerId?: string;
  platform?: string;
  intent?: string;
  lockedAt?: Date;
}
export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
export interface WorkflowStep {
  id: string;
  workflowId: string;
  type: StepType;
  config: Record<string, any>;
  status: StepStatus;
  order: number;
  result?: Record<string, any>;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
export enum StepType {
  EMAIL_INGESTION = 'emailIngestion',
  BROWSER_ACTION = 'browserAction',
  DATA_PROCESSING = 'dataProcessing',
  INSIGHT_GENERATION = 'insightGeneration',
  API = 'api',
  CUSTOM = 'custom',
}
export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}
// Report related types
export interface Report {
  id: string;
  sourceId: string;
  filePath: string;
  jsonPath: string;
  recordCount: number;
  vendor: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}
export interface ReportSource {
  id: string;
  type: string;
  vendor: string;
  dealerId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}
export interface Insight {
  id: string;
  reportId: string;
  title: string;
  description: string;
  summary: string;
  actionItems: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}
// Email related types
export interface EmailNotificationConfig {
  enabled: boolean;
  recipientEmail: string;
  notifyOnCompletion: boolean;
  notifyOnFailure: boolean;
  includeResults: boolean;
  customMessage?: string;
}
export interface EmailRecipient {
  email: string;
  name?: string;
}
export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}
export interface EmailSendOptions {
  from: EmailRecipient;
  to: EmailRecipient;
  content: EmailContent;
  attachments?: EmailAttachment[];
}
export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}
export interface EmailLog {
  id: string;
  recipientEmail: string;
  subject: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
// User credential types
export interface UserCredential {
  id: string;
  userId: string;
  platform: string;
  label: string;
  encryptedData: string;
  iv: string;
  dealerId: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
}
// Circuit breaker types
export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}
export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenSuccessThreshold: number;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}
// Queue and job types
export interface QueueOptions {
  name: string;
  concurrency?: number;
  limiter?: {
    max: number;
    duration: number;
  };
}
export interface JobData {
  type: string;
  payload: Record<string, any>;
}
export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}
// Schedule types
export interface Schedule {
  id: string;
  name: string;
  workflowId: string;
  cronExpression: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}
// Parser types
export enum FileType {
  CSV = 'csv',
  XLSX = 'xlsx',
  PDF = 'pdf',
  JSON = 'json',
  UNKNOWN = 'unknown',
}
export interface ParsedData {
  id: string;
  records: Record<string, any>[];
  recordCount: number;
  metadata: {
    fileName: string;
    parseDate: string;
    [key: string]: any;
  };
}
// Step result type
export interface StepResult {
  output: any;
  stepId?: string;
  error?: Error;
}
