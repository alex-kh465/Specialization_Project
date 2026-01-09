import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000';

// Test different tokens - you should replace these with valid tokens
const TEST_TOKENS = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU1NTUxNTI1LCJpYXQiOjE3NTU1NDc5MjUsImlzc3VlciI6Imh0dHBzOi8vZHB0ZXN0Lm9uc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjdlZmM5YjE5LTFmZGUtNGRhMS05ZGJjLTJjNDk4ODUzOWI3YSIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnt9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU1NTQ3OTI1fV0sInNlc3Npb25faWQiOiIxNTNjZjExMi0xMjIwLTRiMzMtYjY4NS0yMTc3MmNmODZmNTQiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.KIDAv7UwFHGm4PnKTDjDVQpV3zDVHQ5VT3aUKtJJhrs',
  'test-token'
];

console.log('🧪 === MCP Calendar Endpoints Final Test ===\n');

// Test each endpoint systematically
async function testEndpoint(method, path, body, description) {
  console.log(`📞 Testing: ${description}`);
  console.log(`   ${method} ${path}`);
  
  for (const token of TEST_TOKENS) {
    try {
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }
      
      const response = await fetch(`${API_URL}${path}`, options);
      const data = await response.json();
      
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   📄 Response type: ${typeof data} (${Array.isArray(data) ? 'array' : 'object'})`);
      
      if (data.message) {
        console.log(`   💬 Message: ${data.message.substring(0, 100)}...`);
      }
      if (data.error) {
        console.log(`   ❌ Error: ${data.error}`);
      }
      if (data.calendars) {
        console.log(`   📋 Calendars: ${data.calendars.length} found`);
      }
      if (data.events) {
        console.log(`   📅 Events: ${data.events.length} found`);
      }
      
      // If successful, don't try other tokens
      if (response.status < 400) {
        break;
      }
      
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
  }
  console.log();
}

// Main test function
async function runTests() {
  // Basic connectivity
  await testEndpoint('GET', '/calendar/health', null, 'Health Check (no auth needed)');
  
  // MCP Calendar endpoints
  await testEndpoint('GET', '/calendar/mcp/calendars', null, 'List Calendars');
  
  await testEndpoint('GET', '/calendar/mcp/events?calendarId=primary&timeMin=2025-08-18T00:00:00&timeMax=2025-09-18T23:59:59&timeZone=Asia/Kolkata', null, 'List Events');
  
  await testEndpoint('GET', '/calendar/mcp/search?query=Study&calendarId=primary&timeMin=2025-08-18T00:00:00&timeMax=2025-12-18T23:59:59&timeZone=Asia/Kolkata', null, 'Search Events');
  
  await testEndpoint('GET', '/calendar/mcp/colors', null, 'List Colors');
  
  await testEndpoint('POST', '/calendar/mcp/freebusy', {
    calendars: ['primary'],
    timeMin: '2025-08-18T20:00:00.000Z',
    timeMax: '2025-08-19T20:00:00.000Z',
    timeZone: 'Asia/Kolkata'
  }, 'Free/Busy Check');
  
  await testEndpoint('POST', '/calendar/mcp/availability', {
    calendars: ['primary'],
    timeMin: '2025-08-18T20:00:00.000Z',
    timeMax: '2025-08-19T20:00:00.000Z',
    duration: 60,
    timeZone: 'Asia/Kolkata'
  }, 'Availability Check');
  
  await testEndpoint('POST', '/calendar/mcp/events', {
    calendarId: 'primary',
    summary: 'Test MCP Event',
    description: 'Created by MCP final test',
    start: '2025-08-20T15:00:00',
    end: '2025-08-20T16:00:00',
    location: 'Test Location',
    attendees: []
  }, 'Create Event');
  
  // MCP Status
  await testEndpoint('GET', '/calendar/mcp/status', null, 'MCP Status');
  
  console.log('🏁 === Test Complete ===');
  console.log('✅ If you see successful responses (status 200-201), the endpoints are working');
  console.log('❌ If you see 401 errors, you need a valid authentication token');  
  console.log('⚠️  If you see other errors, there may be MCP server or configuration issues');
  console.log('\n📋 Next Steps:');
  console.log('1. Ensure your frontend is using the /calendar/mcp/* endpoints');
  console.log('2. Check that authentication tokens are valid');
  console.log('3. Test the frontend calendar page functionality');
}

runTests().catch(console.error);
