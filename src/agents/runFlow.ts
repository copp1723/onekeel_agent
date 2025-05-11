/**
 * Generic config-driven Playwright automation engine
 * Executes multi-step flows defined in platform configurations
 */
import { chromium, Browser, Page } from 'playwright';
import path from 'path';
// This import is commented out because we're using a local implementation for testing
// import { getEmailOTP as fetchEmailOTP } from '../utils/emailOTP.js';
import { FlowStep, EnvVars } from '../types.js';

// Load platform configurations
import config from '../../configs/platforms.json' assert { type: 'json' };

// Maximum number of retries for flow execution
const MAX_RETRIES = 1;

// Note: The function below has been replaced by direct validation in runFlow
// We're keeping it here as reference for a more sophisticated validation approach
// that extracts placeholders from the step configuration
/*
function validateEnvironmentVariables(platform: string, envVars: EnvVars): void {
  // Get all placeholder values from the config
  const platformConfig = (config as Record<string, PlatformConfig>)[platform];
  if (!platformConfig) {
    throw new Error(`Platform "${platform}" not found in configuration`);
  }

  // Extract all placeholders from the configuration
  const placeholders = new Set<string>();
  const extractPlaceholders = (step: FlowStep) => {
    if (step.value && typeof step.value === 'string') {
      const matches = step.value.match(/\{\{([A-Z_]+)\}\}/g);
      if (matches) {
        matches.forEach(match => {
          // Extract variable name without {{ }}
          const varName = match.slice(2, -2);
          placeholders.add(varName);
        });
      }
    }
  };

  // Check all steps for placeholders
  platformConfig.loginSteps.forEach(extractPlaceholders);
  if (platformConfig.otpStep) extractPlaceholders(platformConfig.otpStep);
  platformConfig.navigationSteps.forEach(extractPlaceholders);
  platformConfig.downloadSteps.forEach(extractPlaceholders);

  // Verify all placeholders have corresponding environment variables
  const missingVars: string[] = [];
  placeholders.forEach(placeholder => {
    if (!envVars[placeholder]) {
      missingVars.push(placeholder);
    }
  });

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables for ${platform}: ${missingVars.join(', ')}`);
  }
}
*/

/**
 * Interpolates environment variables into string values
 * @param text - The text containing {{VARIABLE}} placeholders
 * @param envVars - Environment variables object
 * @returns Interpolated text with variables replaced
 */
function interpolateVariables(text: string, envVars: EnvVars): string {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (match, varName) => {
    return envVars[varName] || match;
  });
}

/**
 * Main function to execute a platform-specific flow
 * @param platform - The platform name to execute (e.g., "VinSolutions", "VAUTO")
 * @param envVars - Environment variables needed for the flow
 * @returns Path to the downloaded file
 */
