# MCP Google Calendar API Documentation

This backend now integrates with the existing Google Calendar MCP server to provide comprehensive calendar functionality without modifying any code in the MCP server folder.

## Integration Architecture

- **MCP Server**: Uses the existing `google-calendar-mcp` server via stdio communication
- **Client**: Custom MCP client that interfaces with your Express backend
- **Features**: All features from the original MCP server are now available through HTTP endpoints

## Available Endpoints

### 1. List Calendars
**GET** `/calendar/mcp/calendars`

Lists all available Google calendars for the authenticated user.

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4000/calendar/mcp/calendars
```

### 2. List Events
**GET** `/calendar/mcp/events`

Lists events from a calendar with optional filtering.

**Query Parameters:**
- `calendarId` (optional): Calendar ID (default: 'primary')
- `timeMin` (optional): Start time filter (ISO 8601)
- `timeMax` (optional): End time filter (ISO 8601)
- `timeZone` (optional): Timezone (default: 'Asia/Kolkata')

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:4000/calendar/mcp/events?timeMin=2025-01-01T00:00:00&timeMax=2025-01-31T23:59:59"
```

### 3. Search Events
**GET** `/calendar/mcp/search`

Search events by text query across title, description, location, and attendees.

**Query Parameters:**
- `calendarId` (optional): Calendar ID (default: 'primary')
- `query` (required): Search query text
- `timeMin` (required): Start time boundary
- `timeMax` (required): End time boundary
- `timeZone` (optional): Timezone

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:4000/calendar/mcp/search?query=meeting&timeMin=2025-01-01T00:00:00&timeMax=2025-01-31T23:59:59"
```

### 4. Create Event
**POST** `/calendar/mcp/events`

Creates a new calendar event with comprehensive options.

**Request Body:**
```json
{
  "calendarId": "primary",
  "summary": "Study Session",
  "description": "Mathematics review session",
  "start": "2025-01-15T14:00:00",
  "end": "2025-01-15T16:00:00",
  "timeZone": "Asia/Kolkata",
  "location": "Library Room 201",
  "attendees": [
    {"email": "friend@example.com"}
  ],
  "colorId": "2",
  "reminders": {
    "useDefault": false,
    "overrides": [
      {"method": "popup", "minutes": 30}
    ]
  },
  "recurrence": ["RRULE:FREQ=WEEKLY;COUNT=5"]
}
```

### 5. Update Event
**PUT** `/calendar/mcp/events/:eventId`

Updates an existing event with advanced recurring event support.

**URL Parameters:**
- `eventId`: The event ID to update

**Request Body:** (all fields optional)
```json
{
  "calendarId": "primary",
  "summary": "Updated Meeting",
  "start": "2025-01-15T15:00:00",
  "end": "2025-01-15T17:00:00",
  "modificationScope": "thisAndFollowing",
  "futureStartDate": "2025-01-15T15:00:00",
  "sendUpdates": "all"
}
```

**Modification Scopes:**
- `thisEventOnly`: Update only this instance
- `thisAndFollowing`: Update this and future instances
- `all`: Update all instances in the series

### 6. Delete Event
**DELETE** `/calendar/mcp/events/:eventId`

Deletes a calendar event.

**URL Parameters:**
- `eventId`: The event ID to delete

**Query Parameters:**
- `calendarId` (optional): Calendar ID (default: 'primary')
- `sendUpdates` (optional): Notification setting ('all', 'externalOnly', 'none')

### 7. Free/Busy Information
**POST** `/calendar/mcp/freebusy`

Queries availability across multiple calendars.

**Request Body:**
```json
{
  "calendars": ["primary", "work@company.com"],
  "timeMin": "2025-01-15T00:00:00",
  "timeMax": "2025-01-15T23:59:59",
  "timeZone": "Asia/Kolkata"
}
```

**Response:**
```json
{
  "calendars": {
    "primary": {
      "busy": [
        {
          "start": "2025-01-15T09:00:00Z",
          "end": "2025-01-15T10:00:00Z"
        }
      ]
    }
  },
  "timeMin": "2025-01-15T00:00:00Z",
  "timeMax": "2025-01-15T23:59:59Z"
}
```

### 8. Current Time
**GET** `/calendar/mcp/time`

Gets current time with timezone information.

**Query Parameters:**
- `timeZone` (optional): IANA timezone name

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:4000/calendar/mcp/time?timeZone=America/New_York"
```

