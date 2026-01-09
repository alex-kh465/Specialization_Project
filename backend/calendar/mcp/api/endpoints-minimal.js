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

  // Helper function to normalize MCP data
  const normalizeCalendars = (mcpResult) => {
    if (!mcpResult) return [];
    
    // If already structured
    if (mcpResult.calendars && Array.isArray(mcpResult.calendars)) {
      return mcpResult.calendars;
    }
    
    // Parse from message format
    if (mcpResult.message && typeof mcpResult.message === 'string') {
      const calendars = [];
      const blocks = mcpResult.message.split('\n\n').filter(block => block.trim());
      
      for (const block of blocks) {
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
              primary: isPrimary,
              selected: isPrimary
            });
          }
        }
      }
      
      return calendars;
    }
    
    return [];
  };
  
  const normalizeEvents = (mcpResult) => {
    if (!mcpResult) return [];
    
    // If already structured
    if (mcpResult.events && Array.isArray(mcpResult.events)) {
      return mcpResult.events.map(normalizeEventData);
    }
    
    // Parse from message format
    if (mcpResult.message && typeof mcpResult.message === 'string') {
      const events = [];
      const message = mcpResult.message;
      
      if (message.includes('Found ') && message.includes('event(s):')) {
        const eventBlocks = message.split(/\n\n\d+\. /).slice(1);
        
        for (const block of eventBlocks) {
          const lines = block.split('\n');
          const eventLine = lines[0];
          
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
                  return new Date().toISOString();
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
              
              events.push(normalizeEventData(event));
            }
          }
        }
      }
      
      return events;
    }
    
    return [];
  };
  
  const normalizeEventData = (event) => {
    if (!event) return null;
    
    const normalized = {
      id: event.id || event.eventId || '',
      summary: event.summary || event.title || 'Untitled Event',
      description: event.description || '',
      start: {
        dateTime: '',
        timeZone: 'Asia/Kolkata'
      },
      end: {
        dateTime: '',
        timeZone: 'Asia/Kolkata'
      },
      location: event.location || '',
      attendees: event.attendees || [],
      colorId: event.colorId,
      status: event.status,
      htmlLink: event.htmlLink
    };
    
    // Normalize start time
    if (event.start) {
      if (typeof event.start === 'string') {
        normalized.start.dateTime = event.start;
      } else if (event.start.dateTime) {
        normalized.start.dateTime = event.start.dateTime;
        normalized.start.timeZone = event.start.timeZone || 'Asia/Kolkata';
      } else if (event.start.date) {
        normalized.start.dateTime = new Date(event.start.date + 'T00:00:00').toISOString();
      }
    }
    
    // Normalize end time
    if (event.end) {
      if (typeof event.end === 'string') {
        normalized.end.dateTime = event.end;
      } else if (event.end.dateTime) {
        normalized.end.dateTime = event.end.dateTime;
        normalized.end.timeZone = event.end.timeZone || 'Asia/Kolkata';
      } else if (event.end.date) {
        normalized.end.dateTime = new Date(event.end.date + 'T23:59:59').toISOString();
      }
    }
    
    // Ensure valid dates
    if (!normalized.start.dateTime || isNaN(new Date(normalized.start.dateTime).getTime())) {
      normalized.start.dateTime = new Date().toISOString();
    }
    if (!normalized.end.dateTime || isNaN(new Date(normalized.end.dateTime).getTime())) {
      normalized.end.dateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }
    
    return normalized;
  };

  // List all calendars
  app.get('/calendar/calendars', authenticate, async (req, res) => {
    try {
      const result = await calendarMCP.listCalendars();
      const normalizedCalendars = normalizeCalendars(result);
      
      res.json({ 
        success: true, 
        data: { calendars: normalizedCalendars }, 
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
      
      const normalizedEvents = normalizeEvents(result);
      
      res.json({ 
        success: true, 
        data: { events: normalizedEvents }, 
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
        q: queryParam,
        query: alternativeQuery,
        calendarId = 'primary', 
        timeMin, 
        timeMax, 
        timeZone = 'Asia/Kolkata' 
      } = req.query;

      // Handle both 'q' and 'query' parameters for flexibility
      const query = queryParam || alternativeQuery;

      if (!query) {
        return res.status(400).json({ 
          success: false, 
          error: 'Search query is required', 
          message: 'Please provide a search query using "q" or "query" parameter' 
        });
      }

      const result = await calendarMCP.searchEvents(calendarId, query, {
        timeMin,
        timeMax,
        timeZone
      });
      
      const normalizedEvents = normalizeEvents(result);
      
      res.json({ 
        success: true, 
        data: { events: normalizedEvents }, 
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
