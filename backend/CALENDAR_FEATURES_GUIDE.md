# Calendar Features Implementation Guide

## Overview

This guide documents the comprehensive calendar features implemented for the GenEwa backend system. The implementation includes two calendar clients:

1. **Original MCP Client** (`mcp-calendar-client.js`) - Uses the existing MCP server
2. **New Improved Client** (`mcp-calendar-client-new.js`) - Direct Google Calendar API integration

## New Calendar Features Structure

```
backend/
├── calendar/
│   ├── mcp/                           # New improved calendar implementation
│   │   ├── package.json              # Dependencies for new implementation
│   │   ├── google-calendar.js        # Core Google Calendar API wrapper
│   │   ├── calendar-client.js        # Enhanced client with retry logic
│   │   ├── index.js                  # Main MCP service
│   │   ├── auth.js                   # Authentication helper
│   │   └── test.js                   # Test suite
│   └── google-calendar-mcp/          # Original MCP server (reference)
├── mcp-calendar-client.js            # Original MCP client
├── mcp-calendar-client-new.js        # New improved client wrapper
├── calendar-endpoints.js             # RESTful API endpoints
└── test-all-calendar-features.js     # Comprehensive test script
```

## Available Calendar Features

### 1. Calendar Management
- **List Calendars**: Get all user calendars with detailed information
- **Create Calendar**: Create new calendars with custom settings
- **Update Calendar**: Modify calendar properties
- **Delete Calendar**: Remove calendars (except primary)

### 2. Event Operations
- **Create Event**: Add new events with full customization
- **List Events**: Get events from calendars with time filtering
- **Search Events**: Find events by text query across fields
- **Update Event**: Modify existing events
- **Delete Event**: Remove events with notification options
- **Get Event**: Retrieve specific event details

### 3. Smart Scheduling
- **Today's Events**: Quick access to today's schedule
- **Week Events**: Get current week's events
- **Find Available Slots**: Discover free time periods
- **Next Available Slot**: Find the next open time slot
- **Free/Busy Information**: Check calendar availability

### 4. Batch Operations
- **Batch Create Events**: Create multiple events in one operation
- **Batch Delete Events**: Remove multiple events efficiently
- **Search and Update**: Find and modify events in one call
- **Search and Delete**: Find and remove events in one call

### 5. Utility Features
- **Current Time**: Get time in any timezone
- **List Colors**: Available event colors
- **Service Status**: Check calendar service health
- **Connection Management**: Robust error handling and retries

## API Endpoints

### Calendar Operations
```
GET    /calendar/calendars              - List all calendars
POST   /calendar/calendars              - Create new calendar
PUT    /calendar/calendars/:id          - Update calendar
DELETE /calendar/calendars/:id          - Delete calendar
```

### Event Operations
```
GET    /calendar/events                 - List events
GET    /calendar/events/today           - Get today's events
GET    /calendar/events/week            - Get week events
GET    /calendar/events/search          - Search events
GET    /calendar/events/:id             - Get specific event
POST   /calendar/events                 - Create event
PUT    /calendar/events/:id             - Update event
DELETE /calendar/events/:id             - Delete event
```

### Smart Scheduling
```
POST   /calendar/freebusy               - Get free/busy info
POST   /calendar/availability           - Find available slots
GET    /calendar/availability/next      - Next available slot
PUT    /calendar/events/search/:query   - Search and update
DELETE /calendar/events/search/:query   - Search and delete
```

### Batch Operations
```
POST   /calendar/events/batch           - Batch create events
DELETE /calendar/events/batch           - Batch delete events
```

### Utility
```
GET    /calendar/time                   - Current time
GET    /calendar/colors                 - Available colors
GET    /calendar/status                 - Service status
GET    /calendar/health                 - Health check
```

## Usage Examples

### Frontend JavaScript Examples

#### List Today's Events
```javascript
const response = await fetch('/calendar/events/today', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
console.log('Today\'s events:', data.data.events);
```

#### Create an Event
```javascript
const eventData = {
  summary: 'Study Session',
  description: 'Mathematics study group',
  start: '2025-08-19T15:00:00',
  end: '2025-08-19T17:00:00',
  location: 'Library Room 201',
  attendees: ['friend@example.com']
};

const response = await fetch('/calendar/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(eventData)
});
```

#### Search Events
```javascript
const response = await fetch('/calendar/events/search?q=meeting&timeZone=Asia/Kolkata', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
console.log('Search results:', data.data.events);
```

#### Find Available Slots
```javascript
const availabilityData = {
  calendarId: 'primary',
  duration: 60,
  timeMin: '2025-08-19T09:00:00',
  timeMax: '2025-08-19T17:00:00'
};

const response = await fetch('/calendar/availability', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(availabilityData)
});
```

### Chat Integration Examples

The calendar features are integrated with the AI chat system. Users can:

