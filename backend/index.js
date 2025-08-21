import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import * as chrono from 'chrono-node';
import { calendarMCP } from './calendar/mcp/index.js';
import { setupCalendarEndpoints } from './calendar/mcp/api/endpoints-minimal.js';


// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client (service role for backend operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// MCP Calendar Client (using the existing google-calendar-mcp server)
console.log('MCP Calendar client initializing...');

// Initialize calendar MCP service on startup
calendarMCP.init().then(() => {
  console.log('Calendar MCP service initialized successfully');
}).catch((error) => {
  console.log('Calendar MCP service initialization failed, will retry on demand:', error.message);
});

// Middleware to extract user_id from Authorization header (JWT)
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    req.user_id = decoded.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Get all expenses for the authenticated user
app.get('/expenses', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', req.user_id)
    .order('date', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Add a new expense
app.post('/expenses', authenticate, async (req, res) => {
  const { amount, category, description, date } = req.body;
  const { data, error } = await supabase
    .from('expenses')
    .insert([{ user_id: req.user_id, amount, category, description, date }])
    .select();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data[0]);
});

// Update an expense
app.put('/expenses/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { amount, category, description, date } = req.body;
  const { data, error } = await supabase
    .from('expenses')
    .update({ amount, category, description, date })
    .eq('id', id)
    .eq('user_id', req.user_id)
    .select();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

// Delete an expense
app.delete('/expenses/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user_id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

// Get budget settings for the authenticated user
app.get('/budget/settings', authenticate, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('monthly_budget, category_limits')
      .eq('user_id', req.user_id)
      .single();
    
    if (error) {
      // If no profile exists, return default settings
      return res.json({
        monthly_budget: 5000,
        category_limits: {
          Food: 2000,
          Transport: 800,
          Books: 1000,
          Entertainment: 800,
          Miscellaneous: 400
        }
      });
    }

    res.json({
      monthly_budget: profile.monthly_budget || 5000,
      category_limits: profile.category_limits || {
        Food: 2000,
        Transport: 800,
        Books: 1000,
        Entertainment: 800,
        Miscellaneous: 400
      }
    });
  } catch (err) {
    console.error('Budget settings error:', err);
    res.status(500).json({ error: 'Failed to fetch budget settings' });
  }
});

// Update budget settings for the authenticated user
app.put('/budget/settings', authenticate, async (req, res) => {
  const { monthly_budget, category_limits } = req.body;
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        monthly_budget: monthly_budget || 5000,
        category_limits: category_limits || {},
        updated_at: new Date().toISOString()
      })
      .eq('user_id', req.user_id)
      .select();
      
    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (err) {
    console.error('Update budget settings error:', err);
    res.status(500).json({ error: 'Failed to update budget settings' });
  }
});

// Get budget analytics for the authenticated user
app.get('/budget/analytics', authenticate, async (req, res) => {
  try {
    const { timeframe = '3months' } = req.query;
    
    // Calculate date range based on timeframe
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '1month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case '1year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    }

    // Get expenses for the period
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', req.user_id)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    // Process analytics data
    const analytics = {
      totalSpent: expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0),
      expenseCount: expenses.length,
      averagePerDay: 0,
      categoryBreakdown: {},
      monthlyTrends: {},
      dailySpending: {},
      topExpenses: expenses.sort((a, b) => b.amount - a.amount).slice(0, 5),
      spendingPatterns: {
        weekdays: [0, 0, 0, 0, 0, 0, 0], // Sunday to Saturday
        monthlyAverage: 0
      }
    };

    // Calculate category breakdown
    expenses.forEach(expense => {
      const category = expense.category;
      if (!analytics.categoryBreakdown[category]) {
        analytics.categoryBreakdown[category] = { total: 0, count: 0 };
      }
      analytics.categoryBreakdown[category].total += parseFloat(expense.amount);
      analytics.categoryBreakdown[category].count += 1;
    });

    // Calculate monthly trends
    expenses.forEach(expense => {
      const monthYear = new Date(expense.date).toISOString().slice(0, 7); // YYYY-MM
      if (!analytics.monthlyTrends[monthYear]) {
        analytics.monthlyTrends[monthYear] = 0;
      }
      analytics.monthlyTrends[monthYear] += parseFloat(expense.amount);
    });

    // Calculate daily spending
    expenses.forEach(expense => {
      const date = expense.date;
      if (!analytics.dailySpending[date]) {
        analytics.dailySpending[date] = 0;
      }
      analytics.dailySpending[date] += parseFloat(expense.amount);
    });

    // Calculate spending patterns
    expenses.forEach(expense => {
      const dayOfWeek = new Date(expense.date).getDay();
      analytics.spendingPatterns.weekdays[dayOfWeek] += parseFloat(expense.amount);
    });

    // Calculate averages
    const daysDiff = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
    analytics.averagePerDay = analytics.totalSpent / daysDiff;
    
    const monthsInPeriod = Object.keys(analytics.monthlyTrends).length || 1;
    analytics.spendingPatterns.monthlyAverage = analytics.totalSpent / monthsInPeriod;

    res.json(analytics);
  } catch (err) {
    console.error('Budget analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch budget analytics' });
  }
});

// Get the authenticated user's profile
app.get('/profile', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', req.user_id)
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Create a profile for the authenticated user
app.post('/profile', authenticate, async (req, res) => {
  const { name, college, year, profile_picture, timezone, referral_code, is_premium } = req.body;
  const { data, error } = await supabase
    .from('profiles')
    .insert([
      {
        user_id: req.user_id,
        name,
        college,
        year,
        profile_picture,
        timezone,
        referral_code,
        is_premium: is_premium || false,
      },
    ])
    .select();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data[0]);
});

