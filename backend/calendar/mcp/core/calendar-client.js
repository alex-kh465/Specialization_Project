import { googleCalendarAPI } from './google-calendar.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CalendarClient {
  constructor() {
    this.api = googleCalendarAPI;
    this.isInitialized = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
  }

  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      await this.api.initialize();
      this.isInitialized = true;
      console.log('Calendar client initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize calendar client:', error);
      this.isInitialized = false;
      return false;
    }
  }

  async ensureConnection() {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Calendar client initialization failed. Please check your credentials and authentication.');
      }
    }

    // Check if we need to authenticate
    if (!this.api.isAuthenticated) {
      // Try to use existing tokens from the MCP server
      try {
        const existingTokenPath = path.join(__dirname, '..', 'config', 'tokens.json');
        const backupTokenPath = path.join(__dirname, '..', '..', '.google-tokens.json');
        
        let tokens = null;
        
        // Try to find existing tokens
        try {
          tokens = JSON.parse(await fs.readFile(existingTokenPath, 'utf8'));
        } catch {
          try {
            tokens = JSON.parse(await fs.readFile(backupTokenPath, 'utf8'));
          } catch {
            // No existing tokens found
          }
        }

        if (tokens) {
          await this.api.setTokens(tokens);
          console.log('Loaded existing authentication tokens');
        } else {
          throw new Error('No authentication tokens found. Please run authentication first.');
        }
      } catch (error) {
        throw new Error(`Authentication required: ${error.message}`);
      }
    }

    return true;
  }

  async withRetry(operation, operationName) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.ensureConnection();
        return await operation();
      } catch (error) {
        lastError = error;
        console.error(`${operationName} attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          console.log(`Retrying ${operationName} in ${attempt} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    }
    
    throw new Error(`${operationName} failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  // === CALENDAR OPERATIONS ===

  async listCalendars() {
    return this.withRetry(async () => {
      const result = await this.api.listCalendars();
      if (!result.success) {
        throw new Error(result.error || 'Failed to list calendars');
      }
      
      // Format calendars for better display
      const formattedCalendars = result.calendars.map(cal => this.api.formatCalendarDetails(cal));
      
      return {
        calendars: formattedCalendars,
        message: result.message,
        count: formattedCalendars.length
      };
    }, 'List calendars');
  }

  async listEvents(calendarId = 'primary', options = {}) {
    return this.withRetry(async () => {
      const result = await this.api.listEvents(calendarId, options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to list events');
      }
      
      // Format events for better display
      const formattedEvents = result.events.map(event => this.api.formatEventDetails(event));
      
      return {
        events: formattedEvents,
        message: result.message,
        count: formattedEvents.length
      };
    }, 'List events');
  }

  async searchEvents(calendarId = 'primary', query, options = {}) {
    return this.withRetry(async () => {
      if (!query || query.trim() === '') {
        throw new Error('Search query is required');
      }
      
      const result = await this.api.searchEvents(calendarId, query, options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to search events');
      }
      
      // Format events for better display
      const formattedEvents = result.events.map(event => this.api.formatEventDetails(event));
      
      return {
        events: formattedEvents,
        message: result.message,
        count: formattedEvents.length,
        query: query
      };
    }, 'Search events');
  }

  async createEvent(eventData) {
    return this.withRetry(async () => {
      // Validate input data
      this.validateEventData(eventData);
      
      const result = await this.api.createEvent(eventData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create event');
      }
      
      return {
        event: this.api.formatEventDetails(result.event),
        message: result.message,
        success: true
      };
    }, 'Create event');
  }

  async updateEvent(eventData) {
    return this.withRetry(async () => {
      if (!eventData.eventId) {
        throw new Error('Event ID is required for update');
      }
      
      const result = await this.api.updateEvent(eventData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update event');
      }
      
      return {
        event: this.api.formatEventDetails(result.event),
        message: result.message,
        success: true
      };
    }, 'Update event');
  }

  async deleteEvent(calendarId = 'primary', eventId, sendUpdates = 'all') {
    return this.withRetry(async () => {
      if (!eventId) {
        throw new Error('Event ID is required for deletion');
      }
      
      const result = await this.api.deleteEvent(calendarId, eventId, sendUpdates);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete event');
      }
      
      return {
        message: result.message,
        success: true
      };
    }, 'Delete event');
  }

  async getEvent(calendarId = 'primary', eventId) {
    return this.withRetry(async () => {
      if (!eventId) {
        throw new Error('Event ID is required');
      }
      
      const result = await this.api.getEvent(calendarId, eventId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get event');
      }
      
      return {
        event: this.api.formatEventDetails(result.event),
        message: result.message,
        success: true
      };
    }, 'Get event');
  }

  async getFreeBusy(calendars, timeMin, timeMax, timeZone = 'Asia/Kolkata') {
    return this.withRetry(async () => {
      if (!calendars || calendars.length === 0) {
        throw new Error('At least one calendar ID is required');
      }
      
      if (!timeMin || !timeMax) {
        throw new Error('Time range (timeMin and timeMax) is required');
      }
      
      const result = await this.api.getFreeBusy(calendars, timeMin, timeMax, timeZone);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get free/busy information');
      }
      
      return {
        freebusy: result.freebusy,
        calendars: result.freebusy.calendars,
        message: result.message,
        success: true
      };
    }, 'Get free/busy');
  }

  async listColors() {
    return this.withRetry(async () => {
      const result = await this.api.listColors();
      if (!result.success) {
        throw new Error(result.error || 'Failed to list colors');
      }
      
      return {
        colors: result.colors,
        message: result.message,
        success: true
      };
    }, 'List colors');
  }

  async getCurrentTime(timeZone = 'Asia/Kolkata') {
    return this.withRetry(async () => {
      const result = await this.api.getCurrentTime(timeZone);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get current time');
      }
      
      return {
        currentTime: result.currentTime,
        message: result.message,
        success: true
      };
    }, 'Get current time');
  }

  async findAvailableSlots(calendarId = 'primary', duration = 60, timeMin, timeMax, timeZone = 'Asia/Kolkata') {
    return this.withRetry(async () => {
      if (!timeMin || !timeMax) {
        throw new Error('Time range (timeMin and timeMax) is required');
      }
      
      if (duration <= 0) {
        throw new Error('Duration must be greater than 0 minutes');
      }
      
      const result = await this.api.findAvailableSlots(calendarId, duration, timeMin, timeMax, timeZone);
      if (!result.success) {
        throw new Error(result.error || 'Failed to find available slots');
      }
      
      return {
        availableSlots: result.availableSlots,
        busySlots: result.busySlots,
        message: result.message,
        success: true
      };
    }, 'Find available slots');
  }

  // === CALENDAR MANAGEMENT ===

  async createCalendar(calendarData) {
    return this.withRetry(async () => {
      if (!calendarData.summary) {
        throw new Error('Calendar name (summary) is required');
      }
      
      const result = await this.api.createCalendar(calendarData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create calendar');
      }
      
      return {
        calendar: this.api.formatCalendarDetails(result.calendar),
        message: result.message,
        success: true
      };
    }, 'Create calendar');
  }

  async updateCalendar(calendarId, calendarData) {
    return this.withRetry(async () => {
      if (!calendarId) {
        throw new Error('Calendar ID is required');
      }
      
      const result = await this.api.updateCalendar(calendarId, calendarData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update calendar');
      }
      
      return {
        calendar: this.api.formatCalendarDetails(result.calendar),
        message: result.message,
        success: true
      };
    }, 'Update calendar');
  }

  async deleteCalendar(calendarId) {
    return this.withRetry(async () => {
      if (!calendarId) {
        throw new Error('Calendar ID is required');
      }
      
      if (calendarId === 'primary') {
        throw new Error('Cannot delete the primary calendar');
      }
      
      const result = await this.api.deleteCalendar(calendarId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete calendar');
      }
      
      return {
        message: result.message,
        success: true
      };
    }, 'Delete calendar');
  }

  // === BATCH OPERATIONS ===

  async batchCreateEvents(events, calendarId = 'primary') {
    return this.withRetry(async () => {
      if (!events || events.length === 0) {
        throw new Error('At least one event is required');
      }
      
      // Validate all events before creating
      for (const event of events) {
        this.validateEventData(event);
      }
      
      const result = await this.api.batchCreateEvents(events, calendarId);
      
      return {
        results: result.results,
        errors: result.errors,
        message: result.message,
        success: result.success,
        successCount: result.results.filter(r => r.success).length,
        totalCount: events.length
      };
    }, 'Batch create events');
  }

  async batchDeleteEvents(eventIds, calendarId = 'primary') {
    return this.withRetry(async () => {
      if (!eventIds || eventIds.length === 0) {
        throw new Error('At least one event ID is required');
      }
      
      const result = await this.api.batchDeleteEvents(eventIds, calendarId);
      
      return {
        results: result.results,
        errors: result.errors,
        message: result.message,
        success: result.success,
        successCount: result.results.filter(r => r.success).length,
        totalCount: eventIds.length
      };
    }, 'Batch delete events');
  }

  // === SMART FEATURES ===

  async findEventsByDateRange(calendarId = 'primary', startDate, endDate, timeZone = 'Asia/Kolkata') {
    const timeMin = new Date(startDate).toISOString();
    const timeMax = new Date(endDate).toISOString();
    
    return this.listEvents(calendarId, {
      timeMin,
      timeMax,
      timeZone,
      maxResults: 100
    });
  }

  async getTodaysEvents(calendarId = 'primary', timeZone = 'Asia/Kolkata') {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    return this.findEventsByDateRange(calendarId, startOfDay, endOfDay, timeZone);
  }

  async getWeekEvents(calendarId = 'primary', timeZone = 'Asia/Kolkata') {
    const today = new Date();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - today.getDay()) + 1);
    
    return this.findEventsByDateRange(calendarId, startOfWeek, endOfWeek, timeZone);
  }

  async findNextAvailableSlot(calendarId = 'primary', duration = 60, timeZone = 'Asia/Kolkata') {
    const now = new Date();
    const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    const result = await this.findAvailableSlots(
      calendarId,
      duration,
      now.toISOString(),
      endTime.toISOString(),
      timeZone
    );
    
    if (result.success && result.availableSlots.length > 0) {
      return {
        ...result,
        nextSlot: result.availableSlots[0],
        message: `Next available ${duration}-minute slot: ${new Date(result.availableSlots[0].start).toLocaleString()}`
      };
    }
    
    return {
      ...result,
      nextSlot: null,
      message: `No available ${duration}-minute slots found in the next 7 days`
    };
  }

  async searchAndUpdateEvent(calendarId = 'primary', searchQuery, updates, timeZone = 'Asia/Kolkata') {
    try {
      // Search for the event
      const searchResult = await this.searchEvents(calendarId, searchQuery, {
        timeZone,
        maxResults: 10
      });
      
      if (!searchResult.success || searchResult.events.length === 0) {
        throw new Error(`No events found matching "${searchQuery}"`);
      }
      
      // Update the first matching event
      const eventToUpdate = searchResult.events[0];
      const updateResult = await this.updateEvent({
        calendarId,
        eventId: eventToUpdate.id,
        ...updates
      });
      
      return {
        searchResult,
        updateResult,
        message: `Found and updated event: ${eventToUpdate.title}`,
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to search and update event: ${error.message}`
      };
    }
  }

  async searchAndDeleteEvent(calendarId = 'primary', searchQuery, timeZone = 'Asia/Kolkata') {
    try {
      // Search for the event
      const searchResult = await this.searchEvents(calendarId, searchQuery, {
        timeZone,
        maxResults: 10
      });
      
      if (!searchResult.success || searchResult.events.length === 0) {
        throw new Error(`No events found matching "${searchQuery}"`);
      }
      
      // Delete the first matching event
      const eventToDelete = searchResult.events[0];
      const deleteResult = await this.deleteEvent(calendarId, eventToDelete.id);
      
      return {
        searchResult,
        deleteResult,
        deletedEvent: eventToDelete,
        message: `Found and deleted event: ${eventToDelete.title}`,
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to search and delete event: ${error.message}`
      };
    }
  }

  // === VALIDATION HELPERS ===

  validateEventData(eventData) {
    if (!eventData) {
      throw new Error('Event data is required');
    }
    
    // Allow both title and summary fields
    const title = eventData.summary || eventData.title;
    if (!title) {
      throw new Error('Event title/summary is required');
    }
    
    // Normalize to summary field for Google Calendar API
    if (!eventData.summary && eventData.title) {
      eventData.summary = eventData.title;
    }
    
    if (!eventData.start) {
      throw new Error('Event start time is required');
    }
    
    if (!eventData.end) {
      throw new Error('Event end time is required');
    }
    
    // Validate date format
    if (!this.api.validateDateTime(eventData.start)) {
      throw new Error('Invalid start time format. Use ISO 8601 format (YYYY-MM-DDTHH:MM:SS)');
    }
    
    if (!this.api.validateDateTime(eventData.end)) {
      throw new Error('Invalid end time format. Use ISO 8601 format (YYYY-MM-DDTHH:MM:SS)');
    }
    
    // Validate time range
    try {
      this.api.validateTimeRange(eventData.start, eventData.end);
    } catch (error) {
      throw new Error(`Invalid time range: ${error.message}`);
    }
    
    // Validate attendee emails if provided
    if (eventData.attendees && Array.isArray(eventData.attendees)) {
      for (const attendee of eventData.attendees) {
        const email = typeof attendee === 'string' ? attendee : attendee.email;
        if (email && !this.api.validateEmail(email)) {
          throw new Error(`Invalid email address: ${email}`);
        }
      }
    }
    
    return true;
  }

  // === UTILITY METHODS ===

  formatEventForDisplay(event) {
    const start = new Date(event.start);
    const end = new Date(event.end);
    
    return {
      ...event,
      startFormatted: start.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      endFormatted: end.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      durationMinutes: Math.round((end - start) / 60000)
    };
  }

  formatCalendarForDisplay(calendar) {
    return {
      ...calendar,
      displayName: calendar.primary ? `${calendar.name} (Primary)` : calendar.name,
      isSelected: calendar.selected ? 'Yes' : 'No',
      isHidden: calendar.hidden ? 'Yes' : 'No'
    };
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      authenticated: this.api.isAuthenticated,
      connectionAttempts: this.connectionAttempts,
      maxRetries: this.maxRetries
    };
  }
}

// Export singleton instance
export const calendarClient = new CalendarClient();