```
"What are my events today?"          → Lists today's events
"Schedule a meeting tomorrow at 3pm" → Creates new event
"Find my dentist appointment"        → Searches events
"Move my 6pm meeting to 7pm"         → Updates event
"Cancel my evening study session"    → Deletes event
"When am I free tomorrow?"           → Checks availability
"Show my calendars"                  → Lists calendars
```

## Authentication Setup

### 1. Copy OAuth Credentials
Ensure the Google OAuth credentials are available at:
```
backend/calendar/google-calendar-mcp/gcp-oauth.keys.json
```

### 2. Run Authentication
```bash
cd backend/calendar/mcp
node auth.js
```

### 3. Test Authentication
```bash
cd backend/calendar/mcp
node auth.js --test
```

## Testing

### Run Comprehensive Tests
```bash
cd backend
node test-all-calendar-features.js
```

### Test Specific Features
```bash
cd backend/calendar/mcp
node test.js --feature calendars    # Test calendar listing
node test.js --feature events       # Test event operations
node test.js --feature search       # Test search functionality
node test.js --feature availability # Test availability checks
```

### Test API Endpoints
Start the backend server and test endpoints:
```bash
# List calendars
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/calendar/calendars

# Get today's events
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/calendar/events/today

# Search events
curl -H "Authorization: Bearer YOUR_TOKEN" "http://localhost:4000/calendar/events/search?q=meeting"

# Check service health
curl http://localhost:4000/calendar/health
```

## Error Handling

The new implementation includes comprehensive error handling:

- **Authentication Errors**: Automatic token refresh and re-authentication
- **Network Errors**: Retry logic with exponential backoff
- **Validation Errors**: Input validation with helpful error messages
- **Rate Limiting**: Graceful handling of API rate limits
- **Service Unavailable**: Fallback behavior when calendar service is down

## Features Comparison

| Feature | Original MCP | New Implementation |
|---------|-------------|-------------------|
| Event CRUD | ✅ | ✅ Enhanced |
| Calendar Management | ❌ | ✅ Full Support |
| Smart Scheduling | ❌ | ✅ Available |
| Batch Operations | ❌ | ✅ Supported |
| Error Handling | Basic | ✅ Comprehensive |
| Retry Logic | ❌ | ✅ Automatic |
| RESTful APIs | Limited | ✅ Complete |
| Documentation | Basic | ✅ Comprehensive |

## Configuration

### Environment Variables
```
GOOGLE_OAUTH_CREDENTIALS=path/to/credentials.json
GOOGLE_CALENDAR_MCP_TOKEN_PATH=path/to/tokens.json
```

### Timezone Support
Default timezone: `Asia/Kolkata`
Supports all IANA timezone identifiers.

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Ensure OAuth credentials are valid
   - Check redirect URIs in Google Console
   - Run `node auth.js` to re-authenticate

2. **Service Unavailable**
   - Check network connectivity
   - Verify Google Calendar API is enabled
   - Test with `node test.js`

3. **Permission Denied**
   - Verify OAuth scopes include calendar access
   - Check calendar sharing permissions
   - Ensure user has access to requested calendars

4. **Invalid Date Format**
   - Use ISO 8601 format: `YYYY-MM-DDTHH:MM:SS`
   - Ensure timezone is properly specified
   - Validate date ranges (end > start)

### Debug Commands
```bash
# Test calendar MCP implementation
cd backend/calendar/mcp && node test.js

# Test backend calendar client
cd backend && node test-all-calendar-features.js

# Check service status
node -e "import('./mcp-calendar-client-new.js').then(c => c.default.getStatus()).then(console.log)"
```

## Integration with Frontend

The frontend can use these endpoints through the existing authentication system:

```javascript
// Example React hook for calendar integration
const useCalendar = () => {
  const [events, setEvents] = useState([]);
  const [calendars, setCalendars] = useState([]);
  
  const fetchTodaysEvents = async () => {
    const response = await fetch('/calendar/events/today', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await response.json();
    if (data.success) {
      setEvents(data.data.events);
    }
  };
  
  const createEvent = async (eventData) => {
    const response = await fetch('/calendar/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(eventData)
    });
    return response.json();
  };
  
  return { events, calendars, fetchTodaysEvents, createEvent };
};
```

## Next Steps

1. **Frontend Integration**: Update frontend components to use new endpoints
2. **Enhanced Chat**: Improve AI chat integration with new features
3. **Caching**: Implement caching for frequently accessed data
4. **Notifications**: Add event reminder notifications
5. **Sync**: Real-time calendar synchronization
6. **Analytics**: Track calendar usage and patterns

## Support

For issues or questions about the calendar implementation:
1. Check the troubleshooting section above
2. Run the test scripts to diagnose problems
3. Review the console logs for detailed error information
4. Ensure all dependencies are installed and up to date
