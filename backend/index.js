import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import * as chrono from 'chrono-node';
import GoogleCalendarService from './calendar-service.js';


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

// Google Calendar Service
const calendarService = new GoogleCalendarService();

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

// AI Chat endpoint with Calendar Integration (Groq integration)
app.post('/ai/chat', authenticate, async (req, res) => {
  const { message } = req.body;
  console.log('Received message:', message);
  if (!message) return res.status(400).json({ error: 'Message is required' });
  
  try {
    // Enhanced system prompt for calendar scheduling
    const systemPrompt = `You are GenEWA's AI assistant, specializing in helping Indian college students with academics and productivity.

SPECIAL CAPABILITY: Calendar Event Creation
When users request to schedule meetings, events, or set reminders, extract the following information and respond with a JSON object in this exact format:

{
  "type": "calendar_event",
  "event": {
    "title": "extracted event title",
    "description": "extracted description or purpose",
    "start": "YYYY-MM-DDTHH:MM:SS",
    "end": "YYYY-MM-DDTHH:MM:SS",
    "location": "extracted location (if mentioned)",
    "attendees": ["email1@example.com", "email2@example.com"]
  },
  "message": "I'll help you schedule that! Creating the event now..."
}

For date/time parsing:
- Use current date as reference: ${new Date().toISOString()}
- Default duration: 1 hour if not specified
- Indian timezone: Use IST (Asia/Kolkata)
- Handle natural language like "tomorrow at 2pm", "next Friday", "in 2 hours"

For non-scheduling requests, respond normally as an academic assistant.

Examples of scheduling requests:
- "Schedule a meeting with my study group tomorrow at 3pm"
- "Remind me to submit my assignment on Friday"
- "Set up a lecture review session next week"`;

    const groqRes = await fetch(process.env.GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
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
    
    // Check if response contains calendar event JSON
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*"type"\s*:\s*"calendar_event"[\s\S]*\}/);
      if (jsonMatch) {
        const eventData = JSON.parse(jsonMatch[0]);
        
        // Create the calendar event if Google Calendar is authenticated
        let calendarResult = null;
        if (await calendarService.isAuthenticated()) {
          try {
            calendarResult = await calendarService.createEvent(eventData.event);
          } catch (calError) {
            console.error('Calendar creation error:', calError);
            // Continue without calendar creation
          }
        }
        
        // Parse dates for better formatting
        const startDate = new Date(eventData.event.start);
        const endDate = new Date(eventData.event.end);
        
        const responseMessage = calendarResult ? 
          `✅ **Event scheduled successfully!**\n\n📅 **${eventData.event.title}**\n📍 ${eventData.event.location || 'No location specified'}\n🕐 ${startDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} - ${endDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n${eventData.event.description ? '📝 ' + eventData.event.description : ''}\n\nThe event has been added to your Google Calendar. You'll receive notifications as configured.` :
          `📅 **Event details extracted:**\n\n**${eventData.event.title}**\n🕐 ${startDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} - ${endDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}\n📍 ${eventData.event.location || 'No location specified'}\n\n${eventData.event.description ? '📝 ' + eventData.event.description + '\n\n' : ''}⚠️ To automatically add this to your Google Calendar, please connect your Google account in the Calendar section.`;
        
        res.json({ 
          response: responseMessage,
          calendarEvent: eventData.event,
          calendarCreated: !!calendarResult
        });
        return;
      }
    } catch (parseError) {
      console.log('No calendar event detected, continuing with normal response');
    }
    
    // Regular AI response
    res.json({ response: aiResponse });
  } catch (err) {
    console.error('Groq API error:', err);
    res.status(500).json({ error: 'Failed to connect to Groq API' });
  }
});

// Weather endpoint - using OpenWeatherMap API
app.get('/weather', authenticate, async (req, res) => {
  const { city = 'Delhi' } = req.query;
  try {
    // For demo purposes, return mock data. Replace with actual API call
    const mockWeatherData = {
      location: `${city}, India`,
      temperature: Math.floor(Math.random() * 15) + 20, // 20-35°C
      condition: ['Sunny', 'Cloudy', 'Partly Cloudy', 'Rainy'][Math.floor(Math.random() * 4)],
      humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
      windSpeed: Math.floor(Math.random() * 15) + 5, // 5-20 km/h
      visibility: Math.floor(Math.random() * 5) + 8, // 8-12 km
      feelsLike: Math.floor(Math.random() * 15) + 22, // 22-37°C
      forecast: Array.from({ length: 5 }, (_, i) => ({
        day: ['Today', 'Tomorrow', 'Wednesday', 'Thursday', 'Friday'][i],
        high: Math.floor(Math.random() * 10) + 25,
        low: Math.floor(Math.random() * 8) + 18,
        condition: ['Sunny', 'Cloudy', 'Partly Cloudy'][Math.floor(Math.random() * 3)]
      }))
    };
    res.json(mockWeatherData);
  } catch (err) {
    console.error('Weather API error:', err);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

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
      const tokens = await calendarService.getAccessToken(code);
      
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

// Google Calendar Authentication endpoints
app.get('/calendar/auth-url', authenticate, async (req, res) => {
  try {
    const authUrl = calendarService.getAuthUrl();
    res.json({ authUrl });
  } catch (err) {
    console.error('Auth URL error:', err);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

app.post('/calendar/auth-callback', authenticate, async (req, res) => {
  const { code } = req.body;
  try {
    const tokens = await calendarService.getAccessToken(code);
    res.json({ success: true, message: 'Calendar connected successfully!' });
  } catch (err) {
    console.error('Auth callback error:', err);
    res.status(500).json({ error: 'Failed to authenticate with Google Calendar' });
  }
});

app.get('/calendar/auth-status', authenticate, async (req, res) => {
  try {
    const isAuthenticated = await calendarService.isAuthenticated();
    res.json({ authenticated: isAuthenticated });
  } catch (err) {
    console.error('Auth status error:', err);
    res.status(500).json({ error: 'Failed to check authentication status' });
  }
});

app.get('/calendar/google-events', authenticate, async (req, res) => {
  try {
    if (!(await calendarService.isAuthenticated())) {
      return res.status(401).json({ error: 'Google Calendar not connected' });
    }
    
    const { timeMin, timeMax } = req.query;
    const events = await calendarService.listEvents('primary', timeMin, timeMax);
    res.json(events);
  } catch (err) {
    console.error('Google events error:', err);
    res.status(500).json({ error: 'Failed to fetch Google Calendar events' });
  }
});

app.post('/calendar/google-events', authenticate, async (req, res) => {
  try {
    if (!(await calendarService.isAuthenticated())) {
      return res.status(401).json({ error: 'Google Calendar not connected' });
    }
    
    const event = await calendarService.createEvent(req.body);
    res.status(201).json(event);
  } catch (err) {
    console.error('Create Google event error:', err);
    res.status(500).json({ error: 'Failed to create Google Calendar event' });
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`);
});

