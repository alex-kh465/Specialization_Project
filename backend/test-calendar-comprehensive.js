#!/usr/bin/env node

/**
 * Comprehensive Calendar MCP Testing Script
 * Tests all calendar operations including chat integration
 */

const baseUrl = 'http://localhost:4000';

// Test JWT token (replace with a valid one)
const testToken = 'your_jwt_token_here';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${testToken}`
};

// Utility function to make API requests
async function apiRequest(endpoint, method = 'GET', body = null) {
  try {
    const config = {
      method,
      headers
    };
    
    if (body && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(body);
    }
    
    console.log(`\n🔗 ${method} ${baseUrl}${endpoint}`);
    if (body) console.log('📤 Request body:', JSON.stringify(body, null, 2));
    
    const response = await fetch(`${baseUrl}${endpoint}`, config);
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log('📥 Response:', JSON.stringify(data, null, 2));
    
    return { status: response.status, data };
  } catch (error) {
    console.error(`❌ Error testing ${endpoint}:`, error.message);
    return { status: 500, error: error.message };
  }
}

// Test functions
async function testCalendarHealth() {
  console.log('\n🏥 TESTING CALENDAR HEALTH CHECK');
  return await apiRequest('/calendar/mcp/health');
}

async function testListCalendars() {
  console.log('\n📅 TESTING LIST CALENDARS');
  return await apiRequest('/calendar/mcp/calendars');
}

async function testListEvents() {
  console.log('\n📋 TESTING LIST EVENTS');
  return await apiRequest('/calendar/mcp/events');
}

async function testSearchEvents() {
  console.log('\n🔍 TESTING SEARCH EVENTS');
  return await apiRequest('/calendar/mcp/events/search', 'GET', null);
}

async function testSearchEventsWithQuery() {
  console.log('\n🔍 TESTING SEARCH EVENTS WITH QUERY');
  return await apiRequest('/calendar/mcp/events/search?query=meeting');
}

async function testCreateEvent() {
  console.log('\n➕ TESTING CREATE EVENT');
  
  const now = new Date();
  const startTime = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // 2 hours from now
  const endTime = new Date(startTime.getTime() + (60 * 60 * 1000)); // 1 hour duration
  
  const eventData = {
    title: 'Test Calendar MCP Event',
    description: 'This is a test event created by the Calendar MCP testing script',
    start: startTime.toISOString(),
    end: endTime.toISOString(),
    location: 'Test Location',
    calendarId: 'primary'
  };
  
  return await apiRequest('/calendar/mcp/events', 'POST', eventData);
}

async function testGetColors() {
  console.log('\n🎨 TESTING GET COLORS');
  return await apiRequest('/calendar/mcp/colors');
}

async function testFreeBusy() {
  console.log('\n📊 TESTING FREE/BUSY');
  
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + (24 * 60 * 60 * 1000)).toISOString(); // 24 hours from now
  
  const freeBusyData = {
    calendars: ['primary'],
    timeMin,
    timeMax,
    timeZone: 'Asia/Kolkata'
  };
  
  return await apiRequest('/calendar/mcp/freebusy', 'POST', freeBusyData);
}

async function testAvailability() {
  console.log('\n📅 TESTING AVAILABILITY CHECK');
  
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + (8 * 60 * 60 * 1000)).toISOString(); // 8 hours from now
  
  const availabilityData = {
    calendars: ['primary'],
    timeMin,
    timeMax,
    duration: 60, // 60 minutes
    timeZone: 'Asia/Kolkata'
  };
  
  return await apiRequest('/calendar/mcp/availability', 'POST', availabilityData);
}

async function testAIChatCalendarIntegration() {
  console.log('\n🤖 TESTING AI CHAT CALENDAR INTEGRATION');
  
  const testMessages = [
    'What are my events today?',
    'Schedule a meeting tomorrow at 3pm',
    'Find my study session',
    'When am I free tomorrow?',
    'Show my calendars',
    'Cancel my evening meeting'
  ];
  
  for (const message of testMessages) {
    console.log(`\n💬 Testing message: "${message}"`);
    const result = await apiRequest('/ai/chat', 'POST', { message });
    console.log(`📝 Response: ${result.data?.response?.substring(0, 200)}...`);
  }
}

async function testDebugCalendarChat() {
  console.log('\n🔧 TESTING DEBUG CALENDAR CHAT');
  
  const testMessages = [
    'schedule a study session tomorrow',
    'what are my events today',
    'find my meetings'
  ];
  
  for (const message of testMessages) {
    console.log(`\n🔧 Debug testing: "${message}"`);
    const result = await apiRequest('/ai/debug-calendar', 'POST', { message });
    console.log(`📝 Debug response: ${result.data?.response?.substring(0, 200)}...`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 STARTING COMPREHENSIVE CALENDAR MCP TESTS');
  console.log('=' .repeat(60));
  
  // Basic functionality tests
  await testCalendarHealth();
  await testListCalendars();
  await testListEvents();
  await testSearchEvents();
  await testSearchEventsWithQuery();
  await testGetColors();
  await testFreeBusy();
  await testAvailability();
  
  // Event creation test
  await testCreateEvent();
  
  // AI Chat integration tests
  await testAIChatCalendarIntegration();
  
  // Debug chat tests
  await testDebugCalendarChat();
  
  console.log('\n✅ ALL TESTS COMPLETED');
  console.log('=' .repeat(60));
  console.log('\n📋 SUMMARY:');
  console.log('- Calendar health check');
  console.log('- List calendars');
  console.log('- List events');
  console.log('- Search events (with and without query)');
  console.log('- Create event');
  console.log('- Get colors');
  console.log('- Free/busy check');
  console.log('- Availability check');
  console.log('- AI chat calendar integration');
  console.log('- Debug calendar chat');
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Replace the test JWT token with a valid one');
  console.log('2. Verify all endpoints return expected data');
  console.log('3. Test frontend calendar integration');
  console.log('4. Test calendar operations through chat interface');
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testCalendarHealth,
    testListCalendars,
    testListEvents,
    testSearchEvents,
    testCreateEvent,
    testGetColors,
    testFreeBusy,
    testAvailability,
    testAIChatCalendarIntegration,
    testDebugCalendarChat,
    runAllTests
  };
} else {
  // Run tests if executed directly
  runAllTests().catch(console.error);
}
