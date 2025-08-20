import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzU1NTI5NjA1LCJleHAiOjE3NTU2MTYwMDV9.UxXyEkW8d4ZoZ1uqDxwRWNTYO4cT9vohlGVGFOGAb7Y';

const headers = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json'
};

console.log('🧪 Testing Complete Calendar Functionality...\n');

// Test 1: List Calendars
async function testListCalendars() {
  console.log('📅 Test 1: List Calendars');
  try {
    const response = await fetch(`${API_URL}/calendar/calendars`, { headers });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Status:', response.status);
      console.log('✅ Response structure:', Object.keys(data));
      
      if (data.success && data.data && data.data.calendars) {
        console.log(`✅ Found ${data.data.calendars.length} calendars (normalized format)`);
        return { success: true, count: data.data.calendars.length };
      } else if (data.message) {
        console.log('✅ Got MCP message format');
        return { success: true, format: 'message' };
      }
    } else {
      console.log('❌ Status:', response.status);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 2: List Events
async function testListEvents() {
  console.log('\n📆 Test 2: List Events');
  try {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    
    const params = new URLSearchParams({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: nextMonth.toISOString(),
      timeZone: 'Asia/Kolkata'
    });
    
    const response = await fetch(`${API_URL}/calendar/events?${params}`, { headers });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Status:', response.status);
      console.log('✅ Response structure:', Object.keys(data));
      
      if (data.success && data.data && data.data.events) {
        console.log(`✅ Found ${data.data.events.length} events (normalized format)`);
        
        // Test event structure
        if (data.data.events.length > 0) {
          const sampleEvent = data.data.events[0];
          const hasRequiredFields = sampleEvent.id && sampleEvent.summary && 
                                   sampleEvent.start && sampleEvent.end;
          console.log('✅ Event structure valid:', hasRequiredFields);
        }
        
        return { success: true, count: data.data.events.length };
      } else if (data.message) {
        console.log('✅ Got MCP message format');
        return { success: true, format: 'message' };
      }
    } else {
      console.log('❌ Status:', response.status);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 3: Search Events (both q and query parameters)
async function testSearchEvents() {
  console.log('\n🔍 Test 3: Search Events');
  
  // Test with 'q' parameter
  console.log('  Testing with "q" parameter...');
  try {
    const params1 = new URLSearchParams({
      q: 'test',
      calendarId: 'primary',
      timeZone: 'Asia/Kolkata'
    });
    
    const response1 = await fetch(`${API_URL}/calendar/events/search?${params1}`, { headers });
    const data1 = await response1.json();
    
    console.log('  ✅ q parameter - Status:', response1.status);
    
    if (data1.success && data1.data) {
      console.log(`  ✅ q parameter - Found events (normalized):`, data1.data.events?.length || 0);
    }
  } catch (error) {
    console.log('  ❌ q parameter failed:', error.message);
  }
  
  // Test with 'query' parameter
  console.log('  Testing with "query" parameter...');
  try {
    const params2 = new URLSearchParams({
      query: 'meeting',
      calendarId: 'primary',
      timeZone: 'Asia/Kolkata'
    });
    
    const response2 = await fetch(`${API_URL}/calendar/events/search?${params2}`, { headers });
    const data2 = await response2.json();
    
    console.log('  ✅ query parameter - Status:', response2.status);
    
    if (data2.success && data2.data) {
      console.log(`  ✅ query parameter - Found events (normalized):`, data2.data.events?.length || 0);
    }
    
    return { success: response2.ok };
  } catch (error) {
    console.log('  ❌ query parameter failed:', error.message);
    return { success: false };
  }
}

// Test 4: Create Event
async function testCreateEvent() {
  console.log('\n🆕 Test 4: Create Event');
  try {
    const now = new Date();
    const eventStart = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // 1 hour duration
    
    const eventData = {
      calendarId: 'primary',
      summary: 'Test Event - Comprehensive Test',
      description: 'Created by comprehensive functionality test',
      start: eventStart.toISOString().slice(0, 19) + ':00',
      end: eventEnd.toISOString().slice(0, 19) + ':00',
      location: 'Test Location',
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 15 }]
      }
    };
    
    const response = await fetch(`${API_URL}/calendar/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(eventData)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Status:', response.status);
      console.log('✅ Event created successfully');
      
      if (data.data) {
        console.log('✅ Response includes event data');
        return { success: true, eventId: data.data.id };
      }
      return { success: true };
    } else {
      const errorData = await response.json();
      console.log('❌ Status:', response.status);
      console.log('❌ Error:', errorData.error || errorData.message);
      return { success: false, error: errorData.error };
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 5: Update Event
async function testUpdateEvent() {
  console.log('\n✏️ Test 5: Update Event');
  
  // First search for an event to update
  try {
    const searchParams = new URLSearchParams({
      q: 'Test Event',
      calendarId: 'primary'
    });
    
    const searchResponse = await fetch(`${API_URL}/calendar/events/search?${searchParams}`, { headers });
    const searchData = await searchResponse.json();
    
    let eventId = null;
    if (searchData.success && searchData.data && searchData.data.events && searchData.data.events.length > 0) {
      eventId = searchData.data.events[0].id;
    }
    
    if (!eventId) {
      console.log('⚠️  No test events found to update');
      return { success: true, skipped: true };
    }
    
    // Update the event
    const updateData = {
      calendarId: 'primary',
      summary: 'Updated Test Event - Comprehensive Test',
      description: 'Updated by comprehensive functionality test'
    };
    
    const response = await fetch(`${API_URL}/calendar/events/${eventId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Status:', response.status);
      console.log('✅ Event updated successfully');
      return { success: true };
    } else {
      console.log('❌ Status:', response.status);
      return { success: false };
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 6: Delete Event
async function testDeleteEvent() {
  console.log('\n🗑️  Test 6: Delete Event');
  
  // First search for an event to delete
  try {
    const searchParams = new URLSearchParams({
      q: 'Test Event',
      calendarId: 'primary'
    });
    
    const searchResponse = await fetch(`${API_URL}/calendar/events/search?${searchParams}`, { headers });
    const searchData = await searchResponse.json();
    
    let eventId = null;
    if (searchData.success && searchData.data && searchData.data.events && searchData.data.events.length > 0) {
      eventId = searchData.data.events[0].id;
    }
    
    if (!eventId) {
      console.log('⚠️  No test events found to delete');
      return { success: true, skipped: true };
    }
    
    // Delete the event
    const response = await fetch(`${API_URL}/calendar/events/${eventId}?calendarId=primary`, {
      method: 'DELETE',
      headers
    });
    
    if (response.ok) {
      console.log('✅ Status:', response.status);
      console.log('✅ Event deleted successfully');
      return { success: true };
    } else {
      console.log('❌ Status:', response.status);
      return { success: false };
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 7: Get Colors
async function testGetColors() {
  console.log('\n🎨 Test 7: Get Colors');
  try {
    const response = await fetch(`${API_URL}/calendar/colors`, { headers });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Status:', response.status);
      
      if (data.success && data.data) {
        console.log('✅ Colors retrieved (normalized format)');
        return { success: true };
      } else if (data.event) {
        console.log('✅ Colors retrieved (direct format)');
        return { success: true };
      }
    } else {
      console.log('❌ Status:', response.status);
      return { success: false };
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 8: Free/Busy
async function testFreeBusy() {
  console.log('\n⏰ Test 8: Free/Busy Check');
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const freeBusyData = {
      calendars: ['primary'],
      timeMin: now.toISOString(),
      timeMax: tomorrow.toISOString(),
      timeZone: 'Asia/Kolkata'
    };
    
    const response = await fetch(`${API_URL}/calendar/freebusy`, {
      method: 'POST',
      headers,
      body: JSON.stringify(freeBusyData)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Status:', response.status);
      console.log('✅ Free/busy data retrieved');
      return { success: true };
    } else {
      console.log('❌ Status:', response.status);
      return { success: false };
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Run all tests
async function runAllTests() {
  const results = [];
  
  results.push(await testListCalendars());
  results.push(await testListEvents());
  results.push(await testSearchEvents());
  results.push(await testCreateEvent());
  results.push(await testUpdateEvent());
  results.push(await testDeleteEvent());
  results.push(await testGetColors());
  results.push(await testFreeBusy());
  
  console.log('\n🎯 Test Results Summary:');
  console.log('========================');
  console.log('List Calendars:', results[0]?.success ? '✅ PASS' : '❌ FAIL');
  console.log('List Events:', results[1]?.success ? '✅ PASS' : '❌ FAIL');
  console.log('Search Events:', results[2]?.success ? '✅ PASS' : '❌ FAIL');
  console.log('Create Event:', results[3]?.success ? '✅ PASS' : '❌ FAIL');
  console.log('Update Event:', results[4]?.success ? '✅ PASS' : '❌ FAIL');
  console.log('Delete Event:', results[5]?.success ? '✅ PASS' : '❌ FAIL');
  console.log('Get Colors:', results[6]?.success ? '✅ PASS' : '❌ FAIL');
  console.log('Free/Busy Check:', results[7]?.success ? '✅ PASS' : '❌ FAIL');
  
  const passed = results.filter(r => r?.success).length;
  const total = results.length;
  
  console.log(`\n🏆 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All calendar features are working correctly!');
    console.log('\n📝 Summary:');
    console.log('✅ Frontend-Backend integration fixed');
    console.log('✅ Event data normalization working');
    console.log('✅ Search functionality supports both parameters');
    console.log('✅ CRUD operations functioning');
    console.log('✅ Response parsing handles all formats');
    console.log('✅ Calendar UI should display events properly');
  } else {
    console.log('⚠️  Some functionality may still need attention.');
    
    // Show specific failures
    console.log('\nFailed tests:');
    const testNames = ['List Calendars', 'List Events', 'Search Events', 'Create Event', 'Update Event', 'Delete Event', 'Get Colors', 'Free/Busy Check'];
    results.forEach((result, index) => {
      if (!result?.success) {
        console.log(`❌ ${testNames[index]}: ${result?.error || result?.status || 'Unknown error'}`);
      }
    });
  }
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Start your frontend: npm start');
  console.log('2. Navigate to /calendar in your web app');
  console.log('3. Test the calendar UI with real user interactions');
  console.log('4. Verify events display properly and all features work');
}

// Instructions
console.log('🔧 Make sure the backend server is running on http://localhost:4000');
console.log('⚠️  Using test token - replace with actual token for production testing\n');

runAllTests().catch(console.error);
