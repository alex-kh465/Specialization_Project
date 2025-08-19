import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000';

// Test auth token (you should replace this with a valid token)
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU1NTUxNTI1LCJpYXQiOjE3NTU1NDc5MjUsImlzc3VlciI6Imh0dHBzOi8vZHB0ZXN0Lm9uc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjdlZmM5YjE5LTFmZGUtNGRhMS05ZGJjLTJjNDk4ODUzOWI3YSIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnt9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU1NTQ3OTI1fV0sInNlc3Npb25faWQiOiIxNTNjZjExMi0xMjIwLTRiMzMtYjY4NS0yMTc3MmNmODZmNTQiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.KIDAv7UwFHGm4PnKTDjDVQpV3zDVHQ5VT3aUKtJJhrs';

const headers = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json'
};

console.log('🧪 === Web App Calendar Integration Test ===\n');

// Test 1: List Calendars (Frontend endpoint)
async function testListCalendars() {
  console.log('1️⃣ Testing List Calendars...');
  try {
    const response = await fetch(`${API_URL}/calendar/calendars`, {
      method: 'GET',
      headers
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Calendars endpoint works');
      console.log('📄 Response structure:', {
        success: data.success,
        hasData: !!data.data,
        hasMessage: data.data?.message ? 'Yes' : 'No',
        calendarsCount: data.data?.calendars?.length || 'N/A'
      });
    } else {
      console.log('❌ Calendars endpoint failed:', data.error);
    }
  } catch (error) {
    console.log('💥 Calendars test error:', error.message);
  }
  console.log();
}

// Test 2: List Events (Frontend endpoint)
async function testListEvents() {
  console.log('2️⃣ Testing List Events...');
  try {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    
    const params = new URLSearchParams({
      calendarId: 'primary',
      timeMin: now.toISOString().slice(0, 19),
      timeMax: nextMonth.toISOString().slice(0, 19),
      timeZone: 'Asia/Kolkata'
    });
    
    const response = await fetch(`${API_URL}/calendar/events?${params}`, {
      method: 'GET',
      headers
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Events endpoint works');
      console.log('📄 Response structure:', {
        success: data.success,
        hasData: !!data.data,
        hasMessage: data.data?.message ? 'Yes' : 'No',
        eventsCount: data.data?.events?.length || 'N/A'
      });
    } else {
      console.log('❌ Events endpoint failed:', data.error);
    }
  } catch (error) {
    console.log('💥 Events test error:', error.message);
  }
  console.log();
}

// Test 3: Search Events (Frontend endpoint)
async function testSearchEvents() {
  console.log('3️⃣ Testing Search Events...');
  try {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
    
    const params = new URLSearchParams({
      calendarId: 'primary',
      timeMin: now.toISOString().slice(0, 19),
      timeMax: nextMonth.toISOString().slice(0, 19),
      timeZone: 'Asia/Kolkata'
    });
    
    const response = await fetch(`${API_URL}/calendar/events/search?q=Study&${params}`, {
      method: 'GET',
      headers
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Search endpoint works');
      console.log('📄 Response structure:', {
        success: data.success,
        hasData: !!data.data,
        hasMessage: data.data?.message ? 'Yes' : 'No',
        eventsCount: data.data?.events?.length || 'N/A'
      });
    } else {
      console.log('❌ Search endpoint failed:', data.error);
    }
  } catch (error) {
    console.log('💥 Search test error:', error.message);
  }
  console.log();
}

// Test 4: Create Event (Frontend endpoint)
async function testCreateEvent() {
  console.log('4️⃣ Testing Create Event...');
  try {
    const now = new Date();
    const later = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
    
    const eventData = {
      calendarId: 'primary',
      summary: 'Web App Test Event',
      description: 'Testing event creation from web app',
      start: now.toISOString().slice(0, 19),
      end: later.toISOString().slice(0, 19),
      location: 'Test Location',
      attendees: [],
      reminders: { useDefault: true, overrides: [] }
    };
    
    const response = await fetch(`${API_URL}/calendar/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(eventData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Create event endpoint works');
      console.log('📄 Response:', data.message || 'Event created');
      return data.data?.id || 'test-id';
    } else {
      console.log('❌ Create event failed:', data.error);
    }
  } catch (error) {
    console.log('💥 Create event test error:', error.message);
  }
  console.log();
  return null;
}

// Test 5: Free/Busy Check (Frontend endpoint)
async function testFreeBusy() {
  console.log('5️⃣ Testing Free/Busy Check...');
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
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Free/busy endpoint works');
      console.log('📄 Response structure:', {
        success: data.success,
        hasData: !!data.data,
        busyPeriods: data.data?.calendars?.primary?.busy?.length || 0
      });
    } else {
      console.log('❌ Free/busy endpoint failed:', data.error);
    }
  } catch (error) {
    console.log('💥 Free/busy test error:', error.message);
  }
  console.log();
}

// Test 6: AI Chat Calendar Operations
async function testAIChatCalendar() {
  console.log('6️⃣ Testing AI Chat Calendar Operations...');
  
  // Test calendar list via AI
  try {
    console.log('  📋 Testing AI calendar list...');
    const listResponse = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: 'Can you list all my calendars?' })
    });
    
    const listData = await listResponse.json();
    
    if (listResponse.ok && listData.response) {
      console.log('✅ AI calendar list works');
      console.log('🤖 AI Response preview:', listData.response.substring(0, 100) + '...');
    } else {
      console.log('❌ AI calendar list failed');
    }
  } catch (error) {
    console.log('💥 AI calendar list error:', error.message);
  }
  
  // Test event search via AI
  try {
    console.log('  🔍 Testing AI event search...');
    const searchResponse = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: 'Search for events with "Study" in the title' })
    });
    
    const searchData = await searchResponse.json();
    
    if (searchResponse.ok && searchData.response) {
      console.log('✅ AI event search works');
      console.log('🤖 AI Response preview:', searchData.response.substring(0, 100) + '...');
    } else {
      console.log('❌ AI event search failed');
    }
  } catch (error) {
    console.log('💥 AI event search error:', error.message);
  }
  
  console.log();
}

// Run all tests
async function runAllTests() {
  await testListCalendars();
  await testListEvents();
  await testSearchEvents();
  await testCreateEvent();
  await testFreeBusy();
  await testAIChatCalendar();
  
  console.log('🏁 === Test Summary ===');
  console.log('All frontend calendar endpoints tested.');
  console.log('Check the results above for any issues.');
  console.log('\n📝 Next steps:');
  console.log('1. Start your web app frontend');
  console.log('2. Navigate to the Calendar page');
  console.log('3. Test the UI functionality');
  console.log('4. Try AI chat calendar commands');
}

runAllTests().catch(console.error);
