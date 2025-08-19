# MCP Calendar Integration Setup Guide

## ✅ Integration Complete!

Your GenEwa backend has been successfully integrated with the existing Google Calendar MCP server. Here's what has been implemented:

## 🎯 What's Available Now

### Backend Integration (`backend/`)
- **MCP Client**: `mcp-calendar-client.js` - Communicates with your existing MCP server
- **11 New API Endpoints**: All MCP Calendar features are now available via HTTP
- **Enhanced AI Chat**: Natural language calendar event creation
- **OAuth Credentials**: Automatically configured to use `gcp-oauth.keys.json`

### Frontend Integration (`frontend/`)
- **New Calendar Page**: `MCPCalendar.tsx` - Advanced calendar management interface
- **4 Tab Interface**: Events, Search, Availability, Calendars
- **Real-time Integration**: Live sync with Google Calendar
- **Smart Features**: Availability finder, event search, multi-calendar support

## 🚀 Available Features

### ✅ Multi-Calendar Support
- Access multiple Google calendars
- Switch between calendars
- Batch operations across calendars

### ✅ Advanced Event Management  
- Create, edit, delete events
- Recurring event support
- Custom reminders and colors
- Attendee management

### ✅ Smart Scheduling
- Find available time slots
- Cross-calendar availability
- Duration-based slot finding
- Smart conflict detection

### ✅ Powerful Search
- Full-text event search
- Date range filtering
- Cross-calendar search
- Natural language queries

### ✅ AI Integration
- Natural language event creation via chat
- "Schedule a meeting tomorrow at 2pm" 
- Automatic event parsing and creation

## 🔧 Setup Instructions

### 1. Start the Backend
```bash
cd backend
npm start
```
The backend will:
- Start on port 4000 (or 4001 if 4000 is taken)
- Initialize MCP Calendar client
- Connect to your existing MCP server
- Use existing OAuth credentials automatically

### 2. Start the Frontend
```bash
cd frontend  
npm run dev
```

### 3. Access the Calendar
1. Go to http://localhost:5173 (or your frontend URL)
2. Login to your GenEwa account
3. Navigate to **Calendar** from the sidebar
4. Click "Connect Google Calendar" if not already connected

## 📋 API Endpoints Available

All endpoints are prefixed with `/calendar/mcp/`:

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/calendars` | GET | List all calendars |
| `/events` | GET | List events with filtering |
| `/search` | GET | Search events by text |
| `/events` | POST | Create new event |
| `/events/:id` | PUT | Update event |
| `/events/:id` | DELETE | Delete event |
| `/freebusy` | POST | Get availability |
| `/time` | GET | Get current time |
| `/colors` | GET | List event colors |
| `/events/batch` | POST | Batch operations |
| `/availability` | POST | Find free slots |

## 🎨 Frontend Features

### Events Tab
- View upcoming events
- Event details with colors, location, attendees
- Quick actions: view, edit, delete
- Real-time updates

### Search Tab  
- Full-text search across events
- Date range filtering
- Instant results

### Availability Tab
- Find free time slots
- Next 24 hours availability
- One-click scheduling

### Calendars Tab
- Manage multiple calendars
- Toggle calendar visibility
- Primary calendar indication

## 🔄 How It Works

1. **MCP Server**: Your existing `google-calendar-mcp` server handles Google Calendar API
2. **MCP Client**: New client communicates with MCP server via stdio
3. **HTTP Endpoints**: Express routes expose MCP functionality via HTTP
4. **Frontend**: React components consume HTTP endpoints
5. **AI Chat**: Enhanced to use MCP calendar for event creation

## 🛠️ Troubleshooting

### Calendar Not Connecting
1. Check backend logs for MCP server startup
2. Verify `gcp-oauth.keys.json` exists and is valid  
3. Ensure MCP server builds successfully
4. Try refreshing the calendar page

### Events Not Loading
1. Check browser network tab for API errors
2. Verify authentication token is valid
3. Check MCP server logs in terminal
4. Try reconnecting Google Calendar

### OAuth Issues
1. Ensure Google Cloud project has Calendar API enabled
2. Check OAuth credentials are "Desktop App" type
3. Verify test user is added to OAuth consent
4. MCP server handles OAuth flow automatically

## 📁 File Structure

```
backend/
├── mcp-calendar-client.js     # MCP client integration
├── index.js                   # Updated with MCP endpoints
└── calendar/google-calendar-mcp/  # Your existing MCP server

frontend/src/
├── pages/MCPCalendar.tsx      # New advanced calendar page
└── components/calendar/GoogleCalendarIntegration.tsx  # Updated integration
```

## 🌟 Next Steps

1. **Test the Integration**: Try creating events through the UI and AI chat
2. **Explore Features**: Use search, availability finder, multi-calendar support
3. **Customize**: Modify the UI components to match your app's design
4. **Extend**: Add more MCP Calendar features as needed

## 💡 Pro Tips

- Use natural language in AI chat: "Schedule a study session tomorrow at 2pm"
- Try the availability finder for smart scheduling
- Use search to find events across all calendars
- The MCP server handles all Google OAuth automatically

---

Your calendar integration is now live! 🎉 
All the advanced features from your MCP server are available through a beautiful web interface.
