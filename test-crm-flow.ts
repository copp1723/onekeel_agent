/**
 * Test script for the CRM report flow
 * Verifies that the config-driven Playwright agent can execute flows successfully
 */
import { fetchCRMReport } from './src/agents/fetchCRMReport';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set timeout to 2 minutes for long-running browser automation
jest.setTimeout(120000);

/**
 * Test the VinSolutions flow
 */
async function testVinSolutionsFlow() {
  console.log('=== TESTING VINSOLUTIONS FLOW ===');
  try {
    const filePath = await fetchCRMReport({
      platform: 'VinSolutions',
      dealerId: 'ABC123'
    });
    console.log('✅ VinSolutions flow completed successfully');
    console.log(`Report file saved to: ${filePath}`);
    return true;
  } catch (error) {
    console.error('❌ VinSolutions flow failed:', error);
    return false;
  }
}

/**
 * Test the VAUTO flow
 */
async function testVAUTOFlow() {
  console.log('=== TESTING VAUTO FLOW ===');
  try {
    const filePath = await fetchCRMReport({
      platform: 'VAUTO',
      dealerId: 'XYZ456'
    });
    console.log('✅ VAUTO flow completed successfully');
    console.log(`Report file saved to: ${filePath}`);
    return true;
  } catch (error) {
    console.error('❌ VAUTO flow failed:', error);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('Starting CRM flow tests...');
  
  // Test environment variables
  const requiredVars = [
    'VIN_SOLUTIONS_USERNAME',
    'VIN_SOLUTIONS_PASSWORD',
    'OTP_EMAIL_USER',
    'OTP_EMAIL_PASS',
    'VAUTO_USERNAME',
    'VAUTO_PASSWORD'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.warn(`⚠️ Warning: Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('Some tests may fail due to missing credentials');
  }
  
  // Run tests
  let vinSuccess = false;
  let vautoSuccess = false;
  
  try {
    // Test VinSolutions flow if credentials are available
    if (!missingVars.includes('VIN_SOLUTIONS_USERNAME') && 
        !missingVars.includes('VIN_SOLUTIONS_PASSWORD')) {
      vinSuccess = await testVinSolutionsFlow();
    } else {
      console.log('Skipping VinSolutions test due to missing credentials');
    }
    
    // Test VAUTO flow if credentials are available
    if (!missingVars.includes('VAUTO_USERNAME') && 
        !missingVars.includes('VAUTO_PASSWORD')) {
      vautoSuccess = await testVAUTOFlow();
    } else {
      console.log('Skipping VAUTO test due to missing credentials');
    }
    
    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`VinSolutions: ${vinSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`VAUTO: ${vautoSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!vinSuccess && !vautoSuccess) {
      console.error('All tests failed');
      process.exit(1);
    }
    
    console.log('Tests completed successfully');
  } catch (error) {
    console.error('Unexpected error during testing:', error);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});