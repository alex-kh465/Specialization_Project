import mcpCalendarClient from './mcp-calendar-client.js';

async function testMcpOperations() {
  console.log('=== Testing MCP Calendar Operations ===');
  
  try {
    // Test connection
    console.log('1. Testing connection...');
    await mcpCalendarClient.connect();
    console.log('✅ Connected successfully');
    
    // Test listing calendars
    console.log('\n2. Testing list calendars...');
    const calendars = await mcpCalendarClient.listCalendars();
    console.log('✅ Calendars:', calendars);
    
    // Test listing events
    console.log('\n3. Testing list events...');
    const events = await mcpCalendarClient.listEvents();
    console.log('✅ Events result:', events);
    
    // Test searching events
    console.log('\n4. Testing search events...');
    const searchResult = await mcpCalendarClient.searchEvents('primary', 'test');
    console.log('✅ Search result:', searchResult);
    
    // Test create event with proper ISO dates
    console.log('\n5. Testing create event...');
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    const testEvent = {
      title: 'Test Event - MCP',
      description: 'Testing MCP calendar creation',
      start: mcpCalendarClient.toIso8601(now.toISOString()),
      end: mcpCalendarClient.toIso8601(oneHourLater.toISOString()),
      timeZone: 'Asia/Kolkata'
    };
    
    console.log('Event data:', testEvent);
    const createResult = await mcpCalendarClient.createEvent(testEvent);
    console.log('✅ Create result:', createResult);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await mcpCalendarClient.disconnect();
  }
}

testMcpOperations();
