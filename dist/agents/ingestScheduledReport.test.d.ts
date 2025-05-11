/**
 * Tests for the ingestScheduledReport module
 */
import { ingestScheduledReport, ReportNotFoundError, tryFetchReportFromEmail } from './ingestScheduledReport.js';
export declare const testModule: {
    ingestScheduledReport: typeof ingestScheduledReport;
    ReportNotFoundError: typeof ReportNotFoundError;
    tryFetchReportFromEmail: typeof tryFetchReportFromEmail;
};
