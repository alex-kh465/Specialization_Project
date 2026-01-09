import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MCPCalendarClient {
  constructor() {
    this.client = null;
    this.transport = null;
    this.isConnected = false;
    this.serverProcess = null;
    
    // Set paths
    this.mcpServerPath = path.join(__dirname, 'calendar', 'google-calendar-mcp', 'build', 'index.js');
    this.credentialsPath = path.join(__dirname, 'calendar', 'google-calendar-mcp', 'gcp-oauth.keys.json');
    
    console.log('MCP Server Path:', this.mcpServerPath);
    console.log('Credentials Path:', this.credentialsPath);
    console.log('MCP Server exists:', existsSync(this.mcpServerPath));
    console.log('Credentials exist:', existsSync(this.credentialsPath));
  }

  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      console.log('Starting MCP Calendar server...');
      
      // Validate paths before starting
      if (!this.mcpServerPath || typeof this.mcpServerPath !== 'string') {
        throw new Error('MCP server path is not defined or not a string');
      }
      
      if (!existsSync(this.mcpServerPath)) {
        throw new Error(`MCP server file does not exist at: ${this.mcpServerPath}`);
      }
      
      const serverDir = path.dirname(this.mcpServerPath);
      console.log('Server directory:', serverDir);
      console.log('Environment GOOGLE_OAUTH_CREDENTIALS:', this.credentialsPath);
      
      // Create stdio transport with command and args for MCP server
      this.transport = new StdioClientTransport({
        command: 'node',
        args: [this.mcpServerPath],
        env: {
          ...process.env,
          // Use the existing OAuth credentials file
          GOOGLE_OAUTH_CREDENTIALS: this.credentialsPath,
          // Set custom token path to use the backend's token file
          GOOGLE_CALENDAR_MCP_TOKEN_PATH: path.join(__dirname, '.google-tokens.json')
        }
      });

      // Create and connect client
      this.client = new Client(
        {
          name: "genewa-backend",
          version: "1.0.0"
        },
        {
          capabilities: {}
        }
      );

      // Set connection timeout
      const connectPromise = this.client.connect(this.transport);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('MCP connection timeout')), 10000);
      });

      await Promise.race([connectPromise, timeoutPromise]);
      this.isConnected = true;
      
      console.log('MCP Calendar client connected successfully');

    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      this.isConnected = false;
      
      // Clean up process if it exists
      if (this.serverProcess && !this.serverProcess.killed) {
        this.serverProcess.kill();
      }
      
      // Don't throw error - make it non-blocking
      console.warn('MCP Calendar client will be unavailable, but server will continue');
    }
  }

  async disconnect() {
    if (this.client && this.transport) {
      try {
        await this.client.close();
        await this.transport.close();
      } catch (error) {
        console.error('Error disconnecting MCP client:', error);
      }
    }
    this.isConnected = false;
  }

  async ensureConnected() {
    // Try to reconnect if not connected
    if (!this.isConnected) {
      console.log('MCP Calendar client not connected, attempting to reconnect...');
      await this.connect();
    }
    
    // If still not connected after attempt, return false instead of throwing
    if (!this.isConnected) {
      console.warn('MCP Calendar client connection failed, calendar operations will be unavailable');
      return false;
    }
    
    return true;
  }

  // Utility function to ensure proper ISO 8601 format with UTC timezone
  toIso8601(dateValue) {
    if (!dateValue) return null;

    try {
      const date = new Date(dateValue);
      // Always return ISO string in UTC with "Z" timezone, strip milliseconds for consistency
      const isoString = date.toISOString();
      return isoString.substring(0, 19) + 'Z'; // Remove .sssZ and add Z
    } catch (error) {
      console.warn('Invalid date value:', dateValue, 'Error:', error.message);
      return null;
    }
  }

  // Calendar operations using the MCP server
  async listCalendars() {
    const connected = await this.ensureConnected();
    if (!connected) {
      throw new Error('Calendar service is currently unavailable. Please try again later.');
    }
    
    try {
      const result = await this.client.callTool({
        name: 'list-calendars',
        arguments: {}
      });
      
      return this.parseToolResult(result);
    } catch (error) {
      console.error('Error listing calendars:', error);
      throw new Error('Failed to list calendars: ' + error.message);
    }
  }

  async listEvents(calendarId = 'primary', timeMin = null, timeMax = null, timeZone = 'Asia/Kolkata') {
    const connected = await this.ensureConnected();
    if (!connected) {
      throw new Error('Calendar service is currently unavailable. Please try again later.');
    }
    
    try {
      const args = { calendarId };
      
      // Set default time range if not provided (list events may need these parameters)
      if (!timeMin) {
        const now = new Date();
        timeMin = this.toIso8601(now.toISOString());
      } else {
        timeMin = this.toIso8601(timeMin);
      }
      
      if (!timeMax) {
        const oneWeek = new Date();
        oneWeek.setDate(oneWeek.getDate() + 7);
        timeMax = this.toIso8601(oneWeek.toISOString());
      } else {
        timeMax = this.toIso8601(timeMax);
      }
      
      args.timeMin = timeMin;
      args.timeMax = timeMax;
      if (timeZone) args.timeZone = timeZone;

      const result = await this.client.callTool({
        name: 'list-events',
        arguments: args
      });
      
      return this.parseToolResult(result);
    } catch (error) {
      console.error('Error listing events:', error);
      throw new Error('Failed to list events: ' + error.message);
    }
  }

  async searchEvents(calendarId = 'primary', query, timeMin, timeMax, timeZone = 'Asia/Kolkata') {
    const connected = await this.ensureConnected();
    if (!connected) {
      throw new Error('Calendar service is currently unavailable. Please try again later.');
    }
    
    try {
      // Set default time range if not provided (search needs these parameters)
      if (!timeMin) {
        const now = new Date();
        timeMin = this.toIso8601(now.toISOString());
      } else {
        timeMin = this.toIso8601(timeMin);
      }
      
      if (!timeMax) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        timeMax = this.toIso8601(nextMonth.toISOString());
      } else {
        timeMax = this.toIso8601(timeMax);
      }
      
      const args = {
        calendarId,
        query,
        timeMin,
        timeMax,
        timeZone
      };
      
      const result = await this.client.callTool({
        name: 'search-events',
        arguments: args
      });
      
      return this.parseToolResult(result);
    } catch (error) {
      console.error('Error searching events:', error);
      throw new Error('Failed to search events: ' + error.message);
    }
  }

  async createEvent(eventData) {
    const connected = await this.ensureConnected();
    if (!connected) {
      throw new Error('Calendar service is currently unavailable. Please try again later.');
    }
    
    try {
      const args = {
        calendarId: eventData.calendarId || 'primary',
        summary: eventData.title || eventData.summary,
        description: eventData.description || '',
        start: this.toIso8601(eventData.start),
        end: this.toIso8601(eventData.end),
        timeZone: eventData.timeZone || 'Asia/Kolkata'
      };

      // Add optional fields if provided
      if (eventData.location) args.location = eventData.location;
      if (eventData.attendees) args.attendees = eventData.attendees;
      if (eventData.colorId) args.colorId = eventData.colorId;
      if (eventData.reminders) args.reminders = eventData.reminders;
      if (eventData.recurrence) args.recurrence = eventData.recurrence;

      const result = await this.client.callTool({
        name: 'create-event',
        arguments: args
      });
      
      return this.parseToolResult(result);
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event: ' + error.message);
    }
  }

  async updateEvent(eventData) {
    const connected = await this.ensureConnected();
    if (!connected) {
      throw new Error('Calendar service is currently unavailable. Please try again later.');
    }
    
    try {
      const args = {
        calendarId: eventData.calendarId || 'primary',
        eventId: eventData.eventId
      };

      // Add fields to update
      if (eventData.title || eventData.summary) args.summary = eventData.title || eventData.summary;
      if (eventData.description) args.description = eventData.description;
      if (eventData.start) args.start = this.toIso8601(eventData.start);
      if (eventData.end) args.end = this.toIso8601(eventData.end);
      if (eventData.timeZone) args.timeZone = eventData.timeZone;
      if (eventData.location) args.location = eventData.location;
      if (eventData.attendees) args.attendees = eventData.attendees;
      if (eventData.colorId) args.colorId = eventData.colorId;
      if (eventData.reminders) args.reminders = eventData.reminders;
      if (eventData.recurrence) args.recurrence = eventData.recurrence;
      if (eventData.sendUpdates) args.sendUpdates = eventData.sendUpdates;
      if (eventData.modificationScope) args.modificationScope = eventData.modificationScope;
      if (eventData.originalStartTime) args.originalStartTime = this.toIso8601(eventData.originalStartTime);
      if (eventData.futureStartDate) args.futureStartDate = this.toIso8601(eventData.futureStartDate);

      const result = await this.client.callTool({
        name: 'update-event',
        arguments: args
      });
      
      return this.parseToolResult(result);
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event: ' + error.message);
    }
  }

  async deleteEvent(calendarId = 'primary', eventId, sendUpdates = 'all') {
    const connected = await this.ensureConnected();
    if (!connected) {
      throw new Error('Calendar service is currently unavailable. Please try again later.');
    }
    
    try {
      const result = await this.client.callTool({
        name: 'delete-event',
        arguments: {
          calendarId,
          eventId,
          sendUpdates
        }
      });
      
      return this.parseToolResult(result);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete event: ' + error.message);
    }
  }

  async getFreeBusy(calendars, timeMin, timeMax, timeZone = 'Asia/Kolkata') {
    const connected = await this.ensureConnected();
    if (!connected) {
      throw new Error('Calendar service is currently unavailable. Please try again later.');
    }
    
    try {
      const result = await this.client.callTool({
        name: 'get-freebusy',
        arguments: {
          calendars: calendars.map(cal => ({ id: cal })),
          timeMin: this.toIso8601(timeMin),
          timeMax: this.toIso8601(timeMax),
          timeZone
        }
      });
      
      return this.parseToolResult(result);
    } catch (error) {
      console.error('Error getting free/busy info:', error);
      throw new Error('Failed to get free/busy information: ' + error.message);
    }
  }

  async getCurrentTime(timeZone = null) {
    const connected = await this.ensureConnected();
    if (!connected) {
      throw new Error('Calendar service is currently unavailable. Please try again later.');
    }
    
    try {
      const args = {};
      if (timeZone) args.timeZone = timeZone;

      const result = await this.client.callTool({
        name: 'get-current-time',
        arguments: args
      });
      
      return this.parseToolResult(result);
    } catch (error) {
      console.error('Error getting current time:', error);
      throw new Error('Failed to get current time: ' + error.message);
    }
  }

  async listColors() {
    const connected = await this.ensureConnected();
    if (!connected) {
      throw new Error('Calendar service is currently unavailable. Please try again later.');
    }
    
    try {
      const result = await this.client.callTool({
        name: 'list-colors',
        arguments: {}
      });
      
      return this.parseToolResult(result);
    } catch (error) {
      console.error('Error listing colors:', error);
      throw new Error('Failed to list colors: ' + error.message);
    }
  }

  // Helper method to parse tool results
  parseToolResult(result) {
    if (result.content && result.content.length > 0) {
      const content = result.content[0];
      if (content.type === 'text') {
        console.log('MCP Tool Result:', content.text.substring(0, 200) + '...');
        try {
          const parsed = JSON.parse(content.text);
          console.log('Successfully parsed JSON result');
          return parsed;
        } catch (e) {
          console.log('Failed to parse as JSON, returning as message format');
          return { message: content.text };
        }
      }
    }
    return result;
  }
}

// Create singleton instance
const mcpCalendarClient = new MCPCalendarClient();

export default mcpCalendarClient;
