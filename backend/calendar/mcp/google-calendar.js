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
    this.credentialsPath = path.join(__dirname, 'gcp-oauth.keys.json');
    this.tokenPath = path.join(__dirname, 'tokens.json');
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
      const {
        timeMin = new Date().toISOString(),
        timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        maxResults = 50,
        timeZone = 'Asia/Kolkata'
      } = options;

      const response = await this.calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
        timeZone
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
      const {
        timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        maxResults = 50,
        timeZone = 'Asia/Kolkata'
      } = options;

      const response = await this.calendar.events.list({
        calendarId,
        q: query,
        timeMin,
        timeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
        timeZone
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

      // Validate required fields
      if (!summary || !start || !end) {
        throw new Error('Summary, start time, and end time are required');
      }

      // Prepare event object
      const event = {
        summary,
        description,
        start: {
          dateTime: start,
          timeZone
        },
        end: {
          dateTime: end,
          timeZone
        },
        reminders
      };

      // Add optional fields
      if (location) event.location = location;
      if (attendees.length > 0) {
        event.attendees = attendees.map(email => 
          typeof email === 'string' ? { email } : email
        );
      }
      if (colorId) event.colorId = colorId;
      if (recurrence) event.recurrence = recurrence;

      const response = await this.calendar.events.insert({
        calendarId,
        resource: event,
        sendUpdates: 'all'
      });

      return {
        success: true,
        event: response.data,
        message: `Event "${summary}" created successfully`
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

      if (!eventId) {
        throw new Error('Event ID is required for update');
      }

      // Get the existing event first
      const existingResponse = await this.calendar.events.get({
        calendarId,
        eventId
      });

      const existingEvent = existingResponse.data;
      
      // Prepare updated event object
      const updatedEvent = { ...existingEvent };

      // Update only provided fields
      if (summary !== undefined) updatedEvent.summary = summary;
      if (description !== undefined) updatedEvent.description = description;
      if (location !== undefined) updatedEvent.location = location;
      if (colorId !== undefined) updatedEvent.colorId = colorId;
      if (recurrence !== undefined) updatedEvent.recurrence = recurrence;
      if (reminders !== undefined) updatedEvent.reminders = reminders;

      if (start !== undefined) {
        updatedEvent.start = {
          dateTime: start,
          timeZone
        };
      }

      if (end !== undefined) {
        updatedEvent.end = {
          dateTime: end,
          timeZone
        };
      }

      if (attendees !== undefined) {
        updatedEvent.attendees = attendees.map(email => 
          typeof email === 'string' ? { email } : email
        );
      }

      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        resource: updatedEvent,
        sendUpdates
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
      const items = calendars.map(calId => ({ id: calId }));

      const response = await this.calendar.freebusy.query({
        resource: {
          timeMin,
          timeMax,
          timeZone,
          items
        }
      });

      return {
        success: true,
        freebusy: response.data,
        message: `Free/busy information retrieved for ${calendars.length} calendar(s)`
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
      // Get free/busy information
      const freebusyResult = await this.getFreeBusy([calendarId], timeMin, timeMax, timeZone);
      
      if (!freebusyResult.success) {
        return freebusyResult;
      }

      const busy = freebusyResult.freebusy.calendars[calendarId]?.busy || [];
      
      // Calculate available slots
      const availableSlots = [];
      const start = new Date(timeMin);
      const end = new Date(timeMax);
      const durationMs = duration * 60 * 1000;

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
        message: `Found ${availableSlots.length} available slot(s) of ${duration} minutes or longer`
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
