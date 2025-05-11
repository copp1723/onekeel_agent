# Config-Driven Playwright Agent Runner

This document describes the implementation of a generic, config-driven Playwright automation engine for CRM report extraction.

## Overview

The implementation allows executing multi-step automation flows (login → optional OTP → navigation → report download) for different CRM platforms using JSON configuration files instead of hardcoded flows.

Key benefits:
- Support multiple CRM platforms (VinSolutions, VAUTO) without code changes
- Define workflows in configuration rather than code
- Easy to add new platforms without modifying the core engine
- Centralized browser lifecycle and error handling

## Implementation Details

The implementation consists of these key components:

### 1. Platform Configurations

Located in `configs/platforms.json`, these configurations define the steps needed for each platform:

```json
{
  "VinSolutions": {
    "loginSteps": [...],
    "otpStep": {...},
    "navigationSteps": [...],
    "downloadSteps": [...]
  },
  "VAUTO": {
    "loginSteps": [...],
    "navigationSteps": [...],
    "downloadSteps": [...]
  }
}
```

Each step has an `action` and other properties like `selector`, `value`, etc. Environment variables are interpolated using `{{VAR_NAME}}` syntax.

### 2. runFlow Execution Engine

Located in `src/agents/runFlow.ts`, this is the core of the implementation:

```typescript
export async function runFlow(platform: string, envVars: Record<string, string>): Promise<string>
```

This function:
- Loads the platform-specific configuration
- Validates environment variables
- Launches a browser
- Executes steps in sequence (login → OTP → navigation → download)
- Handles errors with retries
- Ensures browser cleanup

### 3. fetchCRMReport Interface

Located in `src/agents/fetchCRMReport.ts`, this provides a simpler interface:

```typescript
export async function fetchCRMReport(options: CRMReportOptions): Promise<string>
```

This function:
- Takes platform, dealerId, and other options
- Validates platform support
- Gets required environment variables
- Calls the runFlow function with appropriate parameters
- Returns the path to the downloaded report file

### 4. fetchCRMReportTool Integration

Located in `src/tools/fetchCRMReport.ts`, this integrates with the agent framework:

```typescript
export function fetchCRMReportTool(): EkoTool
```

This tool:
- Exposes the functionality to the agent system
- Handles parameter validation
- Processes the downloaded report into usable data
- Returns a structured response with report details

## Environment Variables

The implementation requires these environment variables:

For VinSolutions:
- `VIN_SOLUTIONS_USERNAME` - VinSolutions login username
- `VIN_SOLUTIONS_PASSWORD` - VinSolutions login password
- `OTP_EMAIL_USER` - Email account for OTP code retrieval
- `OTP_EMAIL_PASS` - Email account password

For VAUTO:
- `VAUTO_USERNAME` - VAUTO login username
- `VAUTO_PASSWORD` - VAUTO login password

## Key Features

1. **Browser Lifecycle Management**:
   ```typescript
   const browser = await chromium.launch({ headless: true });
   const page = await browser.newPage();
   try {
     // Execute steps
   } finally {
     await browser.close(); // Always close the browser
   }
   ```

2. **Retry Logic**:
   ```typescript
   const MAX_RETRIES = 1;
   for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
     try {
       // Execute steps
       return result;
     } catch (error) {
       if (attempt === MAX_RETRIES) throw error;
       // Wait and retry
     }
   }
   ```

3. **Environment Variable Validation**:
   ```typescript
   const missingVars: string[] = [];
   placeholders.forEach(placeholder => {
     if (!envVars[placeholder]) {
       missingVars.push(placeholder);
     }
   });
   
   if (missingVars.length > 0) {
     throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
   }
   ```

4. **Variable Interpolation**:
   ```typescript
   function interpolateVariables(text: string, envVars: Record<string, string>): string {
     return text.replace(/\{\{([A-Z_]+)\}\}/g, (match, varName) => {
       return envVars[varName] || match;
     });
   }
   ```

## Testing

The implementation includes test scripts:

1. `test-crm-flow.ts` - Tests the full flow for both platforms
2. `src/test-playwright-config.js` - Simple test for configuration loading and browser launch

## Usage Example

```typescript
// Get a CRM report from VinSolutions
const filePath = await fetchCRMReport({
  platform: 'VinSolutions',
  dealerId: 'ABC123'
});

// Parse the report data
const reportData = await parseCRMReport(filePath);

// Do something with the data
console.log(`Report has ${reportData.totalRecords} records`);
```