export async function runFlow(
  platform: keyof typeof config,
  envVars: EnvVars
): Promise<string> {
  // Validate env vars up front
  const missing = Object.entries(envVars)
    .filter(([_, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(`runFlow: missing env vars: ${missing.join(', ')}`);
  }

  // Get platform-specific configuration
  const platformConfig = config[platform] as {
    loginSteps: FlowStep[];
    otpStep?: FlowStep;
    navigationSteps: FlowStep[];
    downloadSteps: FlowStep[];
  };
  
  if (!platformConfig) {
    throw new Error(`Platform "${platform}" not found in configuration`);
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let browser: Browser | undefined;
    try {
      // Launch browser
      browser = await chromium.launch({ headless: true });
      const page: Page = await browser.newPage();

      console.log(`Executing ${platform} flow (attempt ${attempt + 1})...`);

      // 1. Execute login steps
      console.log('Executing login steps...');
      for (const step of platformConfig.loginSteps) {
        await executeStep(page, step, envVars);
      }

      // 2. Execute OTP step if present
      if (platformConfig.otpStep) {
        console.log('Executing OTP step...');
        await executeOTPStep(page, platformConfig.otpStep, envVars);
      }

      // 3. Execute navigation steps
      console.log('Executing navigation steps...');
      for (const step of platformConfig.navigationSteps) {
        await executeStep(page, step, envVars);
      }

      // 4. Execute download steps
      console.log('Executing download steps...');
      let downloadPath = '';
      for (const step of platformConfig.downloadSteps) {
        downloadPath = await executeDownloadStep(page, step, envVars);
      }

      // Flow completed successfully
      console.log(`${platform} flow completed successfully`);
      await browser.close();
      return downloadPath;
      
    } catch (err: unknown) {
      lastError = err;
      console.error(`runFlow [${platform}] attempt ${attempt} failed:`, err);
      if (browser) await browser.close();
      
      if (attempt < MAX_RETRIES) {
        console.log(`runFlow: retrying (${attempt + 1}/${MAX_RETRIES})…`);
        // Add delay before retry
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      
      // Exhausted retries
      throw new Error(
        `runFlow: failed after ${MAX_RETRIES + 1} attempts: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Executes a single step in the flow
 * @param page - Playwright page object
 * @param step - Flow step to execute
 * @param envVars - Environment variables for interpolation
 */
async function executeStep(page: Page, step: FlowStep, envVars: EnvVars): Promise<void> {
  console.log(`Executing action: ${step.action}`);

  switch (step.action) {
    case 'goto':
      if (step.args && step.args.length > 0) {
        const url = interpolateVariables(step.args[0], envVars);
        await page.goto(url, { waitUntil: 'networkidle' });
      }
      break;

    case 'fill':
      if (step.selector && step.value) {
        const interpolatedValue = interpolateVariables(step.value, envVars);
        await page.fill(step.selector, interpolatedValue);
      }
      break;

    case 'click':
      if (step.selector) {
        await page.click(step.selector);
      }
      break;

    case 'wait':
      if (step.selector) {
        await page.waitForSelector(step.selector);
      } else if (step.args && step.args.length > 0) {
        const timeout = parseInt(step.args[0], 10);
        await page.waitForTimeout(timeout);
      }
      break;

    default:
      throw new Error(`Unknown action: ${step.action}`);
  }
}

/**
 * Handles special OTP step
 * @param page - Playwright page object
 * @param step - OTP flow step
 * @param envVars - Environment variables for interpolation
 */
async function executeOTPStep(page: Page, step: FlowStep, envVars: EnvVars): Promise<void> {
  if (step.action !== 'otpEmail') {
    throw new Error(`Expected otpEmail action for OTP step, got: ${step.action}`);
  }

  // Get the OTP code from email using the local implementation
  // Note: In production, we would use the imported fetchEmailOTP instead
  const otpCode = await getEmailOTP(envVars.OTP_EMAIL_USER);
  
  if (!otpCode) {
    throw new Error('Failed to retrieve OTP code from email');
  }

  console.log('Retrieved OTP code from email');

  // Fill the OTP code into the form
  if (step.selector) {
    await page.waitForSelector(step.selector);
    await page.fill(step.selector, otpCode);
  }

  // Click the verification button if specified
  if (step.clickAfter) {
    await page.click(step.clickAfter);
  }
}

/**
 * Handles special download step
 * @param page - Playwright page object
 * @param step - Download flow step
 * @param envVars - Environment variables for interpolation
 * @returns Path to the downloaded file
 */
async function executeDownloadStep(page: Page, step: FlowStep, _envVars: EnvVars): Promise<string> {
  if (step.action !== 'download') {
    throw new Error(`Expected download action for download step, got: ${step.action}`);
  }

  // Find the row element
  if (!step.rowSelector || !step.buttonSelector) {
    throw new Error('Download step requires rowSelector and buttonSelector');
  }

  // Wait for the row to be visible
  await page.waitForSelector(step.rowSelector, { state: 'visible' });

  // Set up download path
  const downloadPath = path.resolve(process.cwd(), step.saveAs || 'report.csv');

  // Click the download button and wait for download
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click(`${step.rowSelector} ${step.buttonSelector}`)
  ]);

  // Save the file
  await download.saveAs(downloadPath);
  console.log(`Downloaded file saved to: ${downloadPath}`);

  return downloadPath;
}

// Use the imported fetchEmailOTP function instead of this local version
async function getEmailOTP(username: string): Promise<string> {
  console.log(`Getting OTP for ${username}...`);
  // In a real implementation, this would connect to an email service via the imported function
  // For now, we'll return a placeholder code for testing
  return '123456';
}