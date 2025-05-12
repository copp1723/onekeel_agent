/**
 * Test script for Credential Vault functionality
 * Tests encryption, CRUD operations, and security
 * 
 * Usage: node test-credential-vault.js
 */

import {
  addCredential,
  getCredentialById,
  getCredentials,
  updateCredential,
  deleteCredential,
  hardDeleteCredential,
  encryptData,
  decryptData,
  testEncryption
} from './src/simple-credential-vault.ts';

// Dummy user IDs for testing
const USER_1 = 'test-user-1';
const USER_2 = 'test-user-2';

// Test credentials
const sampleCredential = {
  username: 'test-user@example.com',
  password: 'password123',
  apiKey: 'sk_test_abcdefg',
  dealerId: '12345'
};

// Tests encryption utilities
async function testEncryptionUtils() {
  console.log('\n=== Testing Encryption Utilities ===');
  
  try {
    // Test the test function first
    const testResult = testEncryption();
    console.log(`Basic encryption test: ${testResult ? 'PASSED' : 'FAILED'}`);
    
    if (!testResult) {
      throw new Error('Basic encryption test failed, aborting further tests');
    }
    
    // Encrypt some data
    const testData = {
      secret: 'very secret data',
      number: 12345,
      nested: { value: 'nested value' }
    };
    
    console.log('Encrypting data...');
    const { encryptedData, iv } = encryptData(testData);
    
    console.log('Encrypted:', encryptedData.substring(0, 20) + '...');
    console.log('IV:', iv);
    
    // Decrypt the data
    console.log('Decrypting data...');
    const decrypted = decryptData(encryptedData, iv);
    
    // Verify decryption was successful
    const isMatch = decrypted.secret === testData.secret &&
                   decrypted.number === testData.number &&
                   decrypted.nested.value === testData.nested.value;
                   
    console.log(`Decryption match: ${isMatch ? 'PASSED' : 'FAILED'}`);
    console.log('Decrypted data:', decrypted);
    
    return isMatch;
  } catch (error) {
    console.error('Encryption test failed:', error);
    return false;
  }
}

// Tests basic CRUD operations
async function testCRUDOperations() {
  console.log('\n=== Testing CRUD Operations ===');
  let createdCredentialId = null;
  
  try {
    // Test adding a credential
    console.log('Adding credential...');
    const credential = await addCredential(
      USER_1,
      'VinSolutions',
      sampleCredential,
      {
        label: 'Test Credential'
      }
    );
    
    createdCredentialId = credential.id;
    console.log(`Added credential with ID: ${credential.id}`);
    
    // Test getting a credential by ID
    console.log('Getting credential by ID...');
    const { credential: fetchedCredential, data } = await getCredentialById(createdCredentialId, USER_1);
    
    console.log('Retrieved credential:', {
      id: fetchedCredential.id,
      platform: fetchedCredential.platform,
      label: fetchedCredential.label
    });
    console.log('Decrypted data:', data);
    
    const dataMatches = data.username === sampleCredential.username &&
                       data.password === sampleCredential.password;
    console.log(`Data integrity: ${dataMatches ? 'PASSED' : 'FAILED'}`);
    
    // Test getting all credentials
    console.log('Getting all credentials...');
    const results = await getCredentials(USER_1);
    
    console.log(`Retrieved ${results.length} credentials`);
    console.log('First credential:', {
      id: results[0].credential.id,
      platform: results[0].credential.platform
    });
    
    // Test updating a credential
    console.log('Updating credential...');
    const dataToUpdate = {
      ...sampleCredential,
      apiKey: 'updated_api_key',
      additionalField: 'new value'
    };
    
    const updatedCredential = await updateCredential(
      createdCredentialId,
      USER_1,
      dataToUpdate,
      {
        label: 'Updated Test Credential'
      }
    );
    
    console.log('Updated credential:', {
      id: updatedCredential.id,
      label: updatedCredential.label
    });
    
    // Verify update
    const { data: updatedDataResult } = await getCredentialById(createdCredentialId, USER_1);
    const updateSuccessful = updatedDataResult.apiKey === 'updated_api_key' && 
                            updatedDataResult.additionalField === 'new value';
    
    console.log(`Update verification: ${updateSuccessful ? 'PASSED' : 'FAILED'}`);
    
    // Test soft delete
    console.log('Soft deleting credential...');
    const deleteResult = await deleteCredential(createdCredentialId, USER_1);
    console.log(`Soft delete result: ${deleteResult ? 'PASSED' : 'FAILED'}`);
    
    // Verify credential is no longer returned in active credentials
    const afterDeleteResults = await getCredentials(USER_1);
    console.log(`Credentials after delete: ${afterDeleteResults.length}`);
    console.log(`Soft delete verification: ${afterDeleteResults.length === 0 ? 'PASSED' : 'FAILED'}`);
    
    // Test hard delete (cleanup)
    console.log('Hard deleting credential (cleanup)...');
    const hardDeleteResult = await hardDeleteCredential(createdCredentialId, USER_1);
    console.log(`Hard delete result: ${hardDeleteResult ? 'PASSED' : 'FAILED'}`);
    
    return true;
  } catch (error) {
    console.error('CRUD test failed:', error);
    
    // Cleanup on error
    if (createdCredentialId) {
      try {
        await hardDeleteCredential(createdCredentialId, USER_1);
        console.log('Cleaned up test credential');
      } catch (cleanupError) {
        console.error('Failed to clean up test credential:', cleanupError);
      }
    }
    
    return false;
  }
}

