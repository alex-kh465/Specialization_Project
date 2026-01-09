import { calendarMCP } from '../index.js';

async function testCalendarMCP() {
  console.log('🧪 Testing Calendar MCP functionality...\n');

  try {
    // Test 1: Initialize the calendar MCP
    console.log('1️⃣ Initializing Calendar MCP...');
    const initResult = await calendarMCP.init();
    console.log(`   ✅ Initialization: ${initResult ? 'SUCCESS' : 'FAILED'}`);
    
    if (!initResult) {
      console.log('   ❌ Cannot proceed with tests - initialization failed');
      console.log('   💡 Make sure you have proper credentials and tokens set up');
      return;
    }

    // Test 2: Get status
    console.log('\n2️⃣ Getting Calendar MCP status...');
    const status = calendarMCP.getStatus();
    console.log('   📊 Status:', JSON.stringify(status, null, 2));

    // Test 3: List calendars
    console.log('\n3️⃣ Testing list calendars...');
    try {
      const calendars = await calendarMCP.listCalendars();
      console.log('   ✅ List calendars: SUCCESS');
      console.log('   📅 Found calendars:', calendars?.calendars?.length || 0);
      if (calendars?.calendars?.length > 0) {
        calendars.calendars.forEach(cal => {
          console.log(`      - ${cal.summary || cal.name}${cal.primary ? ' (Primary)' : ''}`);
        });
      }
    } catch (error) {
      console.log('   ❌ List calendars failed:', error.message);
    }

    // Test 4: List events
    console.log('\n4️⃣ Testing list events...');
    try {
      const events = await calendarMCP.listEvents('primary', {
        timeMin: new Date().toISOString(),
        timeMax: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
      console.log('   ✅ List events: SUCCESS');
      console.log('   📅 Found events:', events?.events?.length || 0);
      if (events?.events?.length > 0) {
        events.events.slice(0, 3).forEach(event => {
          const start = new Date(event.start?.dateTime || event.start?.date);
          console.log(`      - ${event.summary || event.title} (${start.toLocaleDateString()})`);
        });
      }
    } catch (error) {
      console.log('   ❌ List events failed:', error.message);
    }

    // Test 5: Search events
    console.log('\n5️⃣ Testing search events...');
    try {
      const searchResults = await calendarMCP.searchEvents('primary', 'test', {
        timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      console.log('   ✅ Search events: SUCCESS');
      console.log('   🔍 Search results:', searchResults?.events?.length || 0);
    } catch (error) {
      console.log('   ❌ Search events failed:', error.message);
    }

    // Test 6: Create a test event
    console.log('\n6️⃣ Testing create event...');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(15, 0, 0, 0);
      const endTime = new Date(tomorrow);
      endTime.setHours(16, 0, 0, 0);

      const testEvent = {
        summary: 'Calendar MCP Test Event',
        description: 'This is a test event created by the Calendar MCP test script',
        start: tomorrow.toISOString(),
        end: endTime.toISOString(),
        calendarId: 'primary'
      };

      const createResult = await calendarMCP.createEvent(testEvent);
      if (createResult?.success) {
        console.log('   ✅ Create event: SUCCESS');
        console.log(`   📅 Created event: "${createResult.event?.summary || testEvent.summary}"`);
        
        // Clean up - delete the test event
        if (createResult.event?.id) {
          console.log('\n🧹 Cleaning up test event...');
          try {
            const deleteResult = await calendarMCP.deleteEvent('primary', createResult.event.id);
            console.log('   ✅ Test event deleted successfully');
          } catch (deleteError) {
            console.log('   ⚠️ Could not delete test event:', deleteError.message);
          }
        }
      } else {
        console.log('   ❌ Create event failed:', createResult?.error || 'Unknown error');
      }
    } catch (error) {
      console.log('   ❌ Create event failed:', error.message);
    }

    console.log('\n🎉 Calendar MCP test completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testCalendarMCP().then(() => {
  console.log('\n✅ Test script finished');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Test script failed:', error);
  process.exit(1);
});
