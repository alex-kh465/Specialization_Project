/**
 * Test file to verify datetime validation and normalization fixes
 * Run this with: node test-datetime-validation.js
 */

import { googleCalendarAPI } from '../core/google-calendar.js';

// Test cases for datetime normalization
const testCases = [
  // Valid complete formats
  { input: '2025-08-20T15:00:00.000Z', expected: '2025-08-20T15:00:00.000Z', description: 'Complete RFC3339 format' },
  { input: '2025-08-20T15:00:00Z', expected: '2025-08-20T15:00:00.000Z', description: 'RFC3339 without milliseconds' },
  
  // Incomplete formats that should be fixed
  { input: '2025-08-20T15:00:00', expected: '2025-08-20T15:00:00.000Z', description: 'Missing timezone' },
  { input: '2025-08-20T15:00', expected: '2025-08-20T15:00:00.000Z', description: 'Missing seconds and timezone' },
  
  // Formats with whitespace
  { input: '  2025-08-20T15:00:00.000Z  ', expected: '2025-08-20T15:00:00.000Z', description: 'With leading/trailing spaces' },
  
  // Date objects
  { input: new Date('2025-08-20T15:00:00.000Z'), expected: '2025-08-20T15:00:00.000Z', description: 'Date object input' },
];

// Test cases for string sanitization
const sanitizationTestCases = [
  { input: 'Test Event', field: 'Event Title', required: true, expected: 'Test Event', description: 'Normal string' },
  { input: '  Test Event  ', field: 'Event Title', required: true, expected: 'Test Event', description: 'String with whitespace' },
  { input: '', field: 'Description', required: false, expected: '', description: 'Empty optional field' },
  { input: null, field: 'Description', required: false, expected: '', description: 'Null optional field' },
  { input: undefined, field: 'Description', required: false, expected: '', description: 'Undefined optional field' },
  { input: 123, field: 'Field', required: false, expected: '123', description: 'Number converted to string' },
];

// Test cases that should throw errors
const errorTestCases = [
  { input: '', field: 'Required Field', required: true, description: 'Empty required field' },
  { input: null, field: 'Required Field', required: true, description: 'Null required field' },
  { input: undefined, field: 'Required Field', required: true, description: 'Undefined required field' },
  { input: '  ', field: 'Required Field', required: true, description: 'Whitespace-only required field' },
];

// Test cases for datetime errors
const datetimeErrorCases = [
  { input: '', description: 'Empty string' },
  { input: null, description: 'Null value' },
  { input: undefined, description: 'Undefined value' },
  { input: 'invalid-date', description: 'Invalid date string' },
  { input: '2025-13-40T25:70:70', description: 'Invalid date components' },
];

// Test datetime normalization
console.log('🧪 Testing datetime normalization...\n');

let passedTests = 0;
let totalTests = 0;

for (const testCase of testCases) {
  totalTests++;
  try {
    const result = googleCalendarAPI.normalizeDateTime(testCase.input);
    if (result === testCase.expected) {
      console.log(`✅ ${testCase.description}: ${testCase.input} → ${result}`);
      passedTests++;
    } else {
      console.log(`❌ ${testCase.description}: Expected ${testCase.expected}, got ${result}`);
    }
  } catch (error) {
    console.log(`❌ ${testCase.description}: Threw error: ${error.message}`);
  }
}

// Test string sanitization
console.log('\n🧪 Testing string sanitization...\n');

for (const testCase of sanitizationTestCases) {
  totalTests++;
  try {
    const result = googleCalendarAPI.sanitizeStringInput(testCase.input, testCase.field, testCase.required);
    if (result === testCase.expected) {
      console.log(`✅ ${testCase.description}: "${testCase.input}" → "${result}"`);
      passedTests++;
    } else {
      console.log(`❌ ${testCase.description}: Expected "${testCase.expected}", got "${result}"`);
    }
  } catch (error) {
    console.log(`❌ ${testCase.description}: Threw error: ${error.message}`);
  }
}

// Test error cases for string sanitization
console.log('\n🧪 Testing string sanitization error cases...\n');

for (const testCase of errorTestCases) {
  totalTests++;
  try {
    const result = googleCalendarAPI.sanitizeStringInput(testCase.input, testCase.field, testCase.required);
    console.log(`❌ ${testCase.description}: Should have thrown error, got "${result}"`);
  } catch (error) {
    console.log(`✅ ${testCase.description}: Correctly threw error: ${error.message}`);
    passedTests++;
  }
}

// Test datetime error cases
console.log('\n🧪 Testing datetime error cases...\n');

for (const testCase of datetimeErrorCases) {
  totalTests++;
  try {
    const result = googleCalendarAPI.normalizeDateTime(testCase.input);
    console.log(`❌ ${testCase.description}: Should have thrown error, got "${result}"`);
  } catch (error) {
    console.log(`✅ ${testCase.description}: Correctly threw error: ${error.message}`);
    passedTests++;
  }
}

// Test time range validation
console.log('\n🧪 Testing time range validation...\n');

const timeRangeTests = [
  { 
    timeMin: '2025-08-20T15:00:00', 
    timeMax: '2025-08-20T16:00:00', 
    description: 'Valid time range',
    shouldPass: true 
  },
  { 
    timeMin: '2025-08-20T16:00:00', 
    timeMax: '2025-08-20T15:00:00', 
    description: 'Invalid time range (end before start)',
    shouldPass: false 
  },
  { 
    timeMin: '2025-08-20T15:00:00', 
    timeMax: '2025-08-20T15:00:00', 
    description: 'Same start and end time',
    shouldPass: false 
  },
];

for (const testCase of timeRangeTests) {
  totalTests++;
  try {
    const result = googleCalendarAPI.normalizeTimeRange(testCase.timeMin, testCase.timeMax);
    if (testCase.shouldPass) {
      console.log(`✅ ${testCase.description}: ${testCase.timeMin} to ${testCase.timeMax}`);
      passedTests++;
    } else {
      console.log(`❌ ${testCase.description}: Should have thrown error`);
    }
  } catch (error) {
    if (!testCase.shouldPass) {
      console.log(`✅ ${testCase.description}: Correctly threw error: ${error.message}`);
      passedTests++;
    } else {
      console.log(`❌ ${testCase.description}: Unexpected error: ${error.message}`);
    }
  }
}

// Test email validation
console.log('\n🧪 Testing email validation...\n');

const emailTests = [
  { email: 'test@example.com', expected: true, description: 'Valid email' },
  { email: 'user.name@domain.co.uk', expected: true, description: 'Valid email with subdomain' },
  { email: 'invalid-email', expected: false, description: 'Invalid email without @' },
  { email: '@domain.com', expected: false, description: 'Invalid email without user' },
  { email: 'user@', expected: false, description: 'Invalid email without domain' },
  { email: '', expected: false, description: 'Empty email' },
  { email: 'user@domain', expected: false, description: 'Invalid email without TLD' },
];

for (const testCase of emailTests) {
  totalTests++;
  const result = googleCalendarAPI.validateEmail(testCase.email);
  if (result === testCase.expected) {
    console.log(`✅ ${testCase.description}: "${testCase.email}" → ${result}`);
    passedTests++;
  } else {
    console.log(`❌ ${testCase.description}: Expected ${testCase.expected}, got ${result}`);
  }
}

// Summary
console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All tests passed! The datetime validation and normalization fixes are working correctly.');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please review the validation logic.');
  process.exit(1);
}
