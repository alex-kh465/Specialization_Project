import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000';
const TEST_TOKEN = 'test_token_placeholder'; // You'll need a real token

const testEndpoints = async () => {
  console.log('🧪 Testing MCP Calendar Endpoints...\n');
  
  // Test endpoints without authentication for now - just checking structure
  const endpoints = [
    {
      name: 'Calendar Status',
      url: `${API_URL}/calendar/mcp/status`,
      method: 'GET'
    },
    {
      name: 'List Calendars',
      url: `${API_URL}/calendar/mcp/calendars`,
      method: 'GET'
    },
    {
      name: 'List Events',
      url: `${API_URL}/calendar/mcp/events?calendarId=primary`,
      method: 'GET'
    },
    {
      name: 'Search Events',
      url: `${API_URL}/calendar/mcp/search?query=test&calendarId=primary`,
      method: 'GET'
    },
    {
      name: 'Get Colors',
      url: `${API_URL}/calendar/mcp/colors`,
      method: 'GET'
    },
    {
      name: 'Get Current Time',
      url: `${API_URL}/calendar/mcp/time?timeZone=Asia/Kolkata`,
      method: 'GET'
    }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testing ${endpoint.name}...`);
      console.log(`   ${endpoint.method} ${endpoint.url}`);
      
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Response structure:`, Object.keys(data));
        
        // Show sample data structure
        if (data.calendars) {
          console.log(`      - calendars: ${data.calendars.length} items`);
        }
        if (data.events) {
          console.log(`      - events: ${data.events.length} items`);
        }
        if (data.message) {
          console.log(`      - message: "${data.message.substring(0, 100)}..."`);
        }
      } else {
        const errorData = await response.json();
        console.log(`   ❌ Error: ${errorData.error || 'Unknown error'}`);
        if (errorData.setupRequired) {
          console.log(`   ⚠️  Setup required: ${errorData.instructions || 'Check setup'}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
  }
  
  console.log('\n🏁 Endpoint testing completed!');
};

// Test the direct MCP client functionality
const testMCPClient = async () => {
  console.log('\n🔧 Testing MCP Client Directly...\n');
  
  try {
    const { calendarMCP } = await import('./calendar/mcp/index.js');
    
    console.log('📊 Current MCP Status:');
    const status = calendarMCP.getStatus();
    console.log(JSON.stringify(status, null, 2));
    
    if (status.ready && status.authenticated) {
      console.log('\n🎯 Testing MCP Operations...');
      
      // Test list calendars
      try {
        const calendars = await calendarMCP.listCalendars();
        console.log('✅ listCalendars() response type:', typeof calendars);
        console.log('✅ listCalendars() keys:', Object.keys(calendars || {}));
        if (calendars.message) {
          console.log('✅ Has message field (text-based response)');
        }
        if (calendars.calendars) {
          console.log('✅ Has calendars field (structured response)');
        }
      } catch (err) {
        console.log('❌ listCalendars() failed:', err.message);
      }
      
      // Test list events
      try {
        const events = await calendarMCP.listEvents('primary');
        console.log('\n✅ listEvents() response type:', typeof events);
        console.log('✅ listEvents() keys:', Object.keys(events || {}));
        if (events.message) {
          console.log('✅ Has message field (text-based response)');
        }
        if (events.events) {
          console.log('✅ Has events field (structured response)');
        }
      } catch (err) {
        console.log('❌ listEvents() failed:', err.message);
      }
    } else {
      console.log('⚠️ MCP client not ready - skipping operation tests');
    }
  } catch (error) {
    console.log('❌ MCP Client test failed:', error.message);
  }
};

// Run tests  
(async () => {
  await testMCPClient();
  console.log('\n' + '='.repeat(50));
  await testEndpoints();
})();
