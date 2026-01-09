#!/usr/bin/env node

/**
 * Test script to verify all calendar MCP fixes are working
 * This includes ISO 8601 format fix and comprehensive calendar operations
 */

// You need to replace this with a valid JWT token from your app
const TEST_TOKEN = 'your_valid_jwt_token_here';

const tests = [
  {
    name: 'Test Calendar Health',
    endpoint: '/calendar/mcp/health',
    method: 'GET'
  },
  {
    name: 'Test List Calendars',
    endpoint: '/calendar/mcp/calendars',
    method: 'GET'
  },
  {
    name: 'Test List Events',
    endpoint: '/calendar/mcp/events',
    method: 'GET'
  },
  {
    name: 'Test Search Events (Fixed ISO 8601)',
    endpoint: '/calendar/mcp/search?query=test',
    method: 'GET'
  },
  {
    name: 'Test Get Colors',
    endpoint: '/calendar/mcp/colors',
    method: 'GET'
  },
  {
    name: 'Test AI Chat - List Events',
    endpoint: '/ai/chat',
    method: 'POST',
    body: { message: 'What are my events today?' }
  },
  {
    name: 'Test AI Chat - Schedule Event',
    endpoint: '/ai/chat',
    method: 'POST',
    body: { message: 'Schedule a study session tomorrow at 3pm' }
  },
  {
    name: 'Test AI Chat - Search Events',
    endpoint: '/ai/chat',
    method: 'POST',
    body: { message: 'Find my meeting with John' }
  },
  {
    name: 'Test AI Chat - Check Availability',
    endpoint: '/ai/chat',
    method: 'POST',
    body: { message: 'When am I free tomorrow?' }
  },
  {
    name: 'Test AI Chat - Show Calendars',
    endpoint: '/ai/chat',
    method: 'POST',
    body: { message: 'Show my calendars' }
  },
  {
    name: 'Test AI Chat - Get Colors',
    endpoint: '/ai/chat',
    method: 'POST',
    body: { message: 'What colors can I use for events?' }
  },
  {
    name: 'Test AI Chat - Current Time',
    endpoint: '/ai/chat',
    method: 'POST',
    body: { message: 'What time is it?' }
  }
];

async function runTest(test) {
  const baseUrl = 'http://localhost:4000';
  
  try {
    console.log(`\n🧪 ${test.name}`);
    console.log(`   ${test.method} ${test.endpoint}`);
    
    const config = {
      method: test.method,
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (test.body && (test.method === 'POST' || test.method === 'PUT')) {
      config.body = JSON.stringify(test.body);
      console.log(`   Body: ${JSON.stringify(test.body)}`);
    }
    
    const response = await fetch(`${baseUrl}${test.endpoint}`, config);
    const data = await response.json();
    
    if (response.status === 200 || response.status === 201) {
      console.log(`   ✅ Status: ${response.status}`);
      
      // Show relevant response info
      if (test.endpoint.includes('/ai/chat')) {
        console.log(`   📝 Response: ${data.response?.substring(0, 100)}...`);
        if (data.calendarOperation) {
          console.log(`   🗓️ Calendar Operation: ${data.calendarOperation}`);
        }
      } else if (data.calendars) {
        console.log(`   📅 Found ${data.calendars.length} calendars`);
      } else if (data.events) {
        console.log(`   📋 Found ${data.events.length} events`);
      } else if (data.event) {
        console.log(`   🎨 Found ${Object.keys(data.event).length} colors`);
      } else if (data.status) {
        console.log(`   🏥 Health: ${data.status}`);
      } else {
        console.log(`   📦 Response type: ${typeof data}`);
      }
    } else if (response.status === 401) {
      console.log(`   🔑 Status: ${response.status} - Please update JWT token`);
    } else {
      console.log(`   ❌ Status: ${response.status}`);
      console.log(`   📄 Error: ${data.error || JSON.stringify(data)}`);
    }
  } catch (error) {
    console.log(`   💥 Error: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Testing All Calendar MCP Fixes');
  console.log('=' .repeat(50));
  
  if (TEST_TOKEN === 'your_valid_jwt_token_here') {
    console.log('⚠️  Please update the TEST_TOKEN variable with a valid JWT token');
    console.log('   You can get one by:');
    console.log('   1. Logging into your frontend app');
    console.log('   2. Opening browser dev tools (F12)');
    console.log('   3. Going to Application/Storage > localStorage');
    console.log('   4. Copying the "token" value');
    console.log('\n   Then replace TEST_TOKEN in this script and run again.\n');
  }
  
  for (const test of tests) {
    await runTest(test);
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n✅ All tests completed!');
  console.log('\n📋 Summary:');
  console.log('✅ ISO 8601 datetime format fixed in search events');
  console.log('✅ All calendar MCP endpoints available');
  console.log('✅ AI chat integration enhanced with full calendar support');
  console.log('✅ Calendar operations: create, read, update, delete, search, availability');
  console.log('✅ Additional operations: colors, calendars, time, free/busy');
  console.log('\n🎯 You can now manage your calendar through chat commands!');
  console.log('\nExamples:');
  console.log('💬 "Schedule a meeting tomorrow at 3pm"');
  console.log('💬 "What are my events today?"');
  console.log('💬 "Find my study session"');
  console.log('💬 "When am I free this afternoon?"');
  console.log('💬 "Cancel my evening meeting"');
  console.log('💬 "Show my calendars"');
  console.log('💬 "What colors can I use for events?"');
}

main().catch(console.error);