// Update the authenticated user's profile
app.put('/profile', authenticate, async (req, res) => {
  const { name, college, year, profile_picture, timezone, referral_code, is_premium } = req.body;
  const { data, error } = await supabase
    .from('profiles')
    .update({
      name,
      college,
      year,
      profile_picture,
      timezone,
      referral_code,
      is_premium,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', req.user_id)
    .select();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return res.status(401).json({ error: error?.message || 'Invalid credentials' });
    }
    // Return the access token (JWT)
    res.json({ token: data.session.access_token });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Signup endpoint
app.post('/auth/signup', async (req, res) => {
  const { email, password, name, college, year } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      return res.status(400).json({ error: error?.message || 'Signup failed' });
    }
    // Optionally create a profile row
    await supabase.from('profiles').insert([
      {
        user_id: data.user.id,
        name: name || '',
        college: college || '',
        year: year || '',
      },
    ]);
    // Return the access token (JWT) if available
    if (data.session && data.session.access_token) {
      res.json({ token: data.session.access_token });
    } else {
      res.json({ message: 'Signup successful. Please check your email to confirm your account.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot password endpoint
app.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password`,
    });
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json({ message: 'Password reset email sent successfully' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password endpoint
app.post('/auth/reset-password', async (req, res) => {
  const { access_token, refresh_token, new_password } = req.body;
  if (!access_token || !refresh_token || !new_password) {
    return res.status(400).json({ error: 'Access token, refresh token, and new password are required' });
  }
  try {
    // Set the session using the tokens from the reset password link
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (sessionError) {
      return res.status(400).json({ error: sessionError.message });
    }
    
    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({ password: new_password });
    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }
    
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Google OAuth callback endpoint
app.post('/auth/google-callback', async (req, res) => {
  const { access_token, refresh_token } = req.body;
  if (!access_token || !refresh_token) {
    return res.status(400).json({ error: 'Access token and refresh token are required' });
  }
  try {
    // Set the session using the tokens from Google OAuth
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (sessionError) {
      return res.status(400).json({ error: sessionError.message });
    }
    
    // Get user data
    const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);
    if (userError) {
      return res.status(400).json({ error: userError.message });
    }
    
    // Create or update profile if user exists
    if (user) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (!existingProfile) {
        // Create new profile for Google user
        await supabase.from('profiles').insert([
          {
            user_id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
            email: user.email,
          },
        ]);
      }
    }
    
    res.json({ token: access_token, user });
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI Chat endpoint with Enhanced Calendar Integration (Groq integration)
app.post('/ai/chat', authenticate, async (req, res) => {
  const { message } = req.body;
  console.log('Received message:', message);
  if (!message) return res.status(400).json({ error: 'Message is required' });
  
  try {
    // Enhanced system prompt for full calendar capabilities
    const systemPrompt = `You are GenEWA's AI assistant, specializing in helping Indian college students with academics and productivity.

IMPORTANT: Only use JSON format for actual calendar operations. For general questions, greetings, or academic help, respond normally in plain text.

CALENDAR INTEGRATION CAPABILITIES:
You have full access to Google Calendar operations. ONLY for calendar-related requests (scheduling, viewing events, etc.), extract the operation and parameters, then respond with JSON in this exact format:

1. CREATE EVENT:
{
  "type": "calendar_create",
  "event": {
    "title": "event title",
    "description": "description",
    "start": "YYYY-MM-DDTHH:MM:SS",
    "end": "YYYY-MM-DDTHH:MM:SS",
    "location": "location",
    "attendees": ["email@example.com"]
  },
  "message": "Creating your event..."
}

2. LIST/VIEW EVENTS:
{
  "type": "calendar_list",
  "params": {
    "timeMin": "YYYY-MM-DDTHH:MM:SS" (optional),
    "timeMax": "YYYY-MM-DDTHH:MM:SS" (optional),
    "calendarId": "primary" (default)
  },
  "message": "Let me check your calendar..."
}

3. SEARCH EVENTS:
{
  "type": "calendar_search",
  "params": {
    "query": "search term",
    "timeMin": "YYYY-MM-DDTHH:MM:SS" (optional),
    "timeMax": "YYYY-MM-DDTHH:MM:SS" (optional)
  },
  "message": "Searching your calendar..."
}

4. UPDATE EVENT:
{
  "type": "calendar_update",
  "params": {
    "searchQuery": "event to find and update",
    "updates": {
      "title": "new title",
      "start": "new time",
      "description": "new description"
    }
  },
  "message": "Updating your event..."
}

5. DELETE EVENT:
{
  "type": "calendar_delete",
  "params": {
    "searchQuery": "event to delete"
  },
  "message": "Deleting the event..."
}

6. CHECK AVAILABILITY:
{
  "type": "calendar_availability",
  "params": {
    "timeMin": "YYYY-MM-DDTHH:MM:SS",
    "timeMax": "YYYY-MM-DDTHH:MM:SS",
    "duration": 60
  },
  "message": "Checking your availability..."
}

7. LIST CALENDARS:
{
  "type": "calendar_calendars",
  "message": "Getting your calendars..."
}

8. GET EVENT COLORS:
{
  "type": "calendar_colors",
  "message": "Getting available colors..."
}

9. GET CURRENT TIME:
{
  "type": "calendar_time",
  "params": {
    "timeZone": "Asia/Kolkata" (optional)
  },
  "message": "Getting current time..."
}

10. FREE/BUSY CHECK:
{
  "type": "calendar_freebusy",
  "params": {
    "calendars": ["primary"],
    "timeMin": "YYYY-MM-DDTHH:MM:SS",
    "timeMax": "YYYY-MM-DDTHH:MM:SS",
    "timeZone": "Asia/Kolkata"
  },
  "message": "Checking your busy times..."
}

Current date/time reference: ${new Date().toISOString()}
Default timezone: Asia/Kolkata

Examples:
- "What are my events today?" → calendar_list
- "Find my meeting with John" → calendar_search
- "Schedule a study session tomorrow at 3pm" → calendar_create
- "Change my 6pm meeting to 7pm" → calendar_update
- "Cancel my evening meeting" → calendar_delete
- "When am I free tomorrow?" → calendar_availability
- "Show my calendars" → calendar_calendars
- "What colors can I use for events?" → calendar_colors
- "What time is it?" → calendar_time
- "Am I busy this afternoon?" → calendar_freebusy

IMPORTANT: For event creation requests:
- If user gives basic details (title, time), create the event immediately with reasonable defaults
- Default duration: 1 hour if not specified
- Default location: empty if not specified  
- Default description: empty if not specified
- For "today at 6pm", use today's date with 18:00 time
- For "tomorrow at 3pm", use tomorrow's date with 15:00 time
- Always create the event rather than asking for more details

CRITICAL - GOOGLE CALENDAR API DATETIME FORMAT REQUIREMENTS:
- ALWAYS use complete RFC3339/ISO 8601 format with timezone: "YYYY-MM-DDTHH:MM:SS.000Z"
- Examples: "2025-08-20T15:00:00.000Z", "2025-08-21T09:30:00.000Z"
- NEVER use incomplete formats like "2025-08-20T15:00" or "2025-08-20T15:00:00"
- For times: 15:00:00.000Z for 3pm, 09:00:00.000Z for 9am, 18:00:00.000Z for 6pm
- Always include .000Z timezone suffix - this is REQUIRED by Google Calendar API
- Convert local time to UTC: for India (Asia/Kolkata = UTC+5:30), subtract 5.5 hours
- Example: 3pm IST = 9:30am UTC = "2025-08-20T09:30:00.000Z"

For non-calendar requests, respond normally as an academic assistant.`

    const groqRes = await fetch(process.env.GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ]
      })
    });
    
    const data = await groqRes.json();
    console.log('Groq API response:', data);
    
    if (!groqRes.ok) return res.status(500).json({ error: data.error || 'Groq API error' });
    
    const aiResponse = data.choices?.[0]?.message?.content || 'No response from AI.';
    
    // Check if response contains calendar operation JSON
    console.log('AI Response:', aiResponse);
    
    try {
      // Try multiple patterns to extract calendar operations
      let jsonMatch = null;
      let operationData = null;
      
      // More robust JSON extraction using balanced bracket matching
      const extractCompleteJSON = (text) => {
        const startIndex = text.indexOf('{');
        if (startIndex === -1) return null;
        
        let bracketCount = 0;
        let inString = false;
        let escaped = false;
        
        for (let i = startIndex; i < text.length; i++) {
          const char = text[i];
          
          if (escaped) {
            escaped = false;
            continue;
          }
          
          if (char === '\\') {
            escaped = true;
            continue;
          }
          
          if (char === '"' && !escaped) {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') {
              bracketCount++;
            } else if (char === '}') {
              bracketCount--;
              if (bracketCount === 0) {
                return text.substring(startIndex, i + 1);
              }
            }
          }
        }
        return null;
      };
      
      // Try to extract complete JSON
      const extractedJson = extractCompleteJSON(aiResponse);
      if (extractedJson) {
        jsonMatch = [extractedJson];
      }
      
      if (jsonMatch) {
        console.log('Found JSON match:', jsonMatch[0]);
        
        try {
          operationData = JSON.parse(jsonMatch[0]);
        } catch (parseErr) {
          console.log('JSON parse failed, trying to clean:', parseErr.message);
          // Try to clean up common issues
          let cleanedJson = jsonMatch[0]
            .replace(/(["'])?([a-zA-Z_][a-zA-Z0-9_]*)(["'])?:/g, '"$2":') // Fix unquoted keys
            .replace(/'/g, '"') // Replace single quotes with double quotes
            .replace(/,\s*}/g, '}') // Remove trailing commas
            .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
          
          try {
            operationData = JSON.parse(cleanedJson);
            console.log('Successfully parsed cleaned JSON');
          } catch (cleanErr) {
            console.log('Even cleaned JSON failed to parse:', cleanErr.message);
          }
        }
      }
      
      if (operationData && operationData.type && operationData.type.startsWith('calendar_')) {
        console.log('Calendar operation detected:', operationData);
        
        let calendarResult = null;
        let responseMessage = operationData.message || 'Processing your calendar request...';
        
        try {
          switch (operationData.type) {
            case 'calendar_create':
              // Map the event data to the correct format with datetime validation
              const normalizeDateTime = (dateTimeStr) => {
                if (!dateTimeStr) return null;
                try {
                  // Handle various datetime formats and ensure complete ISO format
                  let dateTime = dateTimeStr;
                  
                  // If missing seconds, add them
                  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateTime)) {
                    dateTime += ':00';
                  }
                  
                  // Create date object and return ISO string
                  const date = new Date(dateTime);
                  if (isNaN(date.getTime())) {
                    throw new Error('Invalid date');
                  }
                  
                  return date.toISOString();
                } catch (error) {
                  console.error('DateTime normalization failed:', dateTimeStr, error);
                  return null;
                }
              };
              
              const normalizedStart = normalizeDateTime(operationData.event.start);
              const normalizedEnd = normalizeDateTime(operationData.event.end);
              
              if (!normalizedStart || !normalizedEnd) {
                responseMessage = `❌ Invalid datetime format. Start: ${operationData.event.start}, End: ${operationData.event.end}`;
                break;
              }
              
              const eventData = {
                summary: operationData.event.title || operationData.event.summary,
                description: operationData.event.description || '',
                start: normalizedStart,
                end: normalizedEnd,
                location: operationData.event.location || '',
                calendarId: operationData.event.calendarId || 'primary',
                attendees: operationData.event.attendees || []
              };
              
              console.log('Normalized event data:', JSON.stringify(eventData, null, 2));
              
              calendarResult = await calendarMCP.createEvent(eventData);
              
              if (calendarResult && (calendarResult.success || calendarResult.id || calendarResult.eventId)) {
                const startDate = new Date(operationData.event.start);
                const endDate = new Date(operationData.event.end);
                responseMessage = `✅ **Event created successfully!**\n\n📅 **${eventData.summary}**\n📍 ${eventData.location || 'No location specified'}\n🕐 ${startDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} - ${endDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n${eventData.description ? '📝 ' + eventData.description : ''}`;
              } else {
                responseMessage = `❌ Failed to create event. ${calendarResult?.error || calendarResult?.message || 'Unknown error'}`;
              }
              break;
              
            case 'calendar_list':
              const listParams = operationData.params || {};
              
              // Set default time range if not provided
              let listTimeMin = listParams.timeMin;
              let listTimeMax = listParams.timeMax;
              
              // Ensure proper ISO 8601 format with timezone
              if (!listTimeMin) {
                const now = new Date();
                listTimeMin = now.toISOString();
              } else {
                // Always normalize the datetime to proper ISO format
                try {
                  // If missing seconds, add them
                  let normalizedTime = listTimeMin;
                  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalizedTime)) {
                    normalizedTime += ':00';
                  }
                  // If missing timezone, add UTC timezone
                  if (!normalizedTime.includes('Z') && !normalizedTime.includes('+') && !normalizedTime.includes('-')) {
                    normalizedTime += 'Z';
                  }
                  const date = new Date(normalizedTime);
                  if (!isNaN(date.getTime())) {
                    listTimeMin = date.toISOString();
                  } else {
                    throw new Error('Invalid date');
                  }
                } catch (error) {
                  console.error('Failed to normalize timeMin:', listTimeMin, error);
                  const now = new Date();
                  listTimeMin = now.toISOString();
                }
              }
              
              if (!listTimeMax) {
                const oneWeek = new Date();
                oneWeek.setDate(oneWeek.getDate() + 7);
                listTimeMax = oneWeek.toISOString();
              } else {
                // Always normalize the datetime to proper ISO format
                try {
                  // If missing seconds, add them
                  let normalizedTime = listTimeMax;
                  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalizedTime)) {
                    normalizedTime += ':00';
                  }
                  // If missing timezone, add UTC timezone
                  if (!normalizedTime.includes('Z') && !normalizedTime.includes('+') && !normalizedTime.includes('-')) {
                    normalizedTime += 'Z';
                  }
                  const date = new Date(normalizedTime);
                  if (!isNaN(date.getTime())) {
                    listTimeMax = date.toISOString();
                  } else {
                    throw new Error('Invalid date');
                  }
                } catch (error) {
                  console.error('Failed to normalize timeMax:', listTimeMax, error);
                  const oneWeek = new Date();
                  oneWeek.setDate(oneWeek.getDate() + 7);
                  listTimeMax = oneWeek.toISOString();
                }
              }
              
              calendarResult = await calendarMCP.listEvents(
                listParams.calendarId || 'primary',
                {
                  timeMin: listTimeMin,
                  timeMax: listTimeMax,
                  timeZone: 'Asia/Kolkata'
                }
              );
              const events = calendarResult?.events || [];
              responseMessage = events.length > 0 ? 
                `📅 **Found ${events.length} event(s):**\n\n` + 
                events.slice(0, 10).map(event => {
                  // Handle both Google Calendar API format and our formatted events
                  let startTime;
                  if (event.start?.dateTime) {
                    startTime = new Date(event.start.dateTime);
                  } else if (event.start?.date) {
                    startTime = new Date(event.start.date);
                  } else if (event.start && typeof event.start === 'string') {
                    startTime = new Date(event.start);
                  } else {
                    startTime = new Date(); // fallback
                  }
                  
                  const title = event.summary || event.title || 'Untitled Event';
                  const location = event.location || '';
                  
                  return `• **${title}**\n  🕐 ${startTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${location ? '\n  📍 ' + location : ''}`;
                }).join('\n\n') :
                `📅 **No events found** for the specified time period.`;
              break;
              
            case 'calendar_search':
              const searchParams = operationData.params || {};
              
              // Set default time range if not provided (search requires these parameters)
              let searchTimeMin = searchParams.timeMin;
              let searchTimeMax = searchParams.timeMax;
              
              // Ensure timeMin has proper timezone format
              if (!searchTimeMin) {
                const now = new Date();
                searchTimeMin = now.toISOString();
              } else {
                // Always normalize the datetime to proper ISO format
                try {
                  // If missing seconds, add them
                  let normalizedTime = searchTimeMin;
                  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalizedTime)) {
                    normalizedTime += ':00';
                  }
                  // If missing timezone, add UTC timezone
                  if (!normalizedTime.includes('Z') && !normalizedTime.includes('+') && !normalizedTime.includes('-')) {
                    normalizedTime += 'Z';
                  }
                  const date = new Date(normalizedTime);
                  if (!isNaN(date.getTime())) {
                    searchTimeMin = date.toISOString();
                  } else {
                    throw new Error('Invalid date');
                  }
                } catch (error) {
                  console.error('Failed to normalize searchTimeMin:', searchTimeMin, error);
                  const now = new Date();
                  searchTimeMin = now.toISOString();
                }
              }
              
              // Ensure timeMax has proper timezone format
              if (!searchTimeMax) {
                const oneMonth = new Date();
                oneMonth.setMonth(oneMonth.getMonth() + 1);
                searchTimeMax = oneMonth.toISOString();
              } else {
                // Always normalize the datetime to proper ISO format
                try {
                  // If missing seconds, add them
                  let normalizedTime = searchTimeMax;
                  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalizedTime)) {
                    normalizedTime += ':00';
                  }
                  // If missing timezone, add UTC timezone
                  if (!normalizedTime.includes('Z') && !normalizedTime.includes('+') && !normalizedTime.includes('-')) {
                    normalizedTime += 'Z';
                  }
                  const date = new Date(normalizedTime);
                  if (!isNaN(date.getTime())) {
                    searchTimeMax = date.toISOString();
                  } else {
                    throw new Error('Invalid date');
                  }
                } catch (error) {
                  console.error('Failed to normalize searchTimeMax:', searchTimeMax, error);
                  const oneMonth = new Date();
                  oneMonth.setMonth(oneMonth.getMonth() + 1);
                  searchTimeMax = oneMonth.toISOString();
                }
              }
              
              calendarResult = await calendarMCP.searchEvents(
                'primary',
                searchParams.query,
                {
                  timeMin: searchTimeMin,
                  timeMax: searchTimeMax,
                  timeZone: 'Asia/Kolkata'
                }
              );
              const searchEvents = calendarResult?.events || [];
              responseMessage = searchEvents.length > 0 ? 
                `🔍 **Found ${searchEvents.length} event(s) matching "${searchParams.query}":**\n\n` + 
                searchEvents.slice(0, 5).map(event => {
                  const start = new Date(event.start?.dateTime || event.start?.date);
                  return `• **${event.summary || 'Untitled Event'}**\n  🕐 ${start.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${event.location ? '\n  📍 ' + event.location : ''}`;
                }).join('\n\n') :
                `🔍 **No events found** matching "${searchParams.query}".`;
              break;
              
            case 'calendar_update':
              // First search for the event to update
              const updateParams = operationData.params || {};
              
              // Set default time range for today if not specified
              const today = new Date();
              const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
              const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
              
              const searchResult = await calendarMCP.searchEvents(
                'primary',
                updateParams.searchQuery,
                {
                  timeMin: updateParams.timeMin || todayStart,
                  timeMax: updateParams.timeMax || todayEnd,
                  timeZone: 'Asia/Kolkata'
                }
              );
              const foundEvents = searchResult?.events || [];
              
              if (foundEvents.length > 0) {
                const eventToUpdate = foundEvents[0];
                const updateData = {
                  eventId: eventToUpdate.id,
                  calendarId: 'primary',
                  ...updateParams.updates
                };
                calendarResult = await calendarMCP.updateEvent(updateData);
                responseMessage = calendarResult ? 
                  `✅ **Event updated successfully!**\n\n📅 **${calendarResult.summary || eventToUpdate.summary}**\n🔄 Changes applied` :
                  `❌ Failed to update event.`;
              } else {
                responseMessage = `❌ **Event not found** matching "${updateParams.searchQuery}".`;
              }
              break;
              
            case 'calendar_delete':
              // First search for the event to delete
              const deleteParams = operationData.params || {};
              
              // Set default time range for today if not specified
              const deleteToday = new Date();
              const deleteTodayStart = new Date(deleteToday.getFullYear(), deleteToday.getMonth(), deleteToday.getDate()).toISOString();
              const deleteTodayEnd = new Date(deleteToday.getFullYear(), deleteToday.getMonth(), deleteToday.getDate() + 1).toISOString();
              
              const deleteSearchResult = await calendarMCP.searchEvents(
                'primary',
                deleteParams.searchQuery,
                {
                  timeMin: deleteParams.timeMin || deleteTodayStart,
                  timeMax: deleteParams.timeMax || deleteTodayEnd,
                  timeZone: 'Asia/Kolkata'
                }
              );
              const eventsToDelete = deleteSearchResult?.events || [];
              
              if (eventsToDelete.length > 0) {
                const eventToDelete = eventsToDelete[0];
                calendarResult = await calendarMCP.deleteEvent(
                  'primary',
                  eventToDelete.id,
                  'all'
                );
                responseMessage = `✅ **Event deleted successfully!**\n\n📅 **${eventToDelete.summary}** has been removed from your calendar.`;
              } else {
                responseMessage = `❌ **Event not found** matching "${deleteParams.searchQuery}".`;
              }
              break;
              
            case 'calendar_availability':
              const availParams = operationData.params || {};
              const availabilityResult = await calendarMCP.getFreeBusy(
                ['primary'],
                availParams.timeMin,
                availParams.timeMax,
                'Asia/Kolkata'
              );
              
              // Process availability data
              const busyTimes = availabilityResult?.calendars?.primary?.busy || [];
              responseMessage = busyTimes.length > 0 ? 
                `📅 **Availability Check:**\n\n🔴 **Busy times:**\n` + 
                busyTimes.map(busy => {
                  const start = new Date(busy.start);
                  const end = new Date(busy.end);
                  return `• ${start.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} - ${end.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
                }).join('\n') :
                `✅ **You're completely free** during the requested time period!`;
              break;
              
            case 'calendar_calendars':
              calendarResult = await calendarMCP.listCalendars();
              const calendars = calendarResult?.calendars || [];
              responseMessage = calendars.length > 0 ? 
                `📅 **Your calendars:**\n\n` + 
                calendars.map(cal => {
                  return `• **${cal.summary}**${cal.primary ? ' (Primary)' : ''}\n  📧 ${cal.id}`;
                }).join('\n\n') :
                `📅 **No calendars found**.`;
              break;
              
            case 'calendar_colors':
              calendarResult = await calendarMCP.listColors();
              const formattedColors = formatMCPResponse(calendarResult, 'colors');
              const colorEntries = formattedColors?.event || {};
              responseMessage = Object.keys(colorEntries).length > 0 ? 
                `🎨 **Available event colors:**\n\n` + 
                Object.entries(colorEntries).map(([id, colors]) => {
                  return `• **Color ${id}:** Background: ${colors.background}, Text: ${colors.foreground}`;
                }).join('\n') :
                `🎨 **No color information available**.`;
              break;
              
            case 'calendar_time':
              const timeParams = operationData.params || {};
              calendarResult = await calendarMCP.getCurrentTime(timeParams.timeZone);
              const currentTime = new Date();
              responseMessage = `🕐 **Current time:**\n\n📅 ${currentTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n🌏 Timezone: Asia/Kolkata`;
              break;
              
            case 'calendar_freebusy':
              const freeBusyParams = operationData.params || {};
              const freeBusyResult = await calendarMCP.getFreeBusy(
                freeBusyParams.calendars || ['primary'],
                freeBusyParams.timeMin,
                freeBusyParams.timeMax,
                freeBusyParams.timeZone || 'Asia/Kolkata'
              );
              
              // Process free/busy data for display
              const busySlots = [];
              if (freeBusyResult?.calendars) {
                for (const calendarId in freeBusyResult.calendars) {
                  const calendarBusy = freeBusyResult.calendars[calendarId].busy || [];
                  busySlots.push(...calendarBusy);
                }
              }
              
              responseMessage = busySlots.length > 0 ? 
                `📊 **Free/Busy Check:**\n\n🔴 **Busy periods:**\n` + 
                busySlots.map(busy => {
                  const start = new Date(busy.start);
                  const end = new Date(busy.end);
                  return `• ${start.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} - ${end.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
                }).join('\n') :
                `✅ **You're completely free** during the specified time period!`;
              break;
              
            default:
              responseMessage = `❌ Unknown calendar operation: ${operationData.type}`;
          }
        } catch (calError) {
          console.error('MCP Calendar operation error:', calError);
          responseMessage = `❌ **Calendar operation failed:** ${calError.message}`;
        }
        
        res.json({ 
          response: responseMessage,
          calendarOperation: operationData.type,
          calendarResult: !!calendarResult
        });
        return;
      }
    } catch (parseError) {
      console.log('No calendar operation detected, continuing with normal response');
      // Check if the AI response itself is JSON-like and needs to be handled
      if (aiResponse.includes('"type":') && aiResponse.includes('calendar_')) {
        // If it looks like a calendar operation but failed to parse, return a user-friendly message
        res.json({ response: "I understand you want to work with your calendar. Let me help you with that. Can you please rephrase your request?" });
        return;
      }
    }
    
    // Regular AI response - clean up any JSON artifacts
    let cleanResponse = aiResponse;
    // Remove any remaining JSON artifacts that might be in the response
    cleanResponse = cleanResponse.replace(/\{[\s\S]*"type"\s*:\s*"calendar_[\s\S]*?\}/g, '');
    cleanResponse = cleanResponse.trim();
    
    // If response is empty after cleaning, provide a default response
    if (!cleanResponse) {
      cleanResponse = "I'm here to help! You can ask me about your schedule, create events, or ask any academic questions.";
    }
    
    res.json({ response: cleanResponse });
  } catch (err) {
    console.error('Groq API error:', err);
    res.status(500).json({ error: 'Failed to connect to Groq API' });
  }
});

// IP Geolocation endpoint
app.get('/location/detect', authenticate, async (req, res) => {
  try {
    // Get client IP address
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    // For development/localhost, use a fallback IP
    const ipToUse = (clientIP === '::1' || clientIP === '127.0.0.1' || !clientIP) 
      ? '8.8.8.8' // Google's public DNS as fallback
      : clientIP.split(',')[0].trim(); // Handle comma-separated IPs
    
    // Use ipapi.co for IP geolocation (free tier)
    const locationResponse = await fetch(`http://ipapi.co/${ipToUse}/json/`);
    const locationData = await locationResponse.json();
    
    if (locationData.error) {
      throw new Error(locationData.reason || 'Geolocation service error');
    }
    
    res.json({
      ip: ipToUse,
      city: locationData.city,
      region: locationData.region,
      country: locationData.country_name,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      timezone: locationData.timezone
    });
  } catch (err) {
    console.error('IP Geolocation error:', err);
    res.status(500).json({ error: 'Failed to detect location' });
  }
});

// Test endpoint (no auth required)
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// Weather endpoint - using OpenWeatherMap API
app.get('/weather', authenticate, async (req, res) => {
  const { city, lat, lon, auto } = req.query;
  
  try {
    let weatherData;
    
    if (lat && lon) {
      // Use coordinates for weather data
      weatherData = await getWeatherByCoordinates(parseFloat(lat), parseFloat(lon));
    } else if (city) {
      // Use city name for weather data
      weatherData = await getWeatherByCity(city);
    } else if (auto === 'true' || auto === '1') {
      // Auto-detect location based on IP address
      try {
        const locationData = await getLocationFromIP(req);
        if (locationData && locationData.latitude && locationData.longitude) {
          console.log(`Auto-detected location: ${locationData.city}, ${locationData.country} (${locationData.latitude}, ${locationData.longitude})`);
          weatherData = await getWeatherByCoordinates(locationData.latitude, locationData.longitude);
        } else {
          // Fallback to Bangalore if auto-detection fails
          console.log('Auto-detection failed, falling back to Bangalore');
          weatherData = await getWeatherByCity('Bangalore');
        }
      } catch (ipError) {
        console.log('IP-based location detection failed:', ipError.message);
        weatherData = await getWeatherByCity('Bangalore');
      }
    } else {
      // Default to Bangalore
      weatherData = await getWeatherByCity('Bangalore');
    }
    
    res.json(weatherData);
  } catch (err) {
    console.error('Weather API error:', err);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Weather by IP endpoint - automatically detects location and fetches weather
app.get('/weather/auto', authenticate, async (req, res) => {
  try {
    console.log('Auto-detecting weather based on IP address...');
    
    // Get location from IP
    const locationData = await getLocationFromIP(req);
    
    if (!locationData) {
      return res.status(500).json({ error: 'Failed to detect location from IP address' });
    }
    
    console.log(`Detected location: ${locationData.city}, ${locationData.country}`);
    
    // Get weather for detected location
    const weatherData = await getWeatherByCoordinates(locationData.latitude, locationData.longitude);
    
    // Include location info in the response
    const response = {
      ...weatherData,
      detectedLocation: {
        ip: locationData.ip,
        city: locationData.city,
        region: locationData.region,
        country: locationData.country,
        timezone: locationData.timezone
      }
    };
    
    res.json(response);
  } catch (err) {
    console.error('Auto weather detection error:', err);
    res.status(500).json({ error: 'Failed to auto-detect weather based on location' });
  }
});

// Helper function to get location from IP address with multiple fallback services
async function getLocationFromIP(req) {
  try {
    // Get client IP address
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    // For development/localhost, use a fallback IP
    const ipToUse = (clientIP === '::1' || clientIP === '127.0.0.1' || !clientIP) 
      ? '8.8.8.8' // Google's public DNS as fallback
      : clientIP.split(',')[0].trim(); // Handle comma-separated IPs
    
    console.log(`Detecting location for IP: ${ipToUse}`);
    
    // Try multiple IP geolocation services with fallbacks
    const services = [
      {
        name: 'ipapi.co',
        url: `http://ipapi.co/${ipToUse}/json/`,
        parseResponse: (data) => ({
          ip: ipToUse,
          city: data.city,
          region: data.region,
          country: data.country_name,
          latitude: data.latitude,
          longitude: data.longitude,
          timezone: data.timezone
        }),
        isError: (data) => !!data.error
      },
      {
        name: 'ip-api.com',
        url: `http://ip-api.com/json/${ipToUse}`,
        parseResponse: (data) => ({
          ip: ipToUse,
          city: data.city,
          region: data.regionName,
          country: data.country,
          latitude: data.lat,
          longitude: data.lon,
          timezone: data.timezone
        }),
        isError: (data) => data.status === 'fail'
      },
      {
        name: 'ipinfo.io',
        url: `https://ipinfo.io/${ipToUse}/json`,
        parseResponse: (data) => {
          const [lat, lon] = (data.loc || '0,0').split(',');
          return {
            ip: ipToUse,
            city: data.city,
            region: data.region,
            country: data.country,
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
            timezone: data.timezone
          };
        },
        isError: (data) => !!data.error
      }
    ];
    
    for (const service of services) {
      try {
        console.log(`Trying ${service.name}...`);
        const locationResponse = await fetch(service.url);
        
        if (!locationResponse.ok) {
          console.log(`${service.name} returned ${locationResponse.status}`);
          continue;
        }
        
        const locationData = await locationResponse.json();
        
        if (service.isError(locationData)) {
          console.log(`${service.name} returned error:`, locationData);
          continue;
        }
        
        const parsedData = service.parseResponse(locationData);
        
        // Validate required fields
        if (!parsedData.latitude || !parsedData.longitude) {
          console.log(`${service.name} missing coordinates`);
          continue;
        }
        
        console.log(`✅ Successfully got location from ${service.name}:`, 
                   `${parsedData.city}, ${parsedData.country} (${parsedData.latitude}, ${parsedData.longitude})`);
        return parsedData;
        
      } catch (serviceError) {
        console.log(`${service.name} failed:`, serviceError.message);
        continue;
      }
    }
    
    // If all services fail, return a default location (Bangalore, India)
    console.log('All IP geolocation services failed, using default location (Bangalore, India)');
    return {
      ip: ipToUse,
      city: 'Bangalore',
      region: 'Karnataka',
      country: 'India',
      latitude: 12.9716,
      longitude: 77.5946,
      timezone: 'Asia/Kolkata'
    };
    
  } catch (error) {
    console.error('IP geolocation error:', error);
    // Return default location on error
    return {
      ip: '8.8.8.8',
      city: 'Bangalore',
      region: 'Karnataka',
      country: 'India',
      latitude: 12.9716,
      longitude: 77.5946,
      timezone: 'Asia/Kolkata'
    };
  }
}

// Helper function to get weather by coordinates
async function getWeatherByCoordinates(lat, lon) {
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  
  if (!API_KEY) {
    console.warn('OpenWeatherMap API key not configured, using mock data');
    return getMockWeatherData(`Location at ${lat.toFixed(2)}, ${lon.toFixed(2)}`, lat, lon);
  }
  
  try {
    // Get current weather by coordinates
    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const currentResponse = await fetch(currentWeatherUrl);
    
    if (!currentResponse.ok) {
      throw new Error(`Weather API error: ${currentResponse.status}`);
    }
    
    const currentData = await currentResponse.json();
    
    // Get 5-day forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const forecastResponse = await fetch(forecastUrl);
    let forecastData = null;
    
    if (forecastResponse.ok) {
      forecastData = await forecastResponse.json();
    }
    
    return formatWeatherData(currentData, forecastData, lat, lon);
  } catch (error) {
    console.error('Error fetching weather by coordinates:', error);
    return getMockWeatherData(`Location at ${lat.toFixed(2)}, ${lon.toFixed(2)}`, lat, lon);
  }
}

// Helper function to get weather by city
async function getWeatherByCity(city) {
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  
  if (!API_KEY) {
    console.warn('OpenWeatherMap API key not configured, using mock data');
    return getMockWeatherData(`${city}, India`);
  }
  
  try {
    // Get current weather by city name
    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const currentResponse = await fetch(currentWeatherUrl);
    
    if (!currentResponse.ok) {
      throw new Error(`Weather API error: ${currentResponse.status}`);
    }
    
    const currentData = await currentResponse.json();
    
    // Get 5-day forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const forecastResponse = await fetch(forecastUrl);
    let forecastData = null;
    
    if (forecastResponse.ok) {
      forecastData = await forecastResponse.json();
    }
    
    return formatWeatherData(currentData, forecastData);
  } catch (error) {
    console.error('Error fetching weather by city:', error);
    return getMockWeatherData(`${city}, India`);
  }
}

// Helper function to format OpenWeatherMap data
function formatWeatherData(currentData, forecastData, lat = null, lon = null) {
  const formatCondition = (weatherMain) => {
    switch (weatherMain.toLowerCase()) {
      case 'clear':
        return 'Sunny';
      case 'clouds':
        return 'Cloudy';
      case 'rain':
      case 'drizzle':
        return 'Rainy';
      case 'thunderstorm':
        return 'Stormy';
      case 'snow':
        return 'Snowy';
      case 'mist':
      case 'fog':
        return 'Foggy';
      default:
        return 'Partly Cloudy';
    }
  };
  
  // Process forecast data
  let forecast = [];
  if (forecastData && forecastData.list) {
    const dailyForecasts = {};
    const days = ['Today', 'Tomorrow', 'Wednesday', 'Thursday', 'Friday'];
    
    forecastData.list.forEach(item => {
      const date = new Date(item.dt * 1000).toDateString();
      if (!dailyForecasts[date]) {
        dailyForecasts[date] = {
          temps: [item.main.temp],
          conditions: [item.weather[0].main]
        };
      } else {
        dailyForecasts[date].temps.push(item.main.temp);
        dailyForecasts[date].conditions.push(item.weather[0].main);
      }
    });
    
    let dayIndex = 0;
    for (const [date, data] of Object.entries(dailyForecasts)) {
      if (dayIndex >= 5) break;
      
      const temps = data.temps;
      const conditions = data.conditions;
      
      forecast.push({
        day: days[dayIndex] || new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
        high: Math.round(Math.max(...temps)),
        low: Math.round(Math.min(...temps)),
        condition: formatCondition(conditions[0]) // Use first condition of the day
      });
      
      dayIndex++;
    }
  }
  
  // Fill remaining days with mock data if needed
  while (forecast.length < 5) {
    const dayNames = ['Today', 'Tomorrow', 'Wednesday', 'Thursday', 'Friday'];
    forecast.push({
      day: dayNames[forecast.length],
      high: Math.round(currentData.main.temp + Math.random() * 6 - 3),
      low: Math.round(currentData.main.temp - 5),
      condition: formatCondition(currentData.weather[0].main)
    });
  }
  
  return {
    location: `${currentData.name}, ${currentData.sys.country}`,
    latitude: lat || currentData.coord.lat,
    longitude: lon || currentData.coord.lon,
    temperature: Math.round(currentData.main.temp),
    condition: formatCondition(currentData.weather[0].main),
    description: currentData.weather[0].description,
    humidity: currentData.main.humidity,
    windSpeed: Math.round(currentData.wind.speed * 3.6), // Convert m/s to km/h
    visibility: currentData.visibility ? Math.round(currentData.visibility / 1000) : 10, // Convert m to km
    feelsLike: Math.round(currentData.main.feels_like),
    pressure: currentData.main.pressure,
    sunrise: new Date(currentData.sys.sunrise * 1000).toLocaleTimeString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit'
    }),
    sunset: new Date(currentData.sys.sunset * 1000).toLocaleTimeString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit'
    }),
    forecast
  };
}

// Helper function to generate mock weather data when API is unavailable
function getMockWeatherData(location, lat = null, lon = null) {
  return {
    location,
    latitude: lat,
    longitude: lon,
    temperature: Math.floor(Math.random() * 15) + 20, // 20-35°C
    condition: ['Sunny', 'Cloudy', 'Partly Cloudy', 'Rainy'][Math.floor(Math.random() * 4)],
    description: 'Mock weather data - configure OPENWEATHER_API_KEY for real data',
    humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
    windSpeed: Math.floor(Math.random() * 15) + 5, // 5-20 km/h
    visibility: Math.floor(Math.random() * 5) + 8, // 8-12 km
    feelsLike: Math.floor(Math.random() * 15) + 22, // 22-37°C
    pressure: Math.floor(Math.random() * 50) + 1000,
    sunrise: '06:30',
    sunset: '18:45',
    forecast: Array.from({ length: 5 }, (_, i) => ({
      day: ['Today', 'Tomorrow', 'Wednesday', 'Thursday', 'Friday'][i],
      high: Math.floor(Math.random() * 10) + 25,
      low: Math.floor(Math.random() * 8) + 18,
      condition: ['Sunny', 'Cloudy', 'Partly Cloudy'][Math.floor(Math.random() * 3)]
    }))
  };
}

// Daily digest endpoint
app.post('/digest/generate', authenticate, async (req, res) => {
  try {
    // Get user profile for personalization
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', req.user_id)
      .single();

    // Get recent expenses for budget info
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', req.user_id)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false });

    const totalSpent = expenses?.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) || 0;
    
    const digest = {
      date: new Date().toISOString().split('T')[0],
      greeting: `Good morning, ${profile?.name || 'Student'}!`,
      summary: {
        weeklySpending: `₹${totalSpent.toFixed(2)}`,
        expenseCount: expenses?.length || 0,
        topCategory: expenses?.length > 0 ? expenses[0].category : 'No expenses',
        studyStreak: Math.floor(Math.random() * 10) + 1 + ' days'
      },
      tasks: [
        'Review yesterday\'s study notes',
        'Complete pending assignments',
        'Plan today\'s study schedule',
        'Check upcoming deadlines'
      ],
      motivation: [
        'Every expert was once a beginner. Keep learning!',
        'Success is the sum of small efforts repeated daily.',
        'Your future self will thank you for studying today.',
        'Knowledge is power. Embrace it!'
      ][Math.floor(Math.random() * 4)],
      weather: 'Check the weather page for today\'s forecast and study tips!'
    };

    res.json(digest);
  } catch (err) {
    console.error('Digest generation error:', err);
    res.status(500).json({ error: 'Failed to generate daily digest' });
  }
});

// Calendar events endpoint
app.get('/calendar/events', authenticate, async (req, res) => {
  try {
    // Mock calendar events - replace with actual calendar integration
    const events = [
      {
        id: '1',
        title: 'Mathematics Study Session',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '14:00',
        type: 'study',
        duration: 120
      },
      {
        id: '2',
        title: 'Physics Assignment Due',
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '23:59',
        type: 'deadline',
        priority: 'high'
      },
      {
        id: '3',
        title: 'Computer Science Lab',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '10:00',
        type: 'class',
        duration: 180
      }
    ];
    res.json(events);
  } catch (err) {
    console.error('Calendar events error:', err);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// Add calendar event
app.post('/calendar/events', authenticate, async (req, res) => {
  const { title, date, time, type, duration, description } = req.body;
  try {
    // Mock response - replace with actual calendar integration
    const newEvent = {
      id: Date.now().toString(),
      title,
      date,
      time,
      type,
      duration,
      description,
      user_id: req.user_id,
      created_at: new Date().toISOString()
    };
    res.status(201).json(newEvent);
  } catch (err) {
    console.error('Add calendar event error:', err);
    res.status(500).json({ error: 'Failed to add calendar event' });
  }
});

// Usage tracking endpoint
app.get('/usage/stats', authenticate, async (req, res) => {
  try {
    // Mock usage stats - replace with actual tracking
    const stats = {
      daily: {
        aiChats: Math.floor(Math.random() * 15) + 5,
        calendarEvents: Math.floor(Math.random() * 8) + 2,
        weatherChecks: Math.floor(Math.random() * 10) + 5,
        budgetEntries: Math.floor(Math.random() * 5) + 1,
        digestGenerated: Math.floor(Math.random() * 2)
      },
      weekly: {
        totalInteractions: Math.floor(Math.random() * 50) + 100,
        mostUsedFeature: 'AI Chat',
        timesSaved: '2.5 hours',
        streakDays: Math.floor(Math.random() * 10) + 5
      },
      limits: {
        aiChats: { current: Math.floor(Math.random() * 15) + 5, total: 25 },
        calendarEvents: { current: Math.floor(Math.random() * 8) + 2, total: 50 },
        emailSummaries: { current: 0, total: 10, isPro: true },
        weatherRequests: { current: Math.floor(Math.random() * 10) + 5, total: 100 },
        dailyDigests: { current: Math.floor(Math.random() * 3) + 1, total: 5 },
        budgetExports: { current: Math.floor(Math.random() * 2) + 1, total: 3 }
      }
    };
    res.json(stats);
  } catch (err) {
    console.error('Usage stats error:', err);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

// Email summarization endpoint (Premium feature)
app.post('/email/summarize', authenticate, async (req, res) => {
  const { emailContent } = req.body;
  try {
    // Check if user is premium
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('user_id', req.user_id)
      .single();

    if (!profile?.is_premium) {
      return res.status(403).json({ error: 'Premium feature. Please upgrade to access email summarization.' });
    }

    // Use Groq API for email summarization
    const groqRes = await fetch(process.env.GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { 
            role: 'system', 
            content: 'You are an email summarization assistant. Provide concise, bullet-point summaries of emails focusing on key information, action items, and deadlines.' 
          },
          { 
            role: 'user', 
            content: `Please summarize this email:\n\n${emailContent}` 
          }
        ]
      })
    });

    const data = await groqRes.json();
    if (!groqRes.ok) return res.status(500).json({ error: data.error || 'Email summarization failed' });
    
    res.json({ 
      summary: data.choices?.[0]?.message?.content || 'Unable to generate summary',
      wordCount: emailContent.split(' ').length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Email summarization error:', err);
    res.status(500).json({ error: 'Failed to summarize email' });
  }
});

// Google Calendar OAuth callback endpoint (no auth required)
app.get('/oauth2callback', async (req, res) => {
  try {
    const { code, error, state } = req.query;
    
    if (error) {
      console.error('OAuth error:', error);
      return res.send(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>Error: ${error}</p>
            <script>window.close();</script>
          </body>
        </html>
      `);
    }
    
    if (!code) {
      return res.status(400).send(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>No authorization code received</p>
            <script>window.close();</script>
          </body>
        </html>
      `);
    }
    
    // Exchange code for tokens
    try {
const tokens = await calendarMCP.getAccessToken(code);
      
      // Success page that closes the popup
      res.send(`
        <html>
          <body>
            <h1>Authorization Successful!</h1>
            <p>Your Google Calendar is now connected. You can close this window.</p>
            <script>
              // Send message to parent window and close popup
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
              }
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    } catch (tokenError) {
      console.error('Token exchange error:', tokenError);
      res.send(`
        <html>
          <body>
            <h1>Token Exchange Failed</h1>
            <p>Error: ${tokenError.message}</p>
            <script>window.close();</script>
          </body>
        </html>
      `);
    }
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send(`
      <html>
        <body>
          <h1>Server Error</h1>
          <p>Error: ${err.message}</p>
          <script>window.close();</script>
        </body>
      </html>
    `);
  }
});

// =================================
// MCP GOOGLE CALENDAR ENDPOINTS
// Using the existing google-calendar-mcp server
// =================================

// Check calendar setup status
app.get('/calendar/mcp/status', authenticate, async (req, res) => {
  const status = calendarMCP.getStatus();
  res.json({
    mcpConnected: status.ready,
    initialized: status.initialized,
    authenticated: status.authenticated,
    setupInstructions: 'To set up calendar integration, please configure Google Calendar OAuth credentials as described in the documentation.'
  });
});

// Trigger calendar authentication setup
app.post('/calendar/mcp/setup-auth', authenticate, async (req, res) => {
  try {
    console.log('Starting calendar authentication setup...');
    
    // Try to connect to MCP server which will trigger authentication if needed
    await calendarMCP.connect();
    
    if (calendarMCP.isConnected) {
      // Try to list calendars to verify authentication
      try {
        const calendars = await calendarMCP.listCalendars();
        res.json({
          success: true,
          message: 'Calendar authentication completed successfully',
          calendars: calendars
        });
      } catch (authError) {
        res.json({
          success: false,
          message: 'MCP server connected but authentication required',
          error: authError.message,
          setupRequired: true
        });
      }
    } else {
      res.status(503).json({
        success: false,
        message: 'Failed to connect to MCP Calendar server',
        setupRequired: true,
        instructions: 'Please ensure the MCP server is properly built and OAuth credentials are configured.'
      });
    }
  } catch (error) {
    console.error('Calendar setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Calendar setup failed',
      error: error.message,
      setupRequired: true
    });
  }
});

// Test calendar creation endpoint
app.post('/calendar/mcp/test-create', authenticate, async (req, res) => {
  try {
    const testEvent = {
      title: 'Test Chill Session',
      description: 'A test event created by the API',
      start: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
    };
    
    console.log('Creating test event:', testEvent);
    const result = await calendarMCP.createEvent(testEvent);
    console.log('Test event result:', result);
    
    res.json({
      success: true,
      event: testEvent,
      result: result
    });
  } catch (err) {
    console.error('Test create event error:', err);
    res.status(500).json({ error: 'Test create failed: ' + err.message, details: err });
  }
});

// Debug endpoint to test AI responses without calling actual AI
app.post('/ai/debug-calendar', authenticate, async (req, res) => {
  const { message } = req.body;
  console.log('Debug chat message:', message);
  
  try {
    // Simulate different AI responses based on input
    let simulatedResponse = '';
    
    if (message.toLowerCase().includes('schedule') || message.toLowerCase().includes('create event')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(15, 0, 0, 0); // 3 PM
      const endTime = new Date(tomorrow);
      endTime.setHours(16, 0, 0, 0); // 4 PM
      
      simulatedResponse = JSON.stringify({
        "type": "calendar_create",
        "event": {
          "title": "Study Session",
          "description": "AI scheduled study session",
          "start": tomorrow.toISOString().slice(0, 19),
          "end": endTime.toISOString().slice(0, 19),
          "location": "",
          "attendees": []
        },
        "message": "Creating your study session..."
      });
    } else if (message.toLowerCase().includes('events today') || message.toLowerCase().includes('what are my events')) {
      simulatedResponse = JSON.stringify({
        "type": "calendar_list",
        "params": {
          "calendarId": "primary"
        },
        "message": "Let me check your calendar..."
      });
    } else {
      simulatedResponse = "I understand you want to work with your calendar. For debugging: try 'schedule a meeting tomorrow' or 'what are my events today'";
    }
    
    console.log('Simulated AI response:', simulatedResponse);
    
    // Process the simulated response using the same logic as the real AI endpoint
    if (simulatedResponse.includes('"type"') && simulatedResponse.includes('calendar_')) {
      try {
        // Use the same robust JSON extraction logic
        const extractCompleteJSON = (text) => {
          const startIndex = text.indexOf('{');
          if (startIndex === -1) return null;
          
          let bracketCount = 0;
          let inString = false;
          let escaped = false;
          
          for (let i = startIndex; i < text.length; i++) {
            const char = text[i];
            
            if (escaped) {
              escaped = false;
              continue;
            }
            
            if (char === '\\') {
              escaped = true;
              continue;
            }
            
            if (char === '"' && !escaped) {
              inString = !inString;
              continue;
            }
            
            if (!inString) {
              if (char === '{') {
                bracketCount++;
              } else if (char === '}') {
                bracketCount--;
                if (bracketCount === 0) {
                  return text.substring(startIndex, i + 1);
                }
              }
            }
          }
          return null;
        };
        
        const extractedJson = extractCompleteJSON(simulatedResponse);
        const operationData = JSON.parse(extractedJson || simulatedResponse);
        console.log('Debug: Calendar operation detected:', operationData);
        
        let calendarResult = null;
        let responseMessage = operationData.message || 'Processing your calendar request...';
        
        // Execute the calendar operation
        switch (operationData.type) {
          case 'calendar_create':
            calendarResult = await calendarMCP.createEvent(operationData.event);
            const startDate = new Date(operationData.event.start);
            const endDate = new Date(operationData.event.end);
            responseMessage = calendarResult ? 
              `✅ **Debug Event created successfully!**\n\n📅 **${operationData.event.title}**\n📍 ${operationData.event.location || 'No location specified'}\n🕐 ${startDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} - ${endDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n${operationData.event.description ? '📝 ' + operationData.event.description : ''}` :
              `❌ Failed to create debug event. ${operationData.message}`;
            break;
            
          case 'calendar_list':
            const listParams = operationData.params || {};
            calendarResult = await calendarMCP.listEvents(
              listParams.calendarId || 'primary',
              listParams.timeMin,
              listParams.timeMax,
              'Asia/Kolkata'
            );
            const events = calendarResult?.events || [];
            responseMessage = events.length > 0 ? 
              `📅 **Debug: Found ${events.length} event(s):**\n\n` + 
              events.slice(0, 10).map(event => {
                const start = new Date(event.start?.dateTime || event.start?.date);
                return `• **${event.summary || 'Untitled Event'}**\n  🕐 ${start.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${event.location ? '\n  📍 ' + event.location : ''}`;
              }).join('\n\n') :
              `📅 **Debug: No events found** for the specified time period.`;
            break;
        }
        
        res.json({ 
          response: responseMessage,
          calendarOperation: operationData.type,
          calendarResult: !!calendarResult,
          debug: true
        });
        return;
      } catch (parseError) {
        console.log('Debug: JSON parse error:', parseError);
      }
    }
    
    res.json({ 
      response: simulatedResponse,
      debug: true 
    });
    
  } catch (err) {
    console.error('Debug chat error:', err);
    res.status(500).json({ error: 'Debug chat failed: ' + err.message });
  }
});

// Helper function to format MCP responses for frontend consistency
const formatMCPResponse = (mcpResult, type = 'unknown') => {
  console.log('formatMCPResponse called with:', { type, result: mcpResult });
  
  // First check if mcpResult already has the structured data we need
  if (mcpResult && typeof mcpResult === 'object') {
    // For calendars: check if it already has the calendars array
    if (type === 'calendars' && mcpResult.calendars && Array.isArray(mcpResult.calendars)) {
      console.log('Returning structured calendars response');
      return mcpResult;
    }
    
    // For events: check if it already has the events array
    if (type === 'events' && mcpResult.events && Array.isArray(mcpResult.events)) {
      console.log('Returning structured events response');
      return mcpResult;
    }
    
    // For colors: check if it already has the colors structure
    if (type === 'colors' && (mcpResult.colors || mcpResult.event)) {
      console.log('Returning structured colors response');
      return mcpResult;
    }
  }
  
  // If mcpResult has a message property (plain text response), try to extract structured data
  if (mcpResult && mcpResult.message && typeof mcpResult.message === 'string') {
    const message = mcpResult.message;
    
    switch (type) {
      case 'calendars':
        // Parse calendar list from message text
        const calendars = [];
        const calendarBlocks = message.split('\n\n').filter(block => block.trim());
        
        for (const block of calendarBlocks) {
          const lines = block.split('\n');
          const titleLine = lines[0];
          if (titleLine && titleLine.includes('(') && titleLine.includes(')')) {
            const match = titleLine.match(/^(.+?)\s*\(([^)]+)\)$/);
            if (match) {
              const [, summary, id] = match;
              const isPrimary = titleLine.includes('PRIMARY');
              calendars.push({
                id: id.trim(),
                summary: summary.trim(),
                primary: isPrimary
              });
            }
          }
        }
        return { calendars, total: calendars.length };
        
      case 'events':
        // Parse events list from message text
        const events = [];
        console.log('Parsing events from message:', message.substring(0, 300) + '...');
        
        if (message.includes('Found ') && message.includes('event(s):')) {
          const eventBlocks = message.split(/\n\n\d+\. /).slice(1);
          console.log('Found event blocks:', eventBlocks.length);
          
          for (const block of eventBlocks) {
            const lines = block.split('\n');
            const eventLine = lines[0];
            console.log('Processing event line:', eventLine);
            
            if (eventLine && eventLine.startsWith('Event: ')) {
              const summary = eventLine.replace('Event: ', '');
              const idLine = lines.find(l => l.startsWith('Event ID: '));
              const descLine = lines.find(l => l.startsWith('Description: '));
              const startLine = lines.find(l => l.startsWith('Start: '));
              const endLine = lines.find(l => l.startsWith('End: '));
              const locationLine = lines.find(l => l.startsWith('Location: '));
              const viewLine = lines.find(l => l.startsWith('View: '));
              
              if (idLine && startLine && endLine) {
                const parseDateTime = (dateStr) => {
                  const cleanStr = dateStr.replace(/ GMT.*$/, '');
                  try {
                    return new Date(cleanStr).toISOString();
                  } catch (e) {
                    console.warn('Failed to parse date:', dateStr);
                    return dateStr; // Return original if parsing fails
                  }
                };
                
                const event = {
                  id: idLine.replace('Event ID: ', ''),
                  summary,
                  description: descLine ? descLine.replace('Description: ', '') : '',
                  start: {
                    dateTime: parseDateTime(startLine.replace('Start: ', '')),
                    timeZone: 'Asia/Kolkata'
                  },
                  end: {
                    dateTime: parseDateTime(endLine.replace('End: ', '')),
                    timeZone: 'Asia/Kolkata'
                  },
                  location: locationLine ? locationLine.replace('Location: ', '') : '',
                  htmlLink: viewLine ? viewLine.replace('View: ', '') : ''
                };
                
                console.log('Parsed event:', event.summary, event.start.dateTime);
                events.push(event);
              } else {
                console.warn('Missing required fields for event:', { idLine: !!idLine, startLine: !!startLine, endLine: !!endLine });
              }
            }
          }
        } else if (message.includes('No events found') || message.includes('no events')) {
          console.log('No events found in message');
        } else {
          console.log('Message format not recognized for events parsing');
        }
        return { events, total: events.length };
        
      case 'colors':
        // Parse colors from message text
        const colors = {};
        const colorLines = message.split('\n').filter(line => line.includes('Color ID:'));
        
        for (const line of colorLines) {
          const match = line.match(/Color ID: (\d+) - (#[0-9a-f]{6}) \(background\) \/ (#[0-9a-f]{6}) \(foreground\)/);
          if (match) {
            const [, id, background, foreground] = match;
            colors[id] = { background, foreground };
          }
        }
        return { event: colors };
        
      default:
        return mcpResult;
    }
  }
  
  // If it's already structured data, return as-is
  return mcpResult;
};

// List all calendars
app.get('/calendar/mcp/calendars', authenticate, async (req, res) => {
  try {
    console.log('=== DEBUG: Calendar MCP listCalendars() called ===');
    const calendars = await calendarMCP.listCalendars();
    console.log('=== DEBUG: Raw calendars response:', JSON.stringify(calendars, null, 2));
    const formattedResponse = formatMCPResponse(calendars, 'calendars');
    console.log('=== DEBUG: Formatted response:', JSON.stringify(formattedResponse, null, 2));
    res.json(formattedResponse);
  } catch (err) {
    console.error('MCP list calendars error:', err);
    if (err.message.includes('Calendar service is currently unavailable')) {
      res.status(503).json({ 
        error: 'Calendar integration is not set up. Please configure Google Calendar OAuth credentials.',
        setupRequired: true,
        instructions: 'Follow the setup guide to create Desktop app OAuth credentials and run authentication.'
      });
    } else {
      res.status(500).json({ error: 'Failed to list calendars: ' + err.message });
    }
  }
});

// List events from one or more calendars
app.get('/calendar/mcp/events', authenticate, async (req, res) => {
  try {
    const { 
      calendarId = 'primary', 
      timeMin, 
      timeMax, 
      timeZone = 'Asia/Kolkata' 
    } = req.query;
    
    // Apply proper ISO 8601 formatting  
    const toIso8601 = (dateValue) => {
      if (!dateValue) return null;
      try {
        const date = new Date(dateValue);
        return date.toISOString();
      } catch (error) {
        console.warn('Invalid date value:', dateValue);
        return null;
      }
    };
    const formattedTimeMin = timeMin ? toIso8601(timeMin) : timeMin;
    const formattedTimeMax = timeMax ? toIso8601(timeMax) : timeMax;
    
    const events = await calendarMCP.listEvents(calendarId, {
      timeMin: formattedTimeMin,
      timeMax: formattedTimeMax,
      timeZone
    });
    const formattedResponse = formatMCPResponse(events, 'events');
    res.json(formattedResponse);
  } catch (err) {
    console.error('MCP list events error:', err);
    res.status(500).json({ error: 'Failed to list events: ' + err.message });
  }
});

// Search events by text query
app.get('/calendar/mcp/search', authenticate, async (req, res) => {
  try {
    const { 
      calendarId = 'primary', 
      query: rawQuery, 
      timeMin, 
      timeMax, 
      timeZone = 'Asia/Kolkata' 
    } = req.query;
    
    // Ensure query is a string, not an array
    const query = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // Apply proper ISO 8601 formatting
    const toIso8601 = (dateValue) => {
      if (!dateValue) return null;
      try {
        const date = new Date(dateValue);
        return date.toISOString();
      } catch (error) {
        console.warn('Invalid date value:', dateValue);
        return null;
      }
    };
    const formattedTimeMin = timeMin ? toIso8601(timeMin) : timeMin;
    const formattedTimeMax = timeMax ? toIso8601(timeMax) : timeMax;
    
    const events = await calendarMCP.searchEvents(calendarId, query, {
      timeMin: formattedTimeMin,
      timeMax: formattedTimeMax,
      timeZone
    });
    const formattedResponse = formatMCPResponse(events, 'events');
    res.json(formattedResponse);
  } catch (err) {
    console.error('MCP search events error:', err);
    res.status(500).json({ error: 'Failed to search events: ' + err.message });
  }
});

// Create a new calendar event
app.post('/calendar/mcp/events', authenticate, async (req, res) => {
  try {
    console.log('Creating event with data:', JSON.stringify(req.body, null, 2));
    const event = await calendarMCP.createEvent(req.body);
    console.log('MCP returned event:', JSON.stringify(event, null, 2));
    
    // Normalize the event data to ensure consistent format for the UI
    let normalizedEvent = event;
    if (event && typeof event === 'object') {
      // If event has nested start/end objects, leave them as is
      // If event has flat start/end strings, wrap them in objects
      if (event.start && typeof event.start === 'string') {
        normalizedEvent = {
          ...event,
          start: {
            dateTime: event.start,
            timeZone: 'Asia/Kolkata'
          }
        };
      }
      if (event.end && typeof event.end === 'string') {
        normalizedEvent = {
          ...normalizedEvent,
          end: {
            dateTime: event.end,
            timeZone: 'Asia/Kolkata'
          }
        };
      }
    }
    
    console.log('Returning normalized event:', JSON.stringify(normalizedEvent, null, 2));
    res.status(201).json(normalizedEvent);
  } catch (err) {
    console.error('MCP create event error:', err);
    res.status(500).json({ error: 'Failed to create event: ' + err.message });
  }
});

// Update an existing calendar event
app.put('/calendar/mcp/events/:eventId', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const eventData = {
      ...req.body,
      eventId
    };
    
    const event = await calendarMCP.updateEvent(eventData);
    res.json(event);
  } catch (err) {
    console.error('MCP update event error:', err);
    res.status(500).json({ error: 'Failed to update event: ' + err.message });
  }
});

// Delete a calendar event
app.delete('/calendar/mcp/events/:eventId', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { calendarId = 'primary', sendUpdates = 'all' } = req.query;
    
    const result = await calendarMCP.deleteEvent(calendarId, eventId, sendUpdates);
    res.json(result);
  } catch (err) {
    console.error('MCP delete event error:', err);
    res.status(500).json({ error: 'Failed to delete event: ' + err.message });
  }
});

// Get free/busy information for calendars
app.post('/calendar/mcp/freebusy', authenticate, async (req, res) => {
  try {
    const { calendars, timeMin, timeMax, timeZone = 'Asia/Kolkata' } = req.body;
    
    if (!calendars || !Array.isArray(calendars)) {
      return res.status(400).json({ error: 'Calendars array is required' });
    }
    
    if (!timeMin || !timeMax) {
      return res.status(400).json({ error: 'timeMin and timeMax are required' });
    }
    
    const freeBusy = await calendarMCP.getFreeBusy(calendars, timeMin, timeMax, timeZone);
    res.json(freeBusy);
  } catch (err) {
    console.error('MCP free/busy error:', err);
    res.status(500).json({ error: 'Failed to get free/busy information: ' + err.message });
  }
});

// Get current time in specified timezone
app.get('/calendar/mcp/time', authenticate, async (req, res) => {
  try {
    const { timeZone } = req.query;
    const time = await calendarMCP.getCurrentTime(timeZone);
    res.json(time);
  } catch (err) {
    console.error('MCP get time error:', err);
    res.status(500).json({ error: 'Failed to get current time: ' + err.message });
  }
});

// List available event colors
app.get('/calendar/mcp/colors', authenticate, async (req, res) => {
  try {
    const colors = await calendarMCP.listColors();
    const formattedResponse = formatMCPResponse(colors, 'colors');
    res.json(formattedResponse);
  } catch (err) {
    console.error('MCP list colors error:', err);
    res.status(500).json({ error: 'Failed to list colors: ' + err.message });
  }
});

// Advanced multi-calendar event listing
app.post('/calendar/mcp/events/batch', authenticate, async (req, res) => {
  try {
    const { 
      calendarIds = ['primary'], 
      timeMin, 
      timeMax, 
      timeZone = 'Asia/Kolkata' 
    } = req.body;
    
    // Use JSON string format for multiple calendars as expected by MCP server
    const calendarIdParam = calendarIds.length > 1 ? JSON.stringify(calendarIds) : calendarIds[0];
    
    const events = await calendarMCP.listEvents(calendarIdParam, timeMin, timeMax, timeZone);
    res.json(events);
  } catch (err) {
    console.error('MCP batch events error:', err);
    res.status(500).json({ error: 'Failed to list batch events: ' + err.message });
  }
});

// Smart scheduling helper - find available slots
app.post('/calendar/mcp/availability', authenticate, async (req, res) => {
  try {
    const { 
      calendars = ['primary'], 
      timeMin, 
      timeMax, 
      duration = 60, // duration in minutes
      timeZone = 'Asia/Kolkata' 
    } = req.body;
    
    if (!timeMin || !timeMax) {
      return res.status(400).json({ error: 'timeMin and timeMax are required' });
    }
    
    // Get free/busy information
    const freeBusy = await calendarMCP.getFreeBusy(calendars, timeMin, timeMax, timeZone);
    
    // Process the free/busy data to find available slots
    const availableSlots = [];
    const startTime = new Date(timeMin);
    const endTime = new Date(timeMax);
    const durationMs = duration * 60 * 1000;
    
    // Simple algorithm to find free slots (can be enhanced)
    let currentTime = new Date(startTime);
    while (currentTime.getTime() + durationMs <= endTime.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + durationMs);
      
      // Check if this slot conflicts with any busy periods
      let isFree = true;
      if (freeBusy.calendars) {
        for (const calendarId in freeBusy.calendars) {
          const busyPeriods = freeBusy.calendars[calendarId].busy || [];
          for (const busy of busyPeriods) {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            
            if ((currentTime < busyEnd) && (slotEnd > busyStart)) {
              isFree = false;
              break;
            }
          }
          if (!isFree) break;
        }
      }
      
      if (isFree) {
        availableSlots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString()
        });
      }
      
      // Move to next 30-minute slot
      currentTime = new Date(currentTime.getTime() + (30 * 60 * 1000));
    }
    
    res.json({
      availableSlots,
      freeBusyData: freeBusy,
      requestedDuration: duration
    });
  } catch (err) {
    console.error('MCP availability error:', err);
    res.status(500).json({ error: 'Failed to check availability: ' + err.message });
  }
});

// Delete account endpoint
app.delete('/auth/delete-account', authenticate, async (req, res) => {
  try {
    const userId = req.user_id;
    
    // Delete user's profile first
    await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);
    
    // Delete user's expenses
    await supabase
      .from('expenses')
      .delete()
      .eq('user_id', userId);
    
    // Delete the user account from Supabase Auth
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error('Error deleting user:', error);
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Setup new calendar endpoints
setupCalendarEndpoints(app, authenticate);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`);
  console.log('Available calendar endpoints:');
  console.log('  GET  /calendar/calendars       - List all calendars');
  console.log('  GET  /calendar/events          - List events');
  console.log('  GET  /calendar/events/today    - Get today\'s events');
  console.log('  GET  /calendar/events/week     - Get week events');
  console.log('  GET  /calendar/events/search   - Search events');
  console.log('  POST /calendar/events          - Create event');
  console.log('  PUT  /calendar/events/:id      - Update event');
  console.log('  DELETE /calendar/events/:id    - Delete event');
  console.log('  POST /calendar/freebusy        - Get free/busy info');
  console.log('  POST /calendar/availability    - Find available slots');
  console.log('  GET  /calendar/availability/next - Find next slot');
  console.log('  GET  /calendar/status          - Service status');
  console.log('  GET  /calendar/health          - Health check');
});

