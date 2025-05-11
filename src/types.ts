/**
 * Common type definitions for the project
 */

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
  Unknown = 'unknown'
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