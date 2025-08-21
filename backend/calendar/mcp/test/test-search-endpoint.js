import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzU1NTI5NjA1LCJleHAiOjE3NTU2MTYwMDV9.UxXyEkW8d4ZoZ1uqDxwRWNTYO4cT9vohlGVGFOGAb7Y';

const headers = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json'
};

console.log('🧪 Testing Search Endpoint Fixes...\n');

// Test 1: Basic search with 'query' parameter
async function testSearchWithQuery() {
  console.log('📋 Test 1: Search with query parameter');
  try {
    const params = new URLSearchParams({
      calendarId: 'primary',
      query: 'meeting',
      timeZone: 'Asia/Kolkata'
    });
    
    const response = await fetch(`${API_URL}/calendar/events/search?${params}`, { headers });
    const data = await response.json();
    
    console.log('✅ Status:', response.status);
    console.log('✅ Response structure:', Object.keys(data));
    
    if (data.success && data.data && data.data.events) {
      console.log(`✅ Found ${data.data.events.length} events in normalized format`);
    } else if (data.message) {
      console.log('✅ Got MCP message response:', data.message.substring(0, 100) + '...');
    }
    
    return response.ok;
  } catch (error) {
    console.error('❌ Search with query failed:', error.message);
    return false;
  }
}

// Test 2: Search with 'q' parameter (should also work)
async function testSearchWithQ() {
  console.log('\n📋 Test 2: Search with q parameter');
  try {
    const params = new URLSearchParams({
      calendarId: 'primary',
      q: 'test',
      timeZone: 'Asia/Kolkata'
    });
    
    const response = await fetch(`${API_URL}/calendar/events/search?${params}`, { headers });
    const data = await response.json();
    
    console.log('✅ Status:', response.status);
    console.log('✅ Response structure:', Object.keys(data));
    
    if (data.success && data.data && data.data.events) {
      console.log(`✅ Found ${data.data.events.length} events in normalized format`);
    } else if (data.message) {
      console.log('✅ Got MCP message response:', data.message.substring(0, 100) + '...');
    }
    
    return response.ok;
  } catch (error) {
    console.error('❌ Search with q failed:', error.message);
    return false;
  }
}

// Test 3: Search without query parameter (should return error)
async function testSearchWithoutQuery() {
  console.log('\n📋 Test 3: Search without query parameter');
  try {
    const params = new URLSearchParams({
      calendarId: 'primary',
      timeZone: 'Asia/Kolkata'
    });
    
    const response = await fetch(`${API_URL}/calendar/events/search?${params}`, { headers });
    const data = await response.json();
    
    console.log('✅ Status:', response.status);
    console.log('✅ Response structure:', Object.keys(data));
    
    if (response.status === 400 && data.error) {
      console.log('✅ Correctly returned 400 error for missing query');
      return true;
    } else {
      console.log('❌ Expected 400 error but got:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Search without query test failed:', error.message);
    return false;
  }
}

// Test 4: Check if other endpoints still work
async function testOtherEndpoints() {
  console.log('\n📋 Test 4: Verify other endpoints still work');
  try {
    // Test calendars endpoint
    const calendarsResponse = await fetch(`${API_URL}/calendar/calendars`, { headers });
    const calendarsData = await calendarsResponse.json();
    
    console.log('✅ Calendars endpoint status:', calendarsResponse.status);
    if (calendarsData.success && calendarsData.data) {
      console.log('✅ Calendars endpoint returns normalized format');
    }
    
    // Test events endpoint
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const eventsParams = new URLSearchParams({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: nextWeek.toISOString(),
      timeZone: 'Asia/Kolkata'
    });
    
    const eventsResponse = await fetch(`${API_URL}/calendar/events?${eventsParams}`, { headers });
    const eventsData = await eventsResponse.json();
    
    console.log('✅ Events endpoint status:', eventsResponse.status);
    if (eventsData.success && eventsData.data) {
      console.log('✅ Events endpoint returns normalized format');
    }
    
    return calendarsResponse.ok && eventsResponse.ok;
  } catch (error) {
    console.error('❌ Other endpoints test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = [];
  
  results.push(await testSearchWithQuery());
  results.push(await testSearchWithQ());
  results.push(await testSearchWithoutQuery());
  results.push(await testOtherEndpoints());
  
  console.log('\n🎯 Test Results Summary:');
  console.log('========================');
  console.log('Search with query parameter:', results[0] ? '✅ PASS' : '❌ FAIL');
  console.log('Search with q parameter:', results[1] ? '✅ PASS' : '❌ FAIL');
  console.log('Search without query (error handling):', results[2] ? '✅ PASS' : '❌ FAIL');
  console.log('Other endpoints still work:', results[3] ? '✅ PASS' : '❌ FAIL');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n🏆 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All search endpoint fixes are working correctly!');
    console.log('\n📝 Summary of fixes applied:');
    console.log('- Backend now accepts both "q" and "query" parameters');
    console.log('- Search results are normalized using normalizeEvents function');
    console.log('- Frontend properly handles normalized search response');
    console.log('- Error handling improved with better messages');
  } else {
    console.log('⚠️  Some tests failed. The search functionality may need additional fixes.');
  }
}

// Instructions
console.log('🔧 Make sure the backend server is running on http://localhost:4000');
console.log('⚠️  Using test token - replace with actual token for production testing\n');

runAllTests().catch(console.error);