// Tests security isolation between users
async function testSecurityIsolation() {
  console.log('\n=== Testing Security Isolation ===');
  let user1CredentialId = null;
  
  try {
    // Create credential for user 1
    console.log('Creating credential for USER_1...');
    const credential1 = await addCredential(
      USER_1,
      'VAUTO',
      sampleCredential,
      {
        label: 'User 1 Credential'
      }
    );
    
    user1CredentialId = credential1.id;
    console.log(`Created credential for USER_1 with ID: ${credential1.id}`);
    
    // Try to access USER_1's credential as USER_2
    console.log('Attempting to access USER_1 credential as USER_2...');
    try {
      await getCredentialById(user1CredentialId, USER_2);
      console.log('SECURITY FAILURE: USER_2 was able to access USER_1 credential');
      return false;
    } catch (error) {
      const expectedError = error.message.includes('not found') || error.message.includes('access denied');
      console.log(`Security isolation: ${expectedError ? 'PASSED' : 'FAILED'}`);
      
      if (!expectedError) {
        console.error('Unexpected error:', error);
        return false;
      }
    }
    
    // Try to update USER_1's credential as USER_2
    console.log('Attempting to update USER_1 credential as USER_2...');
    try {
      await updateCredential(
        user1CredentialId,
        USER_2,
        { username: 'hacked' }
      );
      console.log('SECURITY FAILURE: USER_2 was able to update USER_1 credential');
      return false;
    } catch (error) {
      const expectedError = error.message.includes('not found') || error.message.includes('access denied');
      console.log(`Update security: ${expectedError ? 'PASSED' : 'FAILED'}`);
      
      if (!expectedError) {
        console.error('Unexpected error:', error);
        return false;
      }
    }
    
    // Try to delete USER_1's credential as USER_2
    console.log('Attempting to delete USER_1 credential as USER_2...');
    try {
      const result = await deleteCredential(user1CredentialId, USER_2);
      if (result) {
        console.log('SECURITY FAILURE: USER_2 was able to delete USER_1 credential');
        return false;
      } else {
        console.log('Delete security: PASSED (operation returned false)');
      }
    } catch (error) {
      const expectedError = error.message.includes('not found') || error.message.includes('access denied');
      console.log(`Delete security: ${expectedError ? 'PASSED' : 'FAILED'}`);
      
      if (!expectedError) {
        console.error('Unexpected error:', error);
        return false;
      }
    }
    
    // Clean up
    await hardDeleteCredential(user1CredentialId, USER_1);
    console.log('Cleaned up test credential');
    
    return true;
  } catch (error) {
    console.error('Security test failed:', error);
    
    // Cleanup on error
    if (user1CredentialId) {
      try {
        await hardDeleteCredential(user1CredentialId, USER_1);
        console.log('Cleaned up test credential');
      } catch (cleanupError) {
        console.error('Failed to clean up test credential:', cleanupError);
      }
    }
    
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('=== Credential Vault Tests ===');
  
  try {
    // Test encryption utils first
    const encryptionTestPassed = await testEncryptionUtils();
    if (!encryptionTestPassed) {
      console.error('Encryption tests failed, aborting remaining tests');
      process.exit(1);
    }
    
    // Test CRUD operations
    const crudTestPassed = await testCRUDOperations();
    if (!crudTestPassed) {
      console.error('CRUD tests failed');
      process.exit(1);
    }
    
    // Test security isolation
    const securityTestPassed = await testSecurityIsolation();
    if (!securityTestPassed) {
      console.error('Security tests failed');
      process.exit(1);
    }
    
    console.log('\n=== All Tests Completed Successfully ===');
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();