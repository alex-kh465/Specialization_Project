import mcpCalendarClient from './mcp-calendar-client.js';

// Note: mcpCalendarClient is already initialized and connected in index.js

// Helper function to handle calendar API responses
function handleCalendarResponse(result, res, successMessage = null) {
  if (result.success !== false && result.message) {
    return res.json({
      success: true,
      data: result,
      message: successMessage || result.message
    });
  } else if (result.success === false) {
    return res.status(400).json({
      success: false,
      error: result.error || 'Calendar operation failed',
      message: result.message || 'An error occurred'
    });
  } else {
    return res.json({
      success: true,
      data: result,
      message: successMessage || 'Operation completed successfully'
    });
  }
}

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
  
  // === CALENDAR OPERATIONS ===

  // List all calendars
  app.get('/calendar/calendars', authenticate, async (req, res) => {
    try {
      const result = await mcpCalendarClient.listCalendars();
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

      // Apply proper ISO 8601 formatting
      const formattedTimeMin = timeMin ? toIso8601(timeMin) : timeMin;
      const formattedTimeMax = timeMax ? toIso8601(timeMax) : timeMax;

      const result = await mcpCalendarClient.listEvents(calendarId, formattedTimeMin, formattedTimeMax, timeZone);
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
      
      // Apply proper ISO 8601 formatting to ensure timezone info
      const formattedStartOfDay = toIso8601(startOfDay.toISOString());
      const formattedEndOfDay = toIso8601(endOfDay.toISOString());
      
      const result = await mcpCalendarClient.listEvents(
        calendarId, 
        formattedStartOfDay, 
        formattedEndOfDay, 
        timeZone
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
      
      // Apply proper ISO 8601 formatting to ensure timezone info
      const formattedWeekStart = toIso8601(weekStart.toISOString());
      const formattedWeekEnd = toIso8601(weekEnd.toISOString());
      
      const result = await mcpCalendarClient.listEvents(
        calendarId, 
        formattedWeekStart, 
        formattedWeekEnd, 
        timeZone
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

      // Apply proper ISO 8601 formatting
      const formattedTimeMin = timeMin ? toIso8601(timeMin) : timeMin;
      const formattedTimeMax = timeMax ? toIso8601(timeMax) : timeMax;
      
      const result = await mcpCalendarClient.searchEvents(calendarId, query, formattedTimeMin, formattedTimeMax, timeZone);
      handleCalendarResponse(result, res, `Search results for "${query}"`);
    } catch (error) {
      console.error('Error searching events:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to search events' 
      });
    }
  });

  // Note: getEvent method is not available in the original MCP client

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

      const result = await mcpCalendarClient.createEvent(eventData);
      handleCalendarResponse(result, res, 'Event created successfully');
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
      
      const result = await mcpCalendarClient.updateEvent(eventData);
      handleCalendarResponse(result, res, 'Event updated successfully');
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
      
      const result = await mcpCalendarClient.deleteEvent(calendarId, eventId, sendUpdates);
      handleCalendarResponse(result, res, 'Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to delete event' 
      });
    }
  });

  // === AVAILABILITY AND SCHEDULING ===

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

      const result = await mcpCalendarClient.getFreeBusy(calendars, timeMin, timeMax, timeZone);
      handleCalendarResponse(result, res, 'Free/busy information retrieved successfully');
    } catch (error) {
      console.error('Error getting free/busy:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to get free/busy information' 
      });
    }
  });

  // Find available slots
  app.post('/calendar/availability', authenticate, async (req, res) => {
    try {
      const { 
        calendarId = 'primary', 
        duration = 60, 
        timeMin, 
        timeMax, 
        timeZone = 'Asia/Kolkata' 
      } = req.body;

      if (!timeMin || !timeMax) {
        return res.status(400).json({ 
          success: false, 
          error: 'Time range is required', 
          message: 'Please provide timeMin and timeMax' 
        });
      }

      const result = await mcpCalendarClient.findAvailableSlots(calendarId, duration, timeMin, timeMax, timeZone);
      handleCalendarResponse(result, res, `Available slots found for ${duration} minutes`);
    } catch (error) {
      console.error('Error finding available slots:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to find available slots' 
      });
    }
  });

  // Find next available slot
  app.get('/calendar/availability/next', authenticate, async (req, res) => {
    try {
      const { 
        calendarId = 'primary', 
        duration = 60, 
        timeZone = 'Asia/Kolkata' 
      } = req.query;

      const result = await mcpCalendarClient.findNextAvailableSlot(calendarId, parseInt(duration), timeZone);
      handleCalendarResponse(result, res, 'Next available slot found');
    } catch (error) {
      console.error('Error finding next available slot:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to find next available slot' 
      });
    }
  });

  // === SMART OPERATIONS ===

  // Search and update event
  app.put('/calendar/events/search/:searchQuery', authenticate, async (req, res) => {
    try {
      const { searchQuery } = req.params;
      const updates = req.body;
      const { calendarId = 'primary', timeZone = 'Asia/Kolkata' } = req.query;

      const result = await mcpCalendarClient.searchAndUpdateEvent(calendarId, searchQuery, updates, timeZone);
      handleCalendarResponse(result, res, 'Event found and updated successfully');
    } catch (error) {
      console.error('Error searching and updating event:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to search and update event' 
      });
    }
  });

  // Search and delete event
  app.delete('/calendar/events/search/:searchQuery', authenticate, async (req, res) => {
    try {
      const { searchQuery } = req.params;
      const { calendarId = 'primary', timeZone = 'Asia/Kolkata' } = req.query;

      const result = await mcpCalendarClient.searchAndDeleteEvent(calendarId, searchQuery, timeZone);
      handleCalendarResponse(result, res, 'Event found and deleted successfully');
    } catch (error) {
      console.error('Error searching and deleting event:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to search and delete event' 
      });
    }
  });

  // === UTILITY ENDPOINTS ===

  // Get current time
  app.get('/calendar/time', authenticate, async (req, res) => {
    try {
      const { timeZone = 'Asia/Kolkata' } = req.query;
      const result = await mcpCalendarClient.getCurrentTime(timeZone);
      handleCalendarResponse(result, res, 'Current time retrieved successfully');
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
      const result = await mcpCalendarClient.listColors();
      handleCalendarResponse(result, res, 'Colors retrieved successfully');
    } catch (error) {
      console.error('Error listing colors:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to list colors' 
      });
    }
  });

  // === CALENDAR MANAGEMENT ===

  // Create a new calendar
  app.post('/calendar/calendars', authenticate, async (req, res) => {
    try {
      const calendarData = req.body;
      
      if (!calendarData.summary && !calendarData.name) {
        return res.status(400).json({ 
          success: false, 
          error: 'Calendar name is required', 
          message: 'Please provide a name for the calendar' 
        });
      }

      // Ensure summary is set from name if not provided
      if (!calendarData.summary && calendarData.name) {
        calendarData.summary = calendarData.name;
      }

      const result = await mcpCalendarClient.createCalendar(calendarData);
      handleCalendarResponse(result, res, 'Calendar created successfully');
    } catch (error) {
      console.error('Error creating calendar:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to create calendar' 
      });
    }
  });

  // Update a calendar
  app.put('/calendar/calendars/:calendarId', authenticate, async (req, res) => {
    try {
      const { calendarId } = req.params;
      const calendarData = req.body;
      
      const result = await mcpCalendarClient.updateCalendar(calendarId, calendarData);
      handleCalendarResponse(result, res, 'Calendar updated successfully');
    } catch (error) {
      console.error('Error updating calendar:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to update calendar' 
      });
    }
  });

  // Delete a calendar
  app.delete('/calendar/calendars/:calendarId', authenticate, async (req, res) => {
    try {
      const { calendarId } = req.params;
      
      if (calendarId === 'primary') {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot delete primary calendar', 
          message: 'The primary calendar cannot be deleted' 
        });
      }

      const result = await mcpCalendarClient.deleteCalendar(calendarId);
      handleCalendarResponse(result, res, 'Calendar deleted successfully');
    } catch (error) {
      console.error('Error deleting calendar:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to delete calendar' 
      });
    }
  });

  // === BATCH OPERATIONS ===

  // Batch create events
  app.post('/calendar/events/batch', authenticate, async (req, res) => {
    try {
      const { events, calendarId = 'primary' } = req.body;
      
      if (!events || !Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Events array is required', 
          message: 'Please provide an array of events to create' 
        });
      }

      const result = await mcpCalendarClient.batchCreateEvents(events, calendarId);
      handleCalendarResponse(result, res, `Batch operation completed: ${result.successCount}/${result.totalCount} events created`);
    } catch (error) {
      console.error('Error batch creating events:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to batch create events' 
      });
    }
  });

  // Batch delete events
  app.delete('/calendar/events/batch', authenticate, async (req, res) => {
    try {
      const { eventIds, calendarId = 'primary' } = req.body;
      
      if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Event IDs array is required', 
          message: 'Please provide an array of event IDs to delete' 
        });
      }

      const result = await mcpCalendarClient.batchDeleteEvents(eventIds, calendarId);
      handleCalendarResponse(result, res, `Batch operation completed: ${result.successCount}/${result.totalCount} events deleted`);
    } catch (error) {
      console.error('Error batch deleting events:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        message: 'Failed to batch delete events' 
      });
    }
  });

  // === STATUS AND HEALTH CHECK ===

  // Get calendar service status
  app.get('/calendar/status', authenticate, async (req, res) => {
    try {
      const status = mcpCalendarClient.getStatus();
      res.json({
        success: true,
        data: status,
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
      const status = mcpCalendarClient.getStatus();
      const isHealthy = status.connected && status.serviceStatus.authenticated;
      
      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        healthy: isHealthy,
        status: status,
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
