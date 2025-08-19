import express from 'express';
import cors from 'cors';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = null;
    this.calendar = null;
    this.initializeOAuth();
  }

  initializeOAuth() {
    try {
      // Load OAuth credentials
      const credentialsPath = process.env.GOOGLE_OAUTH_CREDENTIALS || 
        path.join(__dirname, 'calendar', 'google-calendar-mcp', 'gcp-oauth.keys.json');
      
      if (!fs.existsSync(credentialsPath)) {
        console.error('Google OAuth credentials file not found:', credentialsPath);
        return;
      }

      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

      // Use our backend's OAuth callback URL
      const redirectUri = `http://localhost:${process.env.PORT || 4000}/oauth2callback`;
      console.log('Using redirect URI:', redirectUri);
      
      this.oauth2Client = new OAuth2Client(client_id, client_secret, redirectUri);
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      // Load existing tokens if they exist
      this.loadTokens();
    } catch (error) {
      console.error('Failed to initialize Google OAuth:', error);
    }
  }

  loadTokens() {
    try {
      const tokenPath = path.join(__dirname, '.google-tokens.json');
      if (fs.existsSync(tokenPath)) {
        const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        this.oauth2Client.setCredentials(tokens);
        console.log('Google Calendar tokens loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  }

  saveTokens(tokens) {
    try {
      const tokenPath = path.join(__dirname, '.google-tokens.json');
      fs.writeFileSync(tokenPath, JSON.stringify(tokens));
      this.oauth2Client.setCredentials(tokens);
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  }

  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  async getAccessToken(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.saveTokens(tokens);
      return tokens;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  async isAuthenticated() {
    try {
      if (!this.oauth2Client.credentials.access_token) {
        return false;
      }
      
      // Test the credentials by making a simple API call
      await this.calendar.calendarList.list({ maxResults: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  async listCalendars() {
    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items;
    } catch (error) {
      console.error('Error listing calendars:', error);
      throw error;
    }
  }

  async createEvent(eventData) {
    try {
      const {
        summary,
        description,
        start,
        end,
        location,
        attendees,
        calendarId = 'primary'
      } = eventData;

      const event = {
        summary,
        description,
        location,
        start: {
          dateTime: start,
          timeZone: 'Asia/Kolkata', // Default to Indian timezone
        },
        end: {
          dateTime: end,
          timeZone: 'Asia/Kolkata',
        },
        attendees: attendees ? attendees.map(email => ({ email })) : [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId,
        resource: event,
      });

      return response.data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async listEvents(calendarId = 'primary', timeMin, timeMax) {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Next 30 days
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items;
    } catch (error) {
      console.error('Error listing events:', error);
      throw error;
    }
  }

  async deleteEvent(eventId, calendarId = 'primary') {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  async updateEvent(eventId, eventData, calendarId = 'primary') {
    try {
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        resource: eventData,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }
}

export default GoogleCalendarService;
