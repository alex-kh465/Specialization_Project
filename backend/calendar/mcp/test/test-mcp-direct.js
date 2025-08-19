// Direct test of the MCP calendar client
import { calendarMCP } from '../index.js';

async function testMCPClient() {
    console.log('🔧 Testing MCP Client Directly...\n');
    
    try {
        // Test 1: Check status
        console.log('📊 Current MCP Status:');
        const status = calendarMCP.getStatus();
        console.log(JSON.stringify(status, null, 2));
        
        if (!status.ready) {
            console.log('⚙️ Attempting to initialize MCP client...');
            const initialized = await calendarMCP.init();
            console.log('Initialization result:', initialized);
            
            if (initialized) {
                console.log('✅ MCP client initialized successfully');
                const newStatus = calendarMCP.getStatus();
                console.log('📊 Updated Status:');
                console.log(JSON.stringify(newStatus, null, 2));
            } else {
                console.log('❌ MCP client initialization failed');
                return;
            }
        }
        
        // Test 2: List calendars
        console.log('\n📅 Testing listCalendars()...');
        try {
            const calendars = await calendarMCP.listCalendars();
            console.log('Calendar result:', JSON.stringify(calendars, null, 2));
        } catch (error) {
            console.error('❌ listCalendars() error:', error.message);
        }
        
        // Test 3: List events
        console.log('\n📋 Testing listEvents()...');
        try {
            const events = await calendarMCP.listEvents('primary', {
                timeZone: 'Asia/Kolkata'
            });
            console.log('Events result:', JSON.stringify(events, null, 2));
        } catch (error) {
            console.error('❌ listEvents() error:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testMCPClient().then(() => {
    console.log('\n🏁 Direct MCP test completed!');
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
