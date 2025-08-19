# Calendar MCP Integration

This directory contains the organized Model Context Protocol (MCP) calendar integration for the GenEWA backend.

## Directory Structure

```
calendar/mcp/
├── README.md              # This documentation file
├── index.js               # Main MCP calendar client export
│
├── api/                   # API endpoints and services
│   ├── endpoints.js       # Full calendar API endpoints
│   ├── endpoints-minimal.js  # Minimal calendar API endpoints
│   ├── mcp-client.js      # Legacy MCP client (for compatibility)
│   └── service.js         # Calendar service utilities
│
├── core/                  # Core calendar functionality
│   ├── calendar-client.js # Main calendar client with retry logic
│   └── google-calendar.js # Google Calendar API wrapper
│
├── config/                # Configuration and credentials
│   ├── gcp-oauth.keys.json    # Google OAuth credentials
│   ├── tokens.json            # OAuth tokens
│   ├── package.json           # Dependencies
│   └── package-lock.json      # Dependency lock file
│
├── utils/                 # Utility functions
│   ├── auth.js           # Authentication utilities
│   └── setup.js          # Setup and configuration utilities
│
└── test/                  # Test files
    ├── basic-test.js              # Basic functionality tests
    ├── test-all-calendar-features.js
    ├── test-calendar-comprehensive.js
    ├── test-calendar-mcp.js
    ├── test-calendar-setup.js
    ├── test-complete-integration.js
    ├── test-mcp-calendar.js
    ├── test-mcp-direct.js
    ├── test-mcp-endpoints.js
    ├── test-mcp-final.js
    ├── test-mcp-operations.js
    └── ... (additional test files)
```

## Main Components

### 1. **index.js** - Main Calendar MCP Client
- Exports the main `CalendarMCP` class and singleton instance
- Provides all calendar operations with initialization and error handling
- Serves as the primary interface for calendar functionality

### 2. **core/** - Core Calendar Functionality
- **calendar-client.js**: Main calendar client with retry logic and connection management
- **google-calendar.js**: Direct Google Calendar API wrapper with authentication

### 3. **api/** - API Layer
- **endpoints-minimal.js**: Minimal Express.js endpoints for calendar operations
- **endpoints.js**: Full-featured calendar API endpoints
- **mcp-client.js**: Legacy MCP client for backward compatibility
- **service.js**: Calendar service utilities

### 4. **config/** - Configuration
- **gcp-oauth.keys.json**: Google OAuth2 credentials (Desktop app)
- **tokens.json**: OAuth2 access and refresh tokens
- **package.json**: Node.js dependencies for calendar functionality

### 5. **utils/** - Utilities
- **auth.js**: Authentication helper functions
- **setup.js**: Setup and configuration utilities

### 6. **test/** - Test Suite
- Comprehensive test files covering all calendar functionality
- Integration tests, unit tests, and end-to-end tests
- Direct MCP client tests and API endpoint tests

## Usage

### Backend Integration

```javascript
import { calendarMCP } from './calendar/mcp/index.js';

// Initialize the calendar client
await calendarMCP.init();

// List calendars
const calendars = await calendarMCP.listCalendars();

// List events
const events = await calendarMCP.listEvents('primary', {
  timeMin: new Date().toISOString(),
  timeMax: new Date(Date.now() + 7*24*60*60*1000).toISOString()
});

// Create event
const event = await calendarMCP.createEvent({
  title: 'Meeting',
  start: '2024-08-20T10:00:00',
  end: '2024-08-20T11:00:00',
  description: 'Team meeting'
});
```

### API Endpoints Integration

```javascript
import { setupCalendarEndpoints } from './calendar/mcp/api/endpoints-minimal.js';

// Setup calendar endpoints in Express app
setupCalendarEndpoints(app, authenticate);
```

## Available Operations

### Calendar Operations
- `listCalendars()` - List all available calendars
- `createCalendar(data)` - Create a new calendar
- `updateCalendar(id, data)` - Update calendar settings
- `deleteCalendar(id)` - Delete a calendar

### Event Operations
- `listEvents(calendarId, options)` - List events from calendar
- `createEvent(eventData)` - Create a new event
- `updateEvent(eventData)` - Update an existing event
- `deleteEvent(calendarId, eventId)` - Delete an event
- `getEvent(calendarId, eventId)` - Get a specific event
- `searchEvents(calendarId, query, options)` - Search events by text

### Smart Features
- `findAvailableSlots(calendarId, duration, timeMin, timeMax)` - Find free time slots
- `getFreeBusy(calendars, timeMin, timeMax)` - Get busy/free information
- `getTodaysEvents(calendarId)` - Get today's events
- `getWeekEvents(calendarId)` - Get this week's events
- `getCurrentTime(timeZone)` - Get current time in timezone

### Utility Operations
- `listColors()` - Get available event colors
- `batchCreateEvents(events)` - Create multiple events
- `batchDeleteEvents(eventIds)` - Delete multiple events

## Authentication

The calendar integration uses Google OAuth2 with the following flow:

1. **Credentials**: Place Google OAuth2 credentials in `config/gcp-oauth.keys.json`
2. **Authentication**: Run initial OAuth flow to generate tokens
3. **Token Storage**: Tokens are stored in `config/tokens.json`
4. **Auto-refresh**: Tokens are automatically refreshed when needed

## Testing

Run tests from the `test/` directory:

```bash
# Test direct MCP client
node calendar/mcp/test/test-mcp-direct.js

# Test API endpoints  
node calendar/mcp/test/test-mcp-endpoints.js

# Test comprehensive integration
node calendar/mcp/test/test-complete-integration.js
```

## Error Handling

- **Retry Logic**: All operations include automatic retry with exponential backoff
- **Connection Management**: Automatic reconnection on network issues
- **Authentication**: Automatic token refresh and re-authentication
- **Validation**: Input validation for all calendar operations
- **Graceful Degradation**: Fallback responses when services are unavailable

## Dependencies

Main dependencies (see `config/package.json`):
- `googleapis` - Google Calendar API client
- `google-auth-library` - OAuth2 authentication
- Standard Node.js modules for file system and path operations

## Configuration

### Environment Variables
- `GOOGLE_CLIENT_ID` - Google OAuth2 client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth2 client secret
- `GOOGLE_REDIRECT_URI` - OAuth2 redirect URI

### Files
- **gcp-oauth.keys.json**: OAuth2 credentials from Google Cloud Console
- **tokens.json**: Generated OAuth2 tokens (auto-created during auth)

## Troubleshooting

1. **Authentication Issues**: Check OAuth2 credentials and token validity
2. **Connection Errors**: Verify network connectivity and Google API quotas
3. **Permission Errors**: Ensure proper OAuth2 scopes are configured
4. **Path Issues**: Verify all file paths are correct after reorganization

For more detailed troubleshooting, check the test files which include comprehensive error handling examples.