### 9. List Colors
**GET** `/calendar/mcp/colors`

Lists available event colors and their IDs.

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4000/calendar/mcp/colors
```

### 10. Batch Event Listing
**POST** `/calendar/mcp/events/batch`

Lists events from multiple calendars simultaneously.

**Request Body:**
```json
{
  "calendarIds": ["primary", "work@company.com", "personal@gmail.com"],
  "timeMin": "2025-01-01T00:00:00",
  "timeMax": "2025-01-31T23:59:59",
  "timeZone": "Asia/Kolkata"
}
```

### 11. Smart Availability Finder
**POST** `/calendar/mcp/availability`

Finds available time slots across calendars for scheduling.

**Request Body:**
```json
{
  "calendars": ["primary", "work@company.com"],
  "timeMin": "2025-01-15T09:00:00",
  "timeMax": "2025-01-15T17:00:00",
  "duration": 60,
  "timeZone": "Asia/Kolkata"
}
```

**Response:**
```json
{
  "availableSlots": [
    {
      "start": "2025-01-15T11:00:00.000Z",
      "end": "2025-01-15T12:00:00.000Z"
    },
    {
      "start": "2025-01-15T14:30:00.000Z",
      "end": "2025-01-15T15:30:00.000Z"
    }
  ],
  "freeBusyData": { ... },
  "requestedDuration": 60
}
```

## Enhanced AI Chat Integration

The AI chat endpoint (`/ai/chat`) now uses the MCP Calendar client for event creation. When users request to schedule events through natural language, the AI will:

1. Parse the request and extract event details
2. Create the event using the MCP Calendar client
3. Return formatted confirmation with event details

Example AI interactions:
- "Schedule a study session tomorrow at 2pm for 2 hours"
- "Set up a meeting with my project team next Friday at 3pm in Room 101"
- "Remind me to submit my assignment on January 20th"

## Error Handling

All endpoints include comprehensive error handling:
- Authentication errors (401)
- Validation errors (400)
- MCP communication errors (500)
- Google Calendar API errors (passed through from MCP server)

## Features Inherited from MCP Server

✅ **Multi-Calendar Support**: Access multiple calendars simultaneously
✅ **Advanced Search**: Full-text search across all event fields
✅ **Recurring Events**: Create and modify recurring events with different scopes
✅ **Smart Timezone Handling**: Automatic timezone conversion and management
✅ **Free/Busy Queries**: Check availability across calendars
✅ **Batch Operations**: Efficient multi-calendar operations
✅ **Event Colors**: Support for visual event categorization
✅ **Attendee Management**: Add and manage event attendees
✅ **Reminder Configuration**: Custom reminder settings
✅ **Natural Language Integration**: AI-powered event creation

## Setup Requirements

1. **Google Cloud Setup**: The MCP server requires Google Cloud credentials
2. **OAuth Credentials**: Desktop app credentials for Google Calendar API
3. **Environment Variables**: 
   - `GOOGLE_OAUTH_CREDENTIALS`: Path to OAuth credentials file
   - Additional environment variables as specified in the MCP server documentation

## Usage Notes

- All datetime parameters should be in ISO 8601 format
- Timezone-naive datetimes will use the specified `timeZone` parameter
- The MCP server handles Google OAuth authentication automatically
- First-time usage will trigger browser-based OAuth flow
- Authentication tokens are managed automatically by the MCP server

This integration provides all the powerful calendar management features of the original MCP server while maintaining clean separation of concerns and allowing your backend to scale independently.
