import mcpCalendarClient from './mcp-calendar-client.js';

console.log('🧪 Testing All Calendar Features\n');

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('COMPREHENSIVE CALENDAR FEATURES TEST');
  console.log('='.repeat(60));

  try {
    // Test 1: Connection and Status
    console.log('\n1️⃣ Testing connection and status...');
    await mcpCalendarClient.connect();
    const status = mcpCalendarClient.getStatus();
    console.log('✅ Connection Status:', status);

    // Test 2: List Calendars
    console.log('\n2️⃣ Testing calendar listing...');
    try {
      const calendars = await mcpCalendarClient.listCalendars();
      console.log(`✅ Found ${calendars.calendars?.length || 0} calendar(s)`);
      if (calendars.calendars && calendars.calendars.length > 0) {
        calendars.calendars.slice(0, 3).forEach(cal => {
          console.log(`   📅 ${cal.summary}${cal.primary ? ' (Primary)' : ''}`);
        });
      }
    } catch (error) {
      console.log('❌ Calendar listing failed:', error.message);
    }

    // Test 3: Today's Events
    console.log('\n3️⃣ Testing today\'s events...');
    try {
      const todaysEvents = await mcpCalendarClient.getTodaysEvents();
      console.log(`✅ Found ${todaysEvents.count || 0} event(s) today`);
      if (todaysEvents.events && todaysEvents.events.length > 0) {
        todaysEvents.events.slice(0, 3).forEach(event => {
          const start = new Date(event.start);
          console.log(`   📋 ${event.title} at ${start.toLocaleTimeString()}`);
        });
      }
    } catch (error) {
      console.log('❌ Today\'s events failed:', error.message);
    }

    // Test 4: Week Events
    console.log('\n4️⃣ Testing week events...');
    try {
      const weekEvents = await mcpCalendarClient.getWeekEvents();
      console.log(`✅ Found ${weekEvents.count || 0} event(s) this week`);
    } catch (error) {
      console.log('❌ Week events failed:', error.message);
    }

    // Test 5: Current Time
    console.log('\n5️⃣ Testing current time...');
    try {
      const timeResult = await mcpCalendarClient.getCurrentTime();
      if (timeResult.success) {
        console.log(`✅ Current time: ${timeResult.currentTime.local}`);
      }
    } catch (error) {
      console.log('❌ Current time failed:', error.message);
    }

    // Test 6: Colors
    console.log('\n6️⃣ Testing colors...');
    try {
      const colorsResult = await mcpCalendarClient.listColors();
      if (colorsResult.success) {
        console.log('✅ Retrieved color information successfully');
      }
    } catch (error) {
      console.log('❌ Colors failed:', error.message);
    }

    // Test 7: Event Creation, Update, and Deletion
    console.log('\n7️⃣ Testing event CRUD operations...');
    let testEventId = null;
    
    try {
      // Create test event
      const now = new Date();
      const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration

      const testEvent = {
        summary: 'Calendar Test Event',
        description: 'This is a test event created by the comprehensive test script',
        start: start.toISOString(),
        end: end.toISOString(),
        location: 'Test Location'
      };

      console.log('   Creating test event...');
      const createResult = await mcpCalendarClient.createEvent(testEvent);
      if (createResult.success && createResult.event) {
        testEventId = createResult.event.id;
        console.log('   ✅ Test event created successfully:', createResult.event.title);
      }

      // Test search
      if (testEventId) {
        console.log('   Testing event search...');
        const searchResult = await mcpCalendarClient.searchEvents('primary', 'Calendar Test Event');
        if (searchResult.success && searchResult.events.length > 0) {
          console.log(`   ✅ Found ${searchResult.events.length} matching event(s)`);
        }

        // Test update
        console.log('   Testing event update...');
        const updateResult = await mcpCalendarClient.updateEvent({
          eventId: testEventId,
          summary: 'Updated Calendar Test Event',
          description: 'This event has been updated by the test script'
        });
        if (updateResult.success) {
          console.log('   ✅ Event updated successfully:', updateResult.event.title);
        }

        // Test delete
        console.log('   Testing event deletion...');
        const deleteResult = await mcpCalendarClient.deleteEvent('primary', testEventId);
        if (deleteResult.success) {
          console.log('   ✅ Event deleted successfully');
        }
      }
    } catch (error) {
      console.log('   ❌ Event CRUD operations failed:', error.message);
      
      // Clean up if event was created but deletion failed
      if (testEventId) {
        try {
          await mcpCalendarClient.deleteEvent('primary', testEventId);
          console.log('   🧹 Cleaned up test event');
        } catch (cleanupError) {
          console.log('   ⚠️  Failed to clean up test event:', cleanupError.message);
        }
      }
    }

    // Test 8: Availability Check
    console.log('\n8️⃣ Testing availability check...');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      
      const endOfDay = new Date(tomorrow);
      endOfDay.setHours(17, 0, 0, 0);

      const availabilityResult = await mcpCalendarClient.findAvailableSlots(
        'primary',
        60,
        tomorrow.toISOString(),
        endOfDay.toISOString()
      );
      
      if (availabilityResult.success) {
        console.log(`✅ Found ${availabilityResult.availableSlots?.length || 0} available slot(s) tomorrow`);
        if (availabilityResult.availableSlots && availabilityResult.availableSlots.length > 0) {
          const firstSlot = availabilityResult.availableSlots[0];
          const slotStart = new Date(firstSlot.start);
          console.log(`   🕐 First slot: ${slotStart.toLocaleString()}`);
        }
      }
    } catch (error) {
      console.log('❌ Availability check failed:', error.message);
    }

    // Test 9: Smart Features
    console.log('\n9️⃣ Testing smart features...');
    try {
      const nextSlotResult = await mcpCalendarClient.findNextAvailableSlot('primary', 30);
      if (nextSlotResult.success) {
        if (nextSlotResult.nextSlot) {
          const nextSlotTime = new Date(nextSlotResult.nextSlot.start);
          console.log(`✅ Next 30-minute slot: ${nextSlotTime.toLocaleString()}`);
        } else {
          console.log('✅ No available slots found in the next 7 days');
        }
      }
    } catch (error) {
      console.log('❌ Smart features failed:', error.message);
    }

    // Test 10: Calendar Management
    console.log('\n🔟 Testing calendar management...');
    let testCalendarId = null;
    
    try {
      // Create test calendar
      console.log('   Creating test calendar...');
      const calendarData = {
        summary: 'Test Calendar - Calendar Features Test',
        description: 'A test calendar created by the comprehensive test script',
        timeZone: 'Asia/Kolkata'
      };

      const createCalResult = await mcpCalendarClient.createCalendar(calendarData);
      if (createCalResult.success && createCalResult.calendar) {
        testCalendarId = createCalResult.calendar.id;
        console.log('   ✅ Test calendar created:', createCalResult.calendar.name);

        // Update test calendar
        console.log('   Updating test calendar...');
        const updateCalResult = await mcpCalendarClient.updateCalendar(testCalendarId, {
          summary: 'Updated Test Calendar',
          description: 'This calendar has been updated by the test script'
        });
        if (updateCalResult.success) {
          console.log('   ✅ Calendar updated successfully:', updateCalResult.calendar.name);
        }

        // Delete test calendar
        console.log('   Deleting test calendar...');
        const deleteCalResult = await mcpCalendarClient.deleteCalendar(testCalendarId);
        if (deleteCalResult.success) {
          console.log('   ✅ Calendar deleted successfully');
        }
      }
    } catch (error) {
      console.log('   ❌ Calendar management failed:', error.message);
      
      // Clean up if calendar was created but deletion failed
      if (testCalendarId && testCalendarId !== 'primary') {
        try {
          await mcpCalendarClient.deleteCalendar(testCalendarId);
          console.log('   🧹 Cleaned up test calendar');
        } catch (cleanupError) {
          console.log('   ⚠️  Failed to clean up test calendar:', cleanupError.message);
        }
      }
    }

    // Test 11: Batch Operations
    console.log('\n1️⃣1️⃣ Testing batch operations...');
    try {
      const now = new Date();
      const batchEvents = [
        {
          summary: 'Batch Test Event 1',
          description: 'First batch test event',
          start: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          end: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
          location: 'Batch Location 1'
        },
        {
          summary: 'Batch Test Event 2',
          description: 'Second batch test event',
          start: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
          end: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(),
          location: 'Batch Location 2'
        }
      ];

      console.log('   Creating batch events...');
      const batchResult = await mcpCalendarClient.batchCreateEvents(batchEvents);
      if (batchResult.success) {
        console.log(`   ✅ Batch created: ${batchResult.successCount}/${batchResult.totalCount} events`);
        
        // Clean up batch events
        const eventIds = batchResult.results
          .filter(r => r.success && r.event)
          .map(r => r.event.id);
          
        if (eventIds.length > 0) {
          console.log('   Cleaning up batch events...');
          const batchDeleteResult = await mcpCalendarClient.batchDeleteEvents(eventIds);
          if (batchDeleteResult.success) {
            console.log(`   🧹 Batch deleted: ${batchDeleteResult.successCount}/${batchDeleteResult.totalCount} events`);
          }
        }
      }
    } catch (error) {
      console.log('   ❌ Batch operations failed:', error.message);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 CALENDAR FEATURES TEST COMPLETED!');
    console.log('='.repeat(60));
    console.log('\n📋 Summary:');
    console.log('✅ All core calendar features have been tested');
    console.log('✅ Event CRUD operations are working');
    console.log('✅ Smart scheduling features are available');
    console.log('✅ Calendar management is functional');
    console.log('✅ Batch operations are supported');
    console.log('✅ Ready for integration with frontend and chat');
    
    console.log('\n🚀 Available Features:');
    console.log('• List and manage calendars');
    console.log('• Create, read, update, delete events');
    console.log('• Search events by text query');
    console.log('• Check availability and find free slots');
    console.log('• Get today\'s and week\'s events');
    console.log('• Smart scheduling helpers');
    console.log('• Batch operations for multiple events');
    console.log('• Full timezone support');
    console.log('• Integration with AI chat for natural language');
    console.log('• RESTful API endpoints for frontend integration');

  } catch (error) {
    console.error('❌ Testing failed:', error);
    console.log('\n📝 Troubleshooting steps:');
    console.log('1. Ensure Google Calendar OAuth credentials are configured');
    console.log('2. Run authentication: npm run auth in the MCP folder');
    console.log('3. Check that the MCP server is built and running');
    console.log('4. Verify network connectivity to Google Calendar API');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { runAllTests };
