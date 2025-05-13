/**
 * Generic config-driven Playwright automation engine
 * Executes multi-step flows defined in platform configurations
 */
// Update import to use specific structures from playwright-core
import { chromium } from 'playwright-core';
import path from 'path';
// Import the proper emailOTP handler
import { getOTPFromEmail } from '../utils/emailOTP.js';

// Load platform configurations using dynamic import
// This works with Node16 module system
const config = await import('../../configs/platforms.json', { 
  assert: { type: 'json' } 
}).then(module => module.default);

// Maximum number of retries for flow execution
const MAX_RETRIES = 1;

/**
 * Interpolates environment variables into string values
 * @param {string} text - The text containing {{VARIABLE}} placeholders
 * @param {Object} envVars - Environment variables object
 * @returns {string} Interpolated text with variables replaced
 */
function interpolateVariables(text, envVars) {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (match, varName) => {
    return envVars[varName] || match;
  });
}

/**
 * Main function to execute a platform-specific flow
 * @param {string} platform - The platform name to execute (e.g., "VinSolutions", "VAUTO")
 * @param {Object} envVars - Environment variables needed for the flow
 * @returns {Promise<string>} Path to the downloaded file
 */
export async function runFlow(platform, envVars) {
  // Validate env vars up front
  const missing = Object.entries(envVars)
    .filter(([_, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(`runFlow: missing env vars: ${missing.join(', ')}`);
  }

  // Get platform-specific configuration
  const platformConfig = config[platform];
  
  if (!platformConfig) {
    throw new Error(`Platform "${platform}" not found in configuration`);
  }

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let browser;
    try {
      // Launch browser
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

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
      
    } catch (err) {
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

  // This should never be reached, but JS needs it
  throw lastError;
}

/**
 * Executes a single step in the flow
 * @param {Object} page - Playwright page object
 * @param {Object} step - Flow step to execute
 * @param {Object} envVars - Environment variables for interpolation
 */
async function executeStep(page, step, envVars) {
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
 * @param {Object} page - Playwright page object
 * @param {Object} step - OTP flow step
 * @param {Object} envVars - Environment variables for interpolation
 */
async function executeOTPStep(page, step, envVars) {
  if (step.action !== 'otpEmail') {
    throw new Error(`Expected otpEmail action for OTP step, got: ${step.action}`);
  }

  console.log('Waiting for and retrieving OTP code from email...');
  
  // Maximum number of attempts to get OTP
  const MAX_OTP_ATTEMPTS = 5;
  let otpCode = null;
  
  // Try multiple times with a delay to account for email delivery delay
  for (let attempt = 0; attempt < MAX_OTP_ATTEMPTS; attempt++) {
    // Get OTP from email using our utility function
    otpCode = await getOTPFromEmail(envVars.OTP_EMAIL_USER || '');
    
    if (otpCode) {
      console.log(`Retrieved OTP code on attempt ${attempt + 1}`);
      break;
    }
    
    console.log(`OTP not found yet, waiting (attempt ${attempt + 1}/${MAX_OTP_ATTEMPTS})...`);
    // Wait 5 seconds between attempts
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  if (!otpCode) {
    throw new Error('Failed to retrieve OTP code from email after multiple attempts');
  }

  console.log('Successfully retrieved OTP code from email');

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
 * @param {Object} page - Playwright page object
 * @param {Object} step - Download flow step
 * @param {Object} envVars - Environment variables for interpolation
 * @returns {Promise<string>} Path to the downloaded file
 */
async function executeDownloadStep(page, step, envVars) {
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
  const downloadDir = envVars.DOWNLOAD_DIR || './downloads';
  const downloadPath = path.resolve(process.cwd(), downloadDir, step.saveAs || 'report.csv');

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