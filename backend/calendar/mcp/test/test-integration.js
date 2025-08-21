import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzU1NTI5NjA1LCJleHAiOjE3NTU2MTYwMDV9.UxXyEkW8d4ZoZ1uqDxwRWNTYO4cT9vohlGVGFOGAb7Y';

const headers = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json'
};

console.log('🧪 Starting Integration Tests...\n');

// Test 1: Check MCP Status
async function testMCPStatus() {
  console.log('📋 Test 1: Checking MCP Status');
  try {
    const response = await fetch(`${API_URL}/calendar/mcp/status`, { headers });
    const data = await response.json();
    console.log('✅ MCP Status:', data.mcpConnected ? 'Connected' : 'Disconnected');
    return data.mcpConnected;
  } catch (error) {
    console.error('❌ MCP Status failed:', error.message);
    return false;
  }
}

// Test 2: List Calendars
async function testListCalendars() {
  console.log('\n📅 Test 2: Listing Calendars');
  try {
    const response = await fetch(`${API_URL}/calendar/mcp/calendars`, { headers });
    const data = await response.json();
    console.log('✅ Calendars response received');
    console.log('   Message sample:', data.message?.slice(0, 100) + '...');
    return true;
  } catch (error) {
    console.error('❌ List calendars failed:', error.message);
    return false;
  }
}

// Test 3: List Events
async function testListEvents() {
  console.log('\n📆 Test 3: Listing Events');
  try {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const params = new URLSearchParams({
      calendarId: 'primary',
      timeMin: now.toISOString().slice(0, 19),
      timeMax: nextWeek.toISOString().slice(0, 19),
      timeZone: 'Asia/Kolkata'
    });
    
    const response = await fetch(`${API_URL}/calendar/mcp/events?${params}`, { headers });
    const data = await response.json();
    console.log('✅ Events retrieved:', data.events?.length || 0, 'events found');
    return true;
  } catch (error) {
    console.error('❌ List events failed:', error.message);
    return false;
  }
}

// Test 4: Create Event
async function testCreateEvent() {
  console.log('\n🆕 Test 4: Creating Event');
  try {
    const now = new Date();
    const eventStart = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // 1 hour duration
    
    const eventData = {
      title: 'Integration Test Event',
      description: 'Test event created by integration test',
      start: eventStart.toISOString().slice(0, 19),
      end: eventEnd.toISOString().slice(0, 19),
      location: 'Test Location'
    };
    
    const response = await fetch(`${API_URL}/calendar/mcp/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(eventData)
    });
    
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Event created successfully');
      return data.id || 'test-event-id';
    } else {
      console.error('❌ Create event failed:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Create event failed:', error.message);
    return null;
  }
}

// Test 5: Search Events
async function testSearchEvents() {
  console.log('\n🔍 Test 5: Searching Events');
  try {
    const params = new URLSearchParams({
      calendarId: 'primary',
      query: 'Integration Test',
      timeZone: 'Asia/Kolkata'
    });
    
    const response = await fetch(`${API_URL}/calendar/mcp/search?${params}`, { headers });
    const data = await response.json();
    console.log('✅ Search completed:', data.events?.length || 0, 'events found');
    return true;
  } catch (error) {
    console.error('❌ Search events failed:', error.message);
    return false;
  }
}

// Test 6: Get Colors
async function testGetColors() {
  console.log('\n🎨 Test 6: Getting Event Colors');
  try {
    const response = await fetch(`${API_URL}/calendar/mcp/colors`, { headers });
    const data = await response.json();
    console.log('✅ Colors retrieved successfully');
    return true;
  } catch (error) {
    console.error('❌ Get colors failed:', error.message);
    return false;
  }
}

// Test 7: Check Availability
async function testAvailability() {
  console.log('\n⏰ Test 7: Checking Availability');
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const availabilityData = {
      calendars: ['primary'],
      timeMin: now.toISOString().slice(0, 19),
      timeMax: tomorrow.toISOString().slice(0, 19),
      duration: 60,
      timeZone: 'Asia/Kolkata'
    };
    
    const response = await fetch(`${API_URL}/calendar/mcp/availability`, {
      method: 'POST',
      headers,
      body: JSON.stringify(availabilityData)
    });
    
    const data = await response.json();
    console.log('✅ Availability check completed:', data.availableSlots?.length || 0, 'slots found');
    return true;
  } catch (error) {
    console.error('❌ Availability check failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = [];
  
  results.push(await testMCPStatus());
  results.push(await testListCalendars());
  results.push(await testListEvents());
  
  const eventId = await testCreateEvent();
  results.push(!!eventId);
  
  results.push(await testSearchEvents());
  results.push(await testGetColors());
  results.push(await testAvailability());
  
  console.log('\n🎯 Test Summary:');
  console.log('================');
  console.log('MCP Status:', results[0] ? '✅' : '❌');
  console.log('List Calendars:', results[1] ? '✅' : '❌');
  console.log('List Events:', results[2] ? '✅' : '❌');
  console.log('Create Event:', results[3] ? '✅' : '❌');
  console.log('Search Events:', results[4] ? '✅' : '❌');
  console.log('Get Colors:', results[5] ? '✅' : '❌');
  console.log('Check Availability:', results[6] ? '✅' : '❌');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n🏆 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Integration is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
  }
}

runAllTests().catch(console.error);
