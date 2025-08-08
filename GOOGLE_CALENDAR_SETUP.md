# Google Calendar Integration Setup Guide

This guide will help you set up the Google Calendar integration for GenEWA, enabling AI-powered calendar scheduling through natural language chat.

## 🔧 Prerequisites

1. **Node.js** (v16 or higher)
2. **Google Cloud Platform Account**
3. **Existing GenEWA setup** (Supabase, Groq API)

## 📋 Step-by-Step Setup

### 1. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Go to APIs & Services → Library
   - Search for "Google Calendar API"
   - Click on it and press "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **"Create Credentials" → "OAuth client ID"**
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in app name, user support email, and developer contact
   - Add your email as a test user
4. For OAuth client ID:
   - Choose **"Desktop application"** as the application type
   - Name it "GenEWA Calendar Integration"
   - Click "Create"
5. **Download the JSON file** and save it as `gcp-oauth.keys.json`

### 3. Backend Setup

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install google-auth-library googleapis chrono-node
   ```

2. **Place OAuth Credentials**:
   ```bash
   # Create the calendar directory structure
   mkdir -p calendar/google-calendar-mcp
   
   # Copy your OAuth credentials file
   cp /path/to/downloaded/gcp-oauth.keys.json calendar/google-calendar-mcp/
   ```

3. **Environment Configuration**:
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env file with your actual credentials
   ```
   
   Update your `.env` file:
   ```env
   # Add Google Calendar configuration
   GOOGLE_OAUTH_CREDENTIALS=./calendar/google-calendar-mcp/gcp-oauth.keys.json
   ```

4. **Start the Backend**:
   ```bash
   npm run dev
   ```

### 4. Frontend Setup

The frontend components are already created and integrated. Just ensure you have the latest frontend code running:

```bash
cd frontend
npm run dev
```

## 🚀 Usage

### 1. Connect Google Calendar

1. Navigate to the **Calendar** section in GenEWA
2. Click **"Connect Google Calendar"** button
3. Authenticate with your Google account
4. Grant calendar permissions

### 2. AI-Powered Scheduling

Once connected, you can schedule events through natural language in the **AI Chat**:

**Example prompts:**
- "Schedule a study session tomorrow at 3pm"
- "Set up a meeting with my project team next Friday at 2pm"
- "Remind me about my physics assignment due Monday"
- "Block time for exam preparation next week Wednesday from 2-4pm"
- "Schedule a group study session for data structures this Saturday at 10am"

### 3. Features

- **Natural Language Processing**: AI understands casual date/time expressions
- **Automatic Event Creation**: Events are created in your Google Calendar
- **Smart Defaults**: 1-hour duration if not specified, IST timezone
- **Visual Feedback**: Chat shows event details and creation status
- **Toast Notifications**: Confirmation when events are created

## 🔍 How It Works

### Architecture

1. **Frontend (React)**: 
   - Chat interface for natural language input
   - Calendar integration component
   - Real-time status updates

2. **Backend (Node.js/Express)**:
   - Enhanced AI chat endpoint with calendar parsing
   - Google Calendar service integration
   - OAuth 2.0 authentication handling

3. **AI Integration (Groq)**:
   - Enhanced system prompt for calendar event extraction
   - JSON response parsing for event details
   - Natural language understanding

### AI Processing Flow

1. User sends message to AI chat
2. AI analyzes message for calendar-related intent
3. If scheduling request detected:
   - Extracts event details (title, date, time, location)
   - Returns structured JSON with event data
4. Backend processes the JSON:
   - Creates event in Google Calendar (if connected)
   - Returns formatted response to user
5. Frontend displays success confirmation

### Example AI Response

When you say: *"Schedule a meeting with my study group tomorrow at 3pm"*

AI extracts:
```json
{
  "type": "calendar_event",
  "event": {
    "title": "Meeting with study group",
    "start": "2024-01-16T15:00:00",
    "end": "2024-01-16T16:00:00",
    "description": "Study group meeting"
  }
}
```

## 🛠️ Troubleshooting

### Common Issues

1. **OAuth Error**: "Error 400: redirect_uri_mismatch"
   - Ensure OAuth client type is "Desktop application"
   - Check that credentials file is correctly placed

2. **Authentication Failed**
   - Verify your email is added as a test user
   - Check that Calendar API is enabled
   - Ensure credentials file has correct format

3. **Events Not Creating**
   - Check Google Calendar connection status
   - Verify API quotas haven't been exceeded
   - Check backend logs for detailed errors

4. **AI Not Understanding Dates**
   - Use more specific time references
   - Include both date and time in requests
   - Try different phrasings

### Debug Mode

Enable debug logging in your `.env`:
```env
NODE_ENV=development
```

Check browser console and backend logs for detailed error information.

## 🔐 Security Considerations

- OAuth tokens are stored securely in backend
- Credentials never leave your local machine
- All calendar operations require explicit user consent
- Tokens are automatically refreshed when needed

## 📝 API Endpoints

### Calendar Authentication
- `GET /calendar/auth-url` - Get OAuth authorization URL
- `POST /calendar/auth-callback` - Handle OAuth callback
- `GET /calendar/auth-status` - Check connection status

### Calendar Operations
- `GET /calendar/google-events` - List Google Calendar events
- `POST /calendar/google-events` - Create Google Calendar event

### Enhanced AI Chat
- `POST /ai/chat` - Enhanced chat with calendar scheduling

## 🎯 Next Steps

1. **Set up the OAuth credentials** following the Google Cloud setup
2. **Test the connection** by connecting your Google Calendar
3. **Try AI scheduling** with natural language prompts
4. **Customize event types** and default settings as needed

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Ensure Google Cloud APIs are enabled
4. Check browser developer tools for frontend errors
5. Review backend logs for API errors

The integration combines the power of AI natural language processing with Google Calendar's robust scheduling capabilities, making it easy to manage your academic schedule through simple conversation!
