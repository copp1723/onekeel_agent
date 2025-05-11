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
 * Main function to execute a platform-specific flow
 * @param platform - The platform name to execute (e.g., "VinSolutions", "VAUTO")
 * @param envVars - Environment variables needed for the flow
 * @returns Path to the downloaded file
 */
export declare function runFlow(platform: string, envVars: Record<string, string>): Promise<string>;
