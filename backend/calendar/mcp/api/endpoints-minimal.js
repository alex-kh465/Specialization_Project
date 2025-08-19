import { calendarMCP } from '../index.js';

// Note: calendarMCP is already initialized in index.js

// Utility function to ensure proper ISO 8601 format with timezone
function toIso8601(dateValue) {
  if (!dateValue) return null;

  try {
    if (typeof dateValue === 'string') {
      // Ensure it matches full ISO with timezone (Z or ±hh:mm)
      const isoWithTZ = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;
      if (isoWithTZ.test(dateValue)) {
        return dateValue;
      }
    }

    // Always normalize to UTC ISO string
    return new Date(dateValue).toISOString();
  } catch (error) {
    console.warn('Invalid date value:', dateValue, 'Error:', error.message);
    return null;
  }
}

export function setupCalendarEndpoints(app, authenticate) {
  
  // === CORE CALENDAR OPERATIONS ===
  // Only using methods that exist in the original MCP client

  // List all calendars
  app.get('/calendar/calendars', authenticate, async (req, res) => {
    try {
      const result = await calendarMCP.listCalendars();
      res.json({ 
        success: true, 
        data: result, 
        message: 'Calendars retrieved successfully' 
      });
    } catch (error) {
      console.error('Error listing calendars:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to list calendars' 
      });
    }
  });

  // List events from a calendar
  app.get('/calendar/events', authenticate, async (req, res) => {
    try {
      const { 
        calendarId = 'primary', 
        timeMin, 
        timeMax, 
        timeZone = 'Asia/Kolkata' 
      } = req.query;

      const result = await calendarMCP.listEvents(calendarId, {
        timeMin,
        timeMax,
        timeZone
      });
      res.json({ 
        success: true, 
        data: result, 
        message: 'Events retrieved successfully' 
      });
    } catch (error) {
      console.error('Error listing events:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to list events' 
      });
    }
  });

  // Get today's events (using listEvents with today's date range)
  app.get('/calendar/events/today', authenticate, async (req, res) => {
    try {
      const { calendarId = 'primary', timeZone = 'Asia/Kolkata' } = req.query;
      
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const result = await calendarMCP.listEvents(
        calendarId, 
        {
          timeMin: startOfDay.toISOString(), 
          timeMax: endOfDay.toISOString(), 
          timeZone
        }
      );
      
      res.json({ 
        success: true, 
        data: result, 
        message: 'Today\'s events retrieved successfully' 
      });
    } catch (error) {
      console.error('Error getting today\'s events:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to get today\'s events' 
      });
    }
  });

  // Get week events (using listEvents with this week's date range)
  app.get('/calendar/events/week', authenticate, async (req, res) => {
    try {
      const { calendarId = 'primary', timeZone = 'Asia/Kolkata' } = req.query;
      
      // Get this week's date range
      const now = new Date();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const result = await calendarMCP.listEvents(
        calendarId, 
        {
          timeMin: weekStart.toISOString(), 
          timeMax: weekEnd.toISOString(), 
          timeZone
        }
      );
      
      res.json({ 
        success: true, 
        data: result, 
        message: 'Week events retrieved successfully' 
      });
    } catch (error) {
      console.error('Error getting week events:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to get week events' 
      });
    }
  });

  // Search events
  app.get('/calendar/events/search', authenticate, async (req, res) => {
    try {
      const { 
        q: query, 
        calendarId = 'primary', 
        timeMin, 
        timeMax, 
        timeZone = 'Asia/Kolkata' 
      } = req.query;

      if (!query) {
        return res.status(400).json({ 
          success: false, 
          error: 'Search query is required', 
          message: 'Please provide a search query' 
        });
      }

      const result = await calendarMCP.searchEvents(calendarId, query, {
        timeMin,
        timeMax,
        timeZone
      });
      res.json({ 
        success: true, 
        data: result, 
        message: `Search results for "${query}"` 
      });
    } catch (error) {
      console.error('Error searching events:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to search events' 
      });
    }
  });

  // Create an event
  app.post('/calendar/events', authenticate, async (req, res) => {
    try {
      const eventData = req.body;
      
      // Validate required fields
      if (!eventData.summary && !eventData.title) {
        return res.status(400).json({ 
          success: false, 
          error: 'Event title is required', 
          message: 'Please provide a title for the event' 
        });
      }

      if (!eventData.start || !eventData.end) {
        return res.status(400).json({ 
          success: false, 
          error: 'Start and end times are required', 
          message: 'Please provide start and end times for the event' 
        });
      }

      const result = await calendarMCP.createEvent(eventData);
      res.json({ 
        success: true, 
        data: result, 
        message: 'Event created successfully' 
      });
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to create event' 
      });
    }
  });

  // Update an event
  app.put('/calendar/events/:eventId', authenticate, async (req, res) => {
    try {
      const { eventId } = req.params;
      const eventData = { ...req.body, eventId };
      
      const result = await calendarMCP.updateEvent(eventData);
      res.json({ 
        success: true, 
        data: result, 
        message: 'Event updated successfully' 
      });
    } catch (error) {
      console.error('Error updating event:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to update event' 
      });
    }
  });

  // Delete an event
  app.delete('/calendar/events/:eventId', authenticate, async (req, res) => {
    try {
      const { eventId } = req.params;
      const { calendarId = 'primary', sendUpdates = 'all' } = req.query;
      
      const result = await calendarMCP.deleteEvent(calendarId, eventId, sendUpdates);
      res.json({ 
        success: true, 
        data: result, 
        message: 'Event deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to delete event' 
      });
    }
  });

  // Get free/busy information
  app.post('/calendar/freebusy', authenticate, async (req, res) => {
    try {
      const { calendars, timeMin, timeMax, timeZone = 'Asia/Kolkata' } = req.body;

      if (!calendars || !Array.isArray(calendars) || calendars.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Calendar IDs are required', 
          message: 'Please provide at least one calendar ID' 
        });
      }

      if (!timeMin || !timeMax) {
        return res.status(400).json({ 
          success: false, 
          error: 'Time range is required', 
          message: 'Please provide timeMin and timeMax' 
        });
      }

      const result = await calendarMCP.getFreeBusy(calendars, timeMin, timeMax, timeZone);
      res.json({ 
        success: true, 
        data: result, 
        message: 'Free/busy information retrieved successfully' 
      });
    } catch (error) {
      console.error('Error getting free/busy:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to get free/busy information' 
      });
    }
  });

  // Get current time
  app.get('/calendar/time', authenticate, async (req, res) => {
    try {
      const { timeZone = 'Asia/Kolkata' } = req.query;
      const result = await calendarMCP.getCurrentTime(timeZone);
      res.json({ 
        success: true, 
        data: result, 
        message: 'Current time retrieved successfully' 
      });
    } catch (error) {
      console.error('Error getting current time:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to get current time' 
      });
    }
  });

  // List colors
  app.get('/calendar/colors', authenticate, async (req, res) => {
    try {
      const result = await calendarMCP.listColors();
      res.json({ 
        success: true, 
        data: result, 
        message: 'Colors retrieved successfully' 
      });
    } catch (error) {
      console.error('Error listing colors:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to list colors' 
      });
    }
  });

  // Basic status check
  app.get('/calendar/status', authenticate, async (req, res) => {
    try {
      const status = calendarMCP.getStatus();
      res.json({
        success: true,
        data: {
          ...status,
          message: 'Calendar service is available'
        },
        message: 'Calendar service status retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting calendar status:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to get calendar status' 
      });
    }
  });

  // Health check endpoint
  app.get('/calendar/health', async (req, res) => {
    try {
      const status = calendarMCP.getStatus();
      const isHealthy = status.ready && status.initialized && status.authenticated;
      
      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        healthy: isHealthy,
        data: status,
        message: isHealthy ? 'Calendar service is healthy' : 'Calendar service is not available'
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        healthy: false,
        error: error.message,
        message: 'Calendar service health check failed'
      });
    }
  });

  console.log('Calendar API endpoints initialized successfully');
}
