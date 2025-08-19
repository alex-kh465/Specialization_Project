import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000';

console.log('🧪 === Basic Web App Calendar Test ===\n');

// Test 1: Health Check
async function testHealthCheck() {
  console.log('1️⃣ Testing Health Check...');
  try {
    const response = await fetch(`${API_URL}/calendar/health`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Health check endpoint works');
      console.log('📄 Response:', data);
    } else {
      console.log('❌ Health check failed:', data);
    }
  } catch (error) {
    console.log('💥 Health check error:', error.message);
  }
  console.log();
}

// Test 2: Status Check
async function testStatusCheck() {
  console.log('2️⃣ Testing Status Check...');
  try {
    const response = await fetch(`${API_URL}/calendar/status`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Status endpoint works');
      console.log('📄 Response:', data);
    } else {
      console.log('❌ Status check failed:', data);
    }
  } catch (error) {
    console.log('💥 Status check error:', error.message);
  }
  console.log();
}

// Test 3: Basic connectivity test
async function testConnectivity() {
  console.log('3️⃣ Testing Basic Connectivity...');
  try {
    const response = await fetch(`${API_URL}/calendar/calendars`);
    
    if (response.status === 401) {
      console.log('✅ Calendar endpoint is reachable (authentication required)');
      console.log('📄 Status: 401 Unauthorized - as expected');
    } else {
      const data = await response.json();
      console.log('📄 Response status:', response.status);
      console.log('📄 Response data:', data);
    }
  } catch (error) {
    console.log('💥 Connectivity test error:', error.message);
  }
  console.log();
}

// Test 4: Test other endpoints without auth
async function testOtherEndpoints() {
  console.log('4️⃣ Testing Other Endpoints (without auth)...');
  
  const endpoints = [
    '/calendar/events',
    '/calendar/events/search',
    '/calendar/freebusy'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`);
      
      if (response.status === 401) {
        console.log(`✅ ${endpoint} is reachable (authentication required)`);
      } else {
        console.log(`📄 ${endpoint} - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`💥 ${endpoint} error:`, error.message);
    }
  }
  console.log();
}

// Run all tests
async function runAllTests() {
  await testHealthCheck();
  await testStatusCheck();
  await testConnectivity();
  await testOtherEndpoints();
  
  console.log('🏁 === Test Summary ===');
  console.log('Basic connectivity tests completed.');
  console.log('All endpoints should be reachable with proper authentication.');
  console.log('\n📝 Next steps:');
  console.log('1. Verify your web app frontend authentication');
  console.log('2. Navigate to the Calendar page in your web app');
  console.log('3. Test the UI functionality with proper tokens');
}

runAllTests().catch(console.error);
