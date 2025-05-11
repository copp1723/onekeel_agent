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
export declare enum TaskType {
    CrawlWebsite = "crawlWebsite",
    ExtractContent = "extractContent",
    SummarizeText = "summarizeText",
    FlightStatus = "flightStatus",
    DealerLogin = "dealerLogin",
    FetchCRMReport = "fetchCRMReport",
    Unknown = "unknown"
}
/**
 * Task type for crawler
 */
export interface CrawlWebsiteArgs {
    url: string;
    depth?: number;
    maxPages?: number;
}
/**
 * Task type for flight status check
 */
export interface CheckFlightStatusArgs {
    flightNumber: string;
    date?: string;
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
