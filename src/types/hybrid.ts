export interface PlatformSelector {
  username: string;
  password: string;
  loginButton: string;
  otpInput?: string;
  otpSubmit?: string;
  reportsLink?: string;
  customerReports?: string;
  downloadButton?: string;
  reportsTab?: string;
  downloadReport?: string;
}
export interface PlatformConfig {
  baseUrl: string;
  selectors: PlatformSelector;
  hasOTP: boolean;
}
export interface PlatformConfigs {
  [platform: string]: PlatformConfig;
}
export interface HybridIngestOptions {
  downloadDir?: string;
  useSampleData?: boolean;
  maxRetries?: number;
  retryInterval?: number;
}
export interface ReportResult {
  success: boolean;
  filePath?: string;
  error?: string;
  method: 'email' | 'browser' | 'sample';
  platform: string;
  timestamp: Date;
}
