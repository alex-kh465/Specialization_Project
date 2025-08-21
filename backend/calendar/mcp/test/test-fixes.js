// Test script to verify calendar connection and AI chat functionality
const fetch = require('node-fetch');

const API_URL = 'http://localhost:4000';
const TEST_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6InNrSnJzWWZveWc3Ky9yMGUiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzM0NTAzNDA2LCJpYXQiOjE3MzQ0OTk4MDYsImlzcyI6Imh0dHBzOi8vbHV2dWRma2JseXpmamNoaHl1bHIuc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjA3YmNlNmZlLWNkMGEtNDgxNy04NjU3LTg3NDFhOWU5YmVlNSIsImVtYWlsIjoicmFlZWxkaGFuMjQwN0BnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7fSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTczNDQ5OTgwNn1dLCJzZXNzaW9uX2lkIjoiNDNkOTBlYjQtNzBlMS00ODg3LWE2MDUtNDY5MzJmZjhmMGI3IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.gcWJXpRi8W9EhbRU2g4UJzKNVUxvDGmgIE36Df2_-qk';

async function testCalendarConnection() {
  console.log('\n🔍 Testing Calendar Connection...');
  
  try {
    // Test calendar status
    const statusResponse = await fetch(`${API_URL}/calendar/mcp/status`, {
      headers: { 'Authorization': TEST_TOKEN }
    });
    const statusData = await statusResponse.json();
    console.log('Calendar Status:', statusData);
    
    // Test calendar setup/auth
    const setupResponse = await fetch(`${API_URL}/calendar/mcp/setup-auth`, {
      method: 'POST',
      headers: { 'Authorization': TEST_TOKEN }
    });
    const setupData = await setupResponse.json();
    console.log('Setup Auth Response:', setupData);
    
    // Test fetching calendars
    const calendarsResponse = await fetch(`${API_URL}/calendar/mcp/calendars`, {
      headers: { 'Authorization': TEST_TOKEN }
    });
    
    if (calendarsResponse.ok) {
      const calendarsData = await calendarsResponse.json();
      console.log('✅ Calendars fetched successfully:', Object.keys(calendarsData));
      console.log('Calendar count:', calendarsData.items ? calendarsData.items.length : 'Unknown format');
      return true;
    } else {
      const errorData = await calendarsResponse.json();
      console.log('❌ Calendar fetch failed:', errorData);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Calendar test error:', error.message);
    return false;
  }
}

async function testDebugChatWithoutAI() {
  console.log('\n🤖 Testing Debug Chat (No AI, Simulated)...');
  
  const testMessages = [
    'schedule a meeting tomorrow',
    'what are my events today',
    'create an event for tonight',
    'hello how are you'
  ];
  
  for (const message of testMessages) {
    try {
      console.log(`\nTesting: "${message}"`);
      const response = await fetch(`${API_URL}/ai/debug-calendar`, {
        method: 'POST',
        headers: { 
          'Authorization': TEST_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Response received');
        console.log('  - Response type:', data.debug ? 'DEBUG' : 'NORMAL');
        console.log('  - Calendar operation:', data.calendarOperation || 'None');
        console.log('  - Calendar result:', data.calendarResult ? 'Success' : 'Failed/None');
        console.log('  - Response length:', data.response.length + ' chars');
        
        if (data.response.includes('Can you please rephrase')) {
          console.log('⚠️  Generic fallback response detected');
        }
      } else {
        console.log('❌ Request failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Debug chat error:', error.message);
    }
  }
}

async function testRealAIChat() {
  console.log('\n🧠 Testing Real AI Chat...');
  
  const testMessage = 'schedule a study session tomorrow at 3pm';
  
  try {
    console.log(`Testing: "${testMessage}"`);
    const response = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: { 
        'Authorization': TEST_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: testMessage })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ AI Response received');
      console.log('  - Calendar operation:', data.calendarOperation || 'None');
      console.log('  - Calendar result:', data.calendarResult ? 'Success' : 'Failed/None');
      console.log('  - Response:', data.response.substring(0, 200) + '...');
      
      if (data.response.includes('Can you please rephrase')) {
        console.log('⚠️  Generic fallback response detected - AI parsing may have failed');
      }
    } else {
      console.log('❌ AI Chat failed:', response.status);
      const errorData = await response.text();
      console.log('Error:', errorData);
    }
  } catch (error) {
    console.error('❌ AI chat error:', error.message);
  }
}

async function testEventCreation() {
  console.log('\n📅 Testing Direct Event Creation...');
  
  try {
    const testEvent = {
      title: 'Test Event from API',
      description: 'A test event created by the API test script',
      start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 19), // 2 hours from now
      end: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 19), // 3 hours from now
      location: 'Test Location'
    };
    
    const response = await fetch(`${API_URL}/calendar/mcp/test-create`, {
      method: 'POST',
      headers: { 'Authorization': TEST_TOKEN }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Test event creation successful:', data.success);
      console.log('  - Event title:', data.event?.title);
      console.log('  - Event start:', data.event?.start);
    } else {
      const errorData = await response.json();
      console.log('❌ Test event creation failed:', errorData.error);
    }
  } catch (error) {
    console.error('❌ Event creation test error:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting GenEWA Calendar & Chat Tests');
  console.log('=====================================');
  
  const calendarConnected = await testCalendarConnection();
  
  if (calendarConnected) {
    await testEventCreation();
  }
  
  await testDebugChatWithoutAI();
  
  // Only test real AI if calendar is connected (to avoid API usage for failed tests)
  if (calendarConnected) {
    await testRealAIChat();
  }
  
  console.log('\n✨ All tests completed!');
  console.log('\nNext steps:');
  console.log('1. If calendar connection failed, check MCP server and OAuth credentials');
  console.log('2. If AI chat shows generic responses, the JSON parsing improvements should help');
  console.log('3. Try the frontend calendar page to see if UI updates properly after connection');
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch(`${API_URL}/calendar/mcp/status`, {
      headers: { 'Authorization': TEST_TOKEN }
    });
    return response.ok;
  } catch (error) {
    console.error('❌ Server not responding. Make sure backend is running on port 4000');
    console.log('Run: node index.js');
    return false;
  }
}

// Main execution
checkServer().then(serverOk => {
  if (serverOk) {
    runAllTests();
  }
});
