import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class GoogleCalendarAPI {
  constructor() {
    this.oauth2Client = null;
    this.calendar = null;
    this.isAuthenticated = false;
    
    // Use the MCP credentials and tokens
    this.credentialsPath = path.join(__dirname, '..', 'config', 'gcp-oauth.keys.json');
    this.tokenPath = path.join(__dirname, '..', 'config', 'tokens.json');
  }

  async initialize() {
    try {
      // Load OAuth2 credentials
      const credentials = JSON.parse(await fs.readFile(this.credentialsPath, 'utf8'));
      const { client_id, client_secret, redirect_uris } = credentials.web || credentials.installed;
      
      this.oauth2Client = new OAuth2Client(client_id, client_secret, redirect_uris[0]);
      
      // Try to load existing tokens
      try {
        const tokens = JSON.parse(await fs.readFile(this.tokenPath, 'utf8'));
        this.oauth2Client.setCredentials(tokens);
        
        // Verify the tokens are still valid
        await this.oauth2Client.getAccessToken();
        this.isAuthenticated = true;
        
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
        console.log('Google Calendar API initialized with existing tokens');
      } catch (tokenError) {
        console.log('No valid tokens found, authentication required');
        this.isAuthenticated = false;
      }
    } catch (error) {
      console.error('Failed to initialize Google Calendar API:', error);
      throw error;
    }
  }

  async authenticate() {
    if (this.isAuthenticated) {
      return true;
    }

    try {
      // Generate authentication URL
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events'
        ],
        prompt: 'consent'
      });

      console.log('Visit this URL to authenticate:', authUrl);
      
      // In a real implementation, you would handle the OAuth callback
      // For now, return false to indicate manual auth is needed
      return false;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  async setTokens(tokens) {
    try {
      this.oauth2Client.setCredentials(tokens);
      await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2));
      this.isAuthenticated = true;
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      console.log('Tokens set successfully');
      return true;
    } catch (error) {
      console.error('Failed to set tokens:', error);
      return false;
    }
  }

  ensureAuthenticated() {
    if (!this.isAuthenticated || !this.calendar) {
      throw new Error('Google Calendar API not authenticated. Please run authentication first.');
    }
  }

  // === CALENDAR OPERATIONS ===

  async listCalendars() {
    this.ensureAuthenticated();
    
    try {
      const response = await this.calendar.calendarList.list();
      return {
        success: true,
        calendars: response.data.items || [],
        message: `Found ${response.data.items?.length || 0} calendars`
      };
    } catch (error) {
      console.error('Error listing calendars:', error);
      return {
        success: false,
        error: error.message,
        calendars: []
      };
    }
  }

  async listEvents(calendarId = 'primary', options = {}) {
    this.ensureAuthenticated();
    
    try {
      // Sanitize inputs
      calendarId = this.sanitizeStringInput(calendarId, 'Calendar ID', true) || 'primary';
      
      const {
        timeMin,
        timeMax,
        maxResults = 50,
        timeZone = 'Asia/Kolkata'
      } = options;
      
      // Normalize time range with proper validation
      const normalizedTimeRange = this.normalizeTimeRange(timeMin, timeMax);
      
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: normalizedTimeRange.timeMin,
        timeMax: normalizedTimeRange.timeMax,
        maxResults: Math.min(Math.max(1, parseInt(maxResults) || 50), 2500), // Validate maxResults
        singleEvents: true,
        orderBy: 'startTime',
        timeZone: this.sanitizeStringInput(timeZone, 'Time Zone') || 'Asia/Kolkata'
      });

      return {
        success: true,
        events: response.data.items || [],
        message: `Found ${response.data.items?.length || 0} events`
      };
    } catch (error) {
      console.error('Error listing events:', error);
      return {
        success: false,
        error: error.message,
        events: []
      };
    }
  }

  async searchEvents(calendarId = 'primary', query, options = {}) {
    this.ensureAuthenticated();
    
    try {
      // Sanitize and validate inputs
      calendarId = this.sanitizeStringInput(calendarId, 'Calendar ID', true) || 'primary';
      query = this.sanitizeStringInput(query, 'Search Query', true);
      
      const {
        timeMin,
        timeMax,
        maxResults = 50,
        timeZone = 'Asia/Kolkata'
      } = options;
      
      // Normalize time range, default to broader range for search
      const defaultTimeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
      const defaultTimeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
      
      const normalizedTimeRange = this.normalizeTimeRange(
        timeMin || defaultTimeMin,
        timeMax || defaultTimeMax
      );

      const response = await this.calendar.events.list({
        calendarId,
        q: query,
        timeMin: normalizedTimeRange.timeMin,
        timeMax: normalizedTimeRange.timeMax,
        maxResults: Math.min(Math.max(1, parseInt(maxResults) || 50), 2500), // Validate maxResults
        singleEvents: true,
        orderBy: 'startTime',
        timeZone: this.sanitizeStringInput(timeZone, 'Time Zone') || 'Asia/Kolkata'
      });

      return {
        success: true,
        events: response.data.items || [],
        message: `Found ${response.data.items?.length || 0} events matching "${query}"`
      };
    } catch (error) {
      console.error('Error searching events:', error);
      return {
        success: false,
        error: error.message,
        events: []
      };
    }
  }

  async createEvent(eventData) {
    this.ensureAuthenticated();
    
    try {
      const {
        calendarId = 'primary',
        summary,
        title, // Alternative to summary
        description = '',
        start,
        end,
        timeZone = 'Asia/Kolkata',
        location = '',
        attendees = [],
        reminders = { useDefault: true },
        recurrence = null,
        colorId = null
      } = eventData;

      // Sanitize and validate inputs
      const sanitizedCalendarId = this.sanitizeStringInput(calendarId, 'Calendar ID', true) || 'primary';
      const sanitizedSummary = this.sanitizeStringInput(summary || title, 'Event Summary', true);
      const sanitizedDescription = this.sanitizeStringInput(description, 'Description');
      const sanitizedLocation = this.sanitizeStringInput(location, 'Location');
      const sanitizedTimeZone = this.sanitizeStringInput(timeZone, 'Time Zone') || 'Asia/Kolkata';

      // Validate and normalize datetime fields
      if (!start || !end) {
        throw new Error('Event start time and end time are required');
      }

      const normalizedStart = this.normalizeDateTime(start);
      const normalizedEnd = this.normalizeDateTime(end);
      
      // Validate time range
      this.validateTimeRange(normalizedStart, normalizedEnd);

      // Prepare event object with sanitized inputs
      const event = {
        summary: sanitizedSummary,
        description: sanitizedDescription,
        start: {
          dateTime: normalizedStart,
          timeZone: sanitizedTimeZone
        },
        end: {
          dateTime: normalizedEnd,
          timeZone: sanitizedTimeZone
        },
        reminders
      };

      // Add optional fields with validation
      if (sanitizedLocation) {
        event.location = sanitizedLocation;
      }
      
      if (attendees && Array.isArray(attendees) && attendees.length > 0) {
        event.attendees = attendees
          .filter(email => {
            const emailStr = typeof email === 'string' ? email : email?.email;
            return emailStr && this.validateEmail(emailStr.trim());
          })
          .map(email => {
            const emailStr = typeof email === 'string' ? email.trim() : email?.email?.trim();
            return { email: emailStr };
          });
      }
      
      if (colorId !== null && colorId !== undefined) {
        const sanitizedColorId = this.sanitizeStringInput(String(colorId), 'Color ID');
        if (sanitizedColorId) event.colorId = sanitizedColorId;
      }
      
      if (recurrence && Array.isArray(recurrence)) {
        event.recurrence = recurrence.map(r => this.sanitizeStringInput(r, 'Recurrence Rule')).filter(r => r);
      }

      const response = await this.calendar.events.insert({
        calendarId: sanitizedCalendarId,
        resource: event,
        sendUpdates: 'all'
      });

      return {
        success: true,
        event: response.data,
        message: `Event "${sanitizedSummary}" created successfully`
      };
    } catch (error) {
      console.error('Error creating event:', error);
      return {
        success: false,
        error: error.message,
        event: null
      };
    }
  }

  async updateEvent(eventData) {
    this.ensureAuthenticated();
    
    try {
      const {
        calendarId = 'primary',
        eventId,
        summary,
        description,
        start,
        end,
        timeZone = 'Asia/Kolkata',
        location,
        attendees,
        reminders,
        recurrence,
        colorId,
        sendUpdates = 'all'
      } = eventData;

      // Sanitize and validate inputs
      const sanitizedCalendarId = this.sanitizeStringInput(calendarId, 'Calendar ID', true) || 'primary';
      const sanitizedEventId = this.sanitizeStringInput(eventId, 'Event ID', true);
      const sanitizedTimeZone = this.sanitizeStringInput(timeZone, 'Time Zone') || 'Asia/Kolkata';
      const sanitizedSendUpdates = this.sanitizeStringInput(sendUpdates, 'Send Updates') || 'all';

      // Get the existing event first
      const existingResponse = await this.calendar.events.get({
        calendarId: sanitizedCalendarId,
        eventId: sanitizedEventId
      });

      const existingEvent = existingResponse.data;
      
      // Prepare updated event object
      const updatedEvent = { ...existingEvent };

      // Update only provided fields with validation
      if (summary !== undefined) {
        updatedEvent.summary = this.sanitizeStringInput(summary, 'Event Summary', true);
      }
      
      if (description !== undefined) {
        updatedEvent.description = this.sanitizeStringInput(description, 'Description');
      }
      
      if (location !== undefined) {
        updatedEvent.location = this.sanitizeStringInput(location, 'Location');
      }
      
      if (colorId !== undefined) {
        const sanitizedColorId = this.sanitizeStringInput(String(colorId), 'Color ID');
        if (sanitizedColorId) updatedEvent.colorId = sanitizedColorId;
      }
      
      if (recurrence !== undefined && Array.isArray(recurrence)) {
        updatedEvent.recurrence = recurrence.map(r => this.sanitizeStringInput(r, 'Recurrence Rule')).filter(r => r);
      }
      
      if (reminders !== undefined) updatedEvent.reminders = reminders;

      if (start !== undefined) {
        const normalizedStart = this.normalizeDateTime(start);
        updatedEvent.start = {
          dateTime: normalizedStart,
          timeZone: sanitizedTimeZone
        };
      }

      if (end !== undefined) {
        const normalizedEnd = this.normalizeDateTime(end);
        updatedEvent.end = {
          dateTime: normalizedEnd,
          timeZone: sanitizedTimeZone
        };
        
        // Validate time range if both start and end are being updated
        if (start !== undefined) {
          this.validateTimeRange(updatedEvent.start.dateTime, updatedEvent.end.dateTime);
        }
      }

      if (attendees !== undefined && Array.isArray(attendees)) {
        updatedEvent.attendees = attendees
          .filter(email => {
            const emailStr = typeof email === 'string' ? email : email?.email;
            return emailStr && this.validateEmail(emailStr.trim());
          })
          .map(email => {
            const emailStr = typeof email === 'string' ? email.trim() : email?.email?.trim();
            return { email: emailStr };
          });
      }

      const response = await this.calendar.events.update({
        calendarId: sanitizedCalendarId,
        eventId: sanitizedEventId,
        resource: updatedEvent,
        sendUpdates: sanitizedSendUpdates
      });

      return {
        success: true,
        event: response.data,
        message: `Event "${response.data.summary}" updated successfully`
      };
    } catch (error) {
      console.error('Error updating event:', error);
      return {
        success: false,
        error: error.message,
        event: null
      };
    }
  }

  async deleteEvent(calendarId = 'primary', eventId, sendUpdates = 'all') {
    this.ensureAuthenticated();
    
    try {
      if (!eventId) {
        throw new Error('Event ID is required for deletion');
      }

      // Get event details before deletion for confirmation message
      const eventResponse = await this.calendar.events.get({
        calendarId,
        eventId
      });

      const eventTitle = eventResponse.data.summary || 'Untitled Event';

      await this.calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates
      });

      return {
        success: true,
        message: `Event "${eventTitle}" deleted successfully`
      };
    } catch (error) {
      console.error('Error deleting event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getEvent(calendarId = 'primary', eventId) {
    this.ensureAuthenticated();
    
    try {
      const response = await this.calendar.events.get({
        calendarId,
        eventId
      });

      return {
        success: true,
        event: response.data,
        message: `Event retrieved successfully`
      };
    } catch (error) {
      console.error('Error getting event:', error);
      return {
        success: false,
        error: error.message,
        event: null
      };
    }
  }

  async getFreeBusy(calendars, timeMin, timeMax, timeZone = 'Asia/Kolkata') {
    this.ensureAuthenticated();
    
    try {
      // Validate inputs
      if (!calendars || !Array.isArray(calendars) || calendars.length === 0) {
        throw new Error('At least one calendar ID is required');
      }
      
      if (!timeMin || !timeMax) {
        throw new Error('Time range (timeMin and timeMax) is required');
      }
      
      // Sanitize and validate calendar IDs
      const sanitizedCalendars = calendars
        .map(calId => this.sanitizeStringInput(calId, 'Calendar ID', true))
        .filter(calId => calId);
      
      if (sanitizedCalendars.length === 0) {
        throw new Error('No valid calendar IDs provided');
      }
      
      // Normalize time range
      const normalizedTimeRange = this.normalizeTimeRange(timeMin, timeMax);
      const sanitizedTimeZone = this.sanitizeStringInput(timeZone, 'Time Zone') || 'Asia/Kolkata';
      
      const items = sanitizedCalendars.map(calId => ({ id: calId }));

      const response = await this.calendar.freebusy.query({
        resource: {
          timeMin: normalizedTimeRange.timeMin,
          timeMax: normalizedTimeRange.timeMax,
          timeZone: sanitizedTimeZone,
          items
        }
      });

      return {
        success: true,
        freebusy: response.data,
        message: `Free/busy information retrieved for ${sanitizedCalendars.length} calendar(s)`
      };
    } catch (error) {
      console.error('Error getting free/busy information:', error);
      return {
        success: false,
        error: error.message,
        freebusy: null
      };
    }
  }

  async listColors() {
    this.ensureAuthenticated();
    
    try {
      const response = await this.calendar.colors.get();
      
      return {
        success: true,
        colors: response.data,
        message: 'Color information retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting colors:', error);
      return {
        success: false,
        error: error.message,
        colors: null
      };
    }
  }

  async createCalendar(calendarData) {
    this.ensureAuthenticated();
    
    try {
      const {
        summary,
        description = '',
        timeZone = 'Asia/Kolkata',
        location = ''
      } = calendarData;

      if (!summary) {
        throw new Error('Calendar summary (name) is required');
      }

      const calendar = {
        summary,
        description,
        timeZone,
        location
      };

      const response = await this.calendar.calendars.insert({
        resource: calendar
      });

      return {
        success: true,
        calendar: response.data,
        message: `Calendar "${summary}" created successfully`
      };
    } catch (error) {
      console.error('Error creating calendar:', error);
      return {
        success: false,
        error: error.message,
        calendar: null
      };
    }
  }

  async updateCalendar(calendarId, calendarData) {
    this.ensureAuthenticated();
    
    try {
      // Get existing calendar
      const existingResponse = await this.calendar.calendars.get({
        calendarId
      });

      const existingCalendar = existingResponse.data;
      const updatedCalendar = { ...existingCalendar };

      // Update only provided fields
      if (calendarData.summary !== undefined) updatedCalendar.summary = calendarData.summary;
      if (calendarData.description !== undefined) updatedCalendar.description = calendarData.description;
      if (calendarData.timeZone !== undefined) updatedCalendar.timeZone = calendarData.timeZone;
      if (calendarData.location !== undefined) updatedCalendar.location = calendarData.location;

      const response = await this.calendar.calendars.update({
        calendarId,
        resource: updatedCalendar
      });

      return {
        success: true,
        calendar: response.data,
        message: `Calendar "${response.data.summary}" updated successfully`
      };
    } catch (error) {
      console.error('Error updating calendar:', error);
      return {
        success: false,
        error: error.message,
        calendar: null
      };
    }
  }

  async deleteCalendar(calendarId) {
    this.ensureAuthenticated();
    
    try {
      if (calendarId === 'primary') {
        throw new Error('Cannot delete the primary calendar');
      }

      // Get calendar details before deletion
      const calendarResponse = await this.calendar.calendars.get({
        calendarId
      });

      const calendarName = calendarResponse.data.summary || 'Untitled Calendar';

      await this.calendar.calendars.delete({
        calendarId
      });

      return {
        success: true,
        message: `Calendar "${calendarName}" deleted successfully`
      };
    } catch (error) {
      console.error('Error deleting calendar:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async findAvailableSlots(calendarId = 'primary', duration = 60, timeMin, timeMax, timeZone = 'Asia/Kolkata') {
    this.ensureAuthenticated();
    
    try {
      // Validate and sanitize inputs
      const sanitizedCalendarId = this.sanitizeStringInput(calendarId, 'Calendar ID', true) || 'primary';
      const sanitizedTimeZone = this.sanitizeStringInput(timeZone, 'Time Zone') || 'Asia/Kolkata';
      
      // Validate duration
      const numericDuration = parseInt(duration) || 60;
      if (numericDuration <= 0 || numericDuration > 1440) { // Max 24 hours
        throw new Error('Duration must be between 1 and 1440 minutes (24 hours)');
      }
      
      if (!timeMin || !timeMax) {
        throw new Error('Time range (timeMin and timeMax) is required for finding available slots');
      }
      
      // Normalize time range
      const normalizedTimeRange = this.normalizeTimeRange(timeMin, timeMax);
      
      // Get free/busy information
      const freebusyResult = await this.getFreeBusy([sanitizedCalendarId], normalizedTimeRange.timeMin, normalizedTimeRange.timeMax, sanitizedTimeZone);
      
      if (!freebusyResult.success) {
        return freebusyResult;
      }

      const busy = freebusyResult.freebusy.calendars[sanitizedCalendarId]?.busy || [];
      
      // Calculate available slots
      const availableSlots = [];
      const start = new Date(normalizedTimeRange.timeMin);
      const end = new Date(normalizedTimeRange.timeMax);
      const durationMs = numericDuration * 60 * 1000;

      let currentTime = new Date(start);
      
      // Sort busy times
      busy.sort((a, b) => new Date(a.start) - new Date(b.start));

      for (const busySlot of busy) {
        const busyStart = new Date(busySlot.start);
        const busyEnd = new Date(busySlot.end);
        
        // Check if there's a gap before this busy slot
        if (currentTime < busyStart && (busyStart - currentTime) >= durationMs) {
          availableSlots.push({
            start: currentTime.toISOString(),
            end: busyStart.toISOString(),
            duration: Math.floor((busyStart - currentTime) / 60000) // in minutes
          });
        }
        
        // Move current time to after the busy slot
        currentTime = new Date(Math.max(currentTime, busyEnd));
      }

      // Check if there's time available after the last busy slot
      if (currentTime < end && (end - currentTime) >= durationMs) {
        availableSlots.push({
          start: currentTime.toISOString(),
          end: end.toISOString(),
          duration: Math.floor((end - currentTime) / 60000)
        });
      }

      return {
        success: true,
        availableSlots,
        busySlots: busy,
        message: `Found ${availableSlots.length} available slot(s) of ${numericDuration} minutes or longer`
      };
    } catch (error) {
      console.error('Error finding available slots:', error);
      return {
        success: false,
        error: error.message,
        availableSlots: []
      };
    }
  }

  async getCurrentTime(timeZone = 'Asia/Kolkata') {
    try {
      const now = new Date();
      const options = {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };

      const localTime = now.toLocaleString('en-CA', options).replace(', ', 'T');
      
      return {
        success: true,
        currentTime: {
          utc: now.toISOString(),
          local: localTime,
          timeZone,
          timestamp: now.getTime()
        },
        message: `Current time in ${timeZone}: ${localTime}`
      };
    } catch (error) {
      console.error('Error getting current time:', error);
      return {
        success: false,
        error: error.message,
        currentTime: null
      };
    }
  }

  // === BATCH OPERATIONS ===

  async batchCreateEvents(events, calendarId = 'primary') {
    this.ensureAuthenticated();
    
    const results = [];
    const errors = [];

    for (const eventData of events) {
      try {
        const result = await this.createEvent({ ...eventData, calendarId });
        results.push(result);
      } catch (error) {
        errors.push({ event: eventData, error: error.message });
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      message: `Created ${results.filter(r => r.success).length}/${events.length} events successfully`
    };
  }

  async batchDeleteEvents(eventIds, calendarId = 'primary') {
    this.ensureAuthenticated();
    
    const results = [];
    const errors = [];

    for (const eventId of eventIds) {
      try {
        const result = await this.deleteEvent(calendarId, eventId);
        results.push(result);
      } catch (error) {
        errors.push({ eventId, error: error.message });
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      message: `Deleted ${results.filter(r => r.success).length}/${eventIds.length} events successfully`
    };
  }

  // === UTILITY METHODS ===

  /**
   * Normalizes datetime to RFC3339 format required by Google Calendar API
   * @param {string|Date} dateTime - Input datetime in various formats
   * @returns {string} RFC3339 formatted datetime string
   * @throws {Error} If datetime is invalid
   */
  normalizeDateTime(dateTime) {
    if (!dateTime) {
      throw new Error('DateTime is required');
    }
    
    try {
      let date;
      
      // Handle string inputs
      if (typeof dateTime === 'string') {
        // Trim whitespace
        dateTime = dateTime.trim();
        
        if (!dateTime) {
          throw new Error('DateTime cannot be empty');
        }
        
        // Handle common incomplete formats
        // Add seconds if missing (YYYY-MM-DDTHH:MM -> YYYY-MM-DDTHH:MM:SS)
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateTime)) {
          dateTime += ':00';
        }
        
        // Add timezone if missing (YYYY-MM-DDTHH:MM:SS -> YYYY-MM-DDTHH:MM:SS.000Z)
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateTime)) {
          dateTime += '.000Z';
        }
        
        // Add milliseconds if missing timezone but has seconds
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(dateTime)) {
          dateTime = dateTime.replace('Z', '.000Z');
        }
        
        date = new Date(dateTime);
      } else if (dateTime instanceof Date) {
        date = dateTime;
      } else {
        throw new Error('DateTime must be a string or Date object');
      }
      
      // Validate the date
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
      
      // Return RFC3339 format
      return date.toISOString();
    } catch (error) {
      throw new Error(`DateTime normalization failed: ${error.message}`);
    }
  }

  /**
   * Safely trims and validates string input
   * @param {string} input - Input string
   * @param {string} fieldName - Name of the field for error messages
   * @param {boolean} required - Whether the field is required
   * @returns {string} Trimmed string
   */
  sanitizeStringInput(input, fieldName, required = false) {
    if (input === null || input === undefined) {
      if (required) {
        throw new Error(`${fieldName} is required`);
      }
      return '';
    }
    
    if (typeof input !== 'string') {
      if (required) {
        throw new Error(`${fieldName} must be a string`);
      }
      return String(input).trim();
    }
    
    const trimmed = input.trim();
    
    if (required && !trimmed) {
      throw new Error(`${fieldName} cannot be empty`);
    }
    
    return trimmed;
  }

  /**
   * Validates and normalizes time range parameters
   * @param {string} timeMin - Start time
   * @param {string} timeMax - End time
   * @returns {object} Normalized time range
   */
  normalizeTimeRange(timeMin, timeMax) {
    let normalizedTimeMin = timeMin;
    let normalizedTimeMax = timeMax;
    
    // Set defaults if not provided
    if (!normalizedTimeMin) {
      normalizedTimeMin = new Date().toISOString();
    } else {
      normalizedTimeMin = this.normalizeDateTime(normalizedTimeMin);
    }
    
    if (!normalizedTimeMax) {
      const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      normalizedTimeMax = oneWeekFromNow.toISOString();
    } else {
      normalizedTimeMax = this.normalizeDateTime(normalizedTimeMax);
    }
    
    // Validate time range
    const startDate = new Date(normalizedTimeMin);
    const endDate = new Date(normalizedTimeMax);
    
    if (endDate <= startDate) {
      throw new Error('End time must be after start time');
    }
    
    return {
      timeMin: normalizedTimeMin,
      timeMax: normalizedTimeMax
    };
  }

  formatEventDetails(event) {
    const start = new Date(event.start?.dateTime || event.start?.date);
    const end = new Date(event.end?.dateTime || event.end?.date);
    
    return {
      id: event.id,
      title: event.summary || 'Untitled Event',
      description: event.description || '',
      start: start.toISOString(),
      end: end.toISOString(),
      location: event.location || '',
      attendees: event.attendees?.map(a => a.email) || [],
      colorId: event.colorId,
      status: event.status,
      created: event.created,
      updated: event.updated,
      htmlLink: event.htmlLink,
      organizer: event.organizer?.email,
      recurrence: event.recurrence || null
    };
  }

  formatCalendarDetails(calendar) {
    return {
      id: calendar.id,
      name: calendar.summary || calendar.summaryOverride || 'Untitled Calendar',
      description: calendar.description || '',
      timeZone: calendar.timeZone || 'UTC',
      accessRole: calendar.accessRole,
      primary: calendar.primary || false,
      selected: calendar.selected !== false,
      backgroundColor: calendar.backgroundColor || '#ffffff',
      foregroundColor: calendar.foregroundColor || '#000000',
      hidden: calendar.hidden || false,
      defaultReminders: calendar.defaultReminders || []
    };
  }

  // === VALIDATION HELPERS ===

  validateDateTime(dateTime) {
    try {
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  validateTimeRange(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (endDate <= startDate) {
      throw new Error('End time must be after start time');
    }
    
    return true;
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Export singleton instance
export const googleCalendarAPI = new GoogleCalendarAPI();
