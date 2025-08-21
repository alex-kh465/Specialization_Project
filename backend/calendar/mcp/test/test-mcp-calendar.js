// Example usage of MCP Calendar endpoints
// Run this after setting up Google OAuth credentials

const API_BASE = 'http://localhost:4000';
let authToken = '.google-tokens.json'; // Replace with actual JWT token

async function testMCPCalendarEndpoints() {
  console.log('🚀 Testing MCP Calendar Integration\n');

  try {
    // Test 1: List Calendars
    console.log('📅 Testing: List Calendars');
    const calendarsResponse = await fetch(`${API_BASE}/calendar/mcp/calendars`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (calendarsResponse.ok) {
      const calendars = await calendarsResponse.json();
      console.log('✅ Calendars:', JSON.stringify(calendars, null, 2));
    } else {
      console.log('❌ Error listing calendars:', calendarsResponse.status);
    }

    // Test 2: Get Current Time
    console.log('\n🕐 Testing: Current Time');
    const timeResponse = await fetch(`${API_BASE}/calendar/mcp/time?timeZone=Asia/Kolkata`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (timeResponse.ok) {
      const time = await timeResponse.json();
      console.log('✅ Current Time:', JSON.stringify(time, null, 2));
    } else {
      console.log('❌ Error getting time:', timeResponse.status);
    }

    // Test 3: List Colors
    console.log('\n🎨 Testing: List Colors');
    const colorsResponse = await fetch(`${API_BASE}/calendar/mcp/colors`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (colorsResponse.ok) {
      const colors = await colorsResponse.json();
      console.log('✅ Colors:', JSON.stringify(colors, null, 2));
    } else {
      console.log('❌ Error listing colors:', colorsResponse.status);
    }

    // Test 4: Create Event
    console.log('\n📝 Testing: Create Event');
    const eventData = {
      calendarId: 'primary',
      summary: 'MCP Test Event',
      description: 'Testing the MCP Calendar integration',
      start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19), // Tomorrow
      end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString().slice(0, 19), // +1 hour
      timeZone: 'Asia/Kolkata',
      location: 'Test Location',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 15 }
        ]
      }
    };

    const createResponse = await fetch(`${API_BASE}/calendar/mcp/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });
    
    if (createResponse.ok) {
      const createdEvent = await createResponse.json();
      console.log('✅ Event Created:', JSON.stringify(createdEvent, null, 2));
      
      // Test 5: Update the created event
      const eventId = createdEvent.id;
      if (eventId) {
        console.log('\n✏️ Testing: Update Event');
        const updateData = {
          summary: 'MCP Test Event - Updated',
          description: 'Updated description via MCP'
        };

        const updateResponse = await fetch(`${API_BASE}/calendar/mcp/events/${eventId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });
        
        if (updateResponse.ok) {
          const updatedEvent = await updateResponse.json();
          console.log('✅ Event Updated:', JSON.stringify(updatedEvent, null, 2));
        } else {
          console.log('❌ Error updating event:', updateResponse.status);
        }

        // Test 6: Search for the event
        console.log('\n🔍 Testing: Search Events');
        const searchResponse = await fetch(`${API_BASE}/calendar/mcp/search?query=MCP Test&timeMin=${new Date().toISOString().slice(0, 19)}&timeMax=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19)}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        if (searchResponse.ok) {
          const searchResults = await searchResponse.json();
          console.log('✅ Search Results:', JSON.stringify(searchResults, null, 2));
        } else {
          console.log('❌ Error searching events:', searchResponse.status);
        }
      }
    } else {
      console.log('❌ Error creating event:', createResponse.status, await createResponse.text());
    }

    // Test 7: List Events
    console.log('\n📋 Testing: List Events');
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const eventsResponse = await fetch(`${API_BASE}/calendar/mcp/events?timeMin=${now.toISOString().slice(0, 19)}&timeMax=${nextWeek.toISOString().slice(0, 19)}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (eventsResponse.ok) {
      const events = await eventsResponse.json();
      console.log('✅ Events:', JSON.stringify(events, null, 2));
    } else {
      console.log('❌ Error listing events:', eventsResponse.status);
    }

    // Test 8: Free/Busy Query
    console.log('\n🗓️ Testing: Free/Busy Query');
    const freeBusyData = {
      calendars: ['primary'],
      timeMin: now.toISOString().slice(0, 19),
      timeMax: nextWeek.toISOString().slice(0, 19),
      timeZone: 'Asia/Kolkata'
    };

    const freeBusyResponse = await fetch(`${API_BASE}/calendar/mcp/freebusy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(freeBusyData)
    });
    
    if (freeBusyResponse.ok) {
      const freeBusy = await freeBusyResponse.json();
      console.log('✅ Free/Busy:', JSON.stringify(freeBusy, null, 2));
    } else {
      console.log('❌ Error getting free/busy:', freeBusyResponse.status);
    }

    // Test 9: Smart Availability
    console.log('\n🎯 Testing: Smart Availability');
    const availabilityData = {
      calendars: ['primary'],
      timeMin: now.toISOString().slice(0, 19),
      timeMax: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19), // Next 24 hours
      duration: 60, // 1 hour slots
      timeZone: 'Asia/Kolkata'
    };

    const availabilityResponse = await fetch(`${API_BASE}/calendar/mcp/availability`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(availabilityData)
    });
    
    if (availabilityResponse.ok) {
      const availability = await availabilityResponse.json();
      console.log('✅ Available Slots:', JSON.stringify(availability.availableSlots.slice(0, 5), null, 2)); // Show first 5 slots
    } else {
      console.log('❌ Error getting availability:', availabilityResponse.status);
    }

    console.log('\n🎉 MCP Calendar Integration Test Complete!');

  } catch (error) {
    console.error('❌ Test Error:', error);
  }
}

// Test AI Chat with Calendar Integration
async function testAICalendarIntegration() {
  console.log('\n🤖 Testing: AI Chat Calendar Integration');
  
  try {
    const chatResponse = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "Schedule a study session for tomorrow at 2 PM for 2 hours in the library"
      })
    });
    
    if (chatResponse.ok) {
      const chatResult = await chatResponse.json();
      console.log('✅ AI Chat Response:', JSON.stringify(chatResult, null, 2));
    } else {
      console.log('❌ Error with AI chat:', chatResponse.status);
    }
  } catch (error) {
    console.error('❌ AI Chat Test Error:', error);
  }
}

// Instructions for setup
function showSetupInstructions() {
  console.log(`
🔧 SETUP INSTRUCTIONS:

1. Make sure you have Google OAuth credentials set up:
   - Set the GOOGLE_OAUTH_CREDENTIALS environment variable
   - Point it to your Google Cloud OAuth credentials JSON file

2. Update the authToken variable in this script:
   - Get a JWT token by logging into your app
   - Replace 'YOUR_JWT_TOKEN' with the actual token

3. Start your backend server:
   npm start

4. Run this test script:
   node test-mcp-calendar.js

📚 Available Endpoints:
- GET /calendar/mcp/calendars - List calendars
- GET /calendar/mcp/events - List events
- GET /calendar/mcp/search - Search events
- POST /calendar/mcp/events - Create event
- PUT /calendar/mcp/events/:id - Update event  
- DELETE /calendar/mcp/events/:id - Delete event
- POST /calendar/mcp/freebusy - Get availability
- GET /calendar/mcp/time - Get current time
- GET /calendar/mcp/colors - List event colors
- POST /calendar/mcp/events/batch - Batch operations
- POST /calendar/mcp/availability - Smart scheduling

🎯 Features Available:
✅ Multi-calendar support
✅ Advanced event search
✅ Recurring event management
✅ Smart timezone handling
✅ Free/busy queries
✅ Batch operations
✅ Event colors & reminders
✅ AI-powered scheduling
✅ Attendee management
✅ Natural language processing
  `);
}

// Run tests if authToken is set, otherwise show instructions
if (authToken === 'YOUR_JWT_TOKEN') {
  showSetupInstructions();
} else {
  testMCPCalendarEndpoints()
    .then(() => testAICalendarIntegration())
    .catch(console.error);
}
