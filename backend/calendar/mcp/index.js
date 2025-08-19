import { calendarClient } from './calendar-client.js';

// Initialize the calendar client
async function initialize() {
  try {
    await calendarClient.initialize();
    console.log('Calendar MCP service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize calendar MCP service:', error);
    return false;
  }
}

// Export all calendar operations
export class CalendarMCP {
  constructor() {
    this.client = calendarClient;
    this.isReady = false;
  }

  async init() {
    if (!this.isReady) {
      this.isReady = await initialize();
    }
    return this.isReady;
  }

  async ensureReady() {
    if (!this.isReady) {
      await this.init();
    }
    if (!this.isReady) {
      throw new Error('Calendar service is not ready. Please check authentication and configuration.');
    }
  }

  // === CALENDAR OPERATIONS ===

  async listCalendars() {
    await this.ensureReady();
    return this.client.listCalendars();
  }

  async listEvents(calendarId = 'primary', options = {}) {
    await this.ensureReady();
    return this.client.listEvents(calendarId, options);
  }

  async searchEvents(calendarId = 'primary', query, options = {}) {
    await this.ensureReady();
    return this.client.searchEvents(calendarId, query, options);
  }

  async createEvent(eventData) {
    await this.ensureReady();
    return this.client.createEvent(eventData);
  }

  async updateEvent(eventData) {
    await this.ensureReady();
    return this.client.updateEvent(eventData);
  }

  async deleteEvent(calendarId = 'primary', eventId, sendUpdates = 'all') {
    await this.ensureReady();
    return this.client.deleteEvent(calendarId, eventId, sendUpdates);
  }

  async getEvent(calendarId = 'primary', eventId) {
    await this.ensureReady();
    return this.client.getEvent(calendarId, eventId);
  }

  async getFreeBusy(calendars, timeMin, timeMax, timeZone = 'Asia/Kolkata') {
    await this.ensureReady();
    return this.client.getFreeBusy(calendars, timeMin, timeMax, timeZone);
  }

  async listColors() {
    await this.ensureReady();
    return this.client.listColors();
  }

  async getCurrentTime(timeZone = 'Asia/Kolkata') {
    await this.ensureReady();
    return this.client.getCurrentTime(timeZone);
  }

  async findAvailableSlots(calendarId = 'primary', duration = 60, timeMin, timeMax, timeZone = 'Asia/Kolkata') {
    await this.ensureReady();
    return this.client.findAvailableSlots(calendarId, duration, timeMin, timeMax, timeZone);
  }

  // === CALENDAR MANAGEMENT ===

  async createCalendar(calendarData) {
    await this.ensureReady();
    return this.client.createCalendar(calendarData);
  }

  async updateCalendar(calendarId, calendarData) {
    await this.ensureReady();
    return this.client.updateCalendar(calendarId, calendarData);
  }

  async deleteCalendar(calendarId) {
    await this.ensureReady();
    return this.client.deleteCalendar(calendarId);
  }

  // === SMART FEATURES ===

  async getTodaysEvents(calendarId = 'primary', timeZone = 'Asia/Kolkata') {
    await this.ensureReady();
    return this.client.getTodaysEvents(calendarId, timeZone);
  }

  async getWeekEvents(calendarId = 'primary', timeZone = 'Asia/Kolkata') {
    await this.ensureReady();
    return this.client.getWeekEvents(calendarId, timeZone);
  }

  async findNextAvailableSlot(calendarId = 'primary', duration = 60, timeZone = 'Asia/Kolkata') {
    await this.ensureReady();
    return this.client.findNextAvailableSlot(calendarId, duration, timeZone);
  }

  async searchAndUpdateEvent(calendarId = 'primary', searchQuery, updates, timeZone = 'Asia/Kolkata') {
    await this.ensureReady();
    return this.client.searchAndUpdateEvent(calendarId, searchQuery, updates, timeZone);
  }

  async searchAndDeleteEvent(calendarId = 'primary', searchQuery, timeZone = 'Asia/Kolkata') {
    await this.ensureReady();
    return this.client.searchAndDeleteEvent(calendarId, searchQuery, timeZone);
  }

  async findEventsByDateRange(calendarId = 'primary', startDate, endDate, timeZone = 'Asia/Kolkata') {
    await this.ensureReady();
    return this.client.findEventsByDateRange(calendarId, startDate, endDate, timeZone);
  }

  // === BATCH OPERATIONS ===

  async batchCreateEvents(events, calendarId = 'primary') {
    await this.ensureReady();
    return this.client.batchCreateEvents(events, calendarId);
  }

  async batchDeleteEvents(eventIds, calendarId = 'primary') {
    await this.ensureReady();
    return this.client.batchDeleteEvents(eventIds, calendarId);
  }

  // === UTILITY METHODS ===

  formatEventForDisplay(event) {
    return this.client.formatEventForDisplay(event);
  }

  formatCalendarForDisplay(calendar) {
    return this.client.formatCalendarForDisplay(calendar);
  }

  getStatus() {
    return {
      ...this.client.getStatus(),
      ready: this.isReady
    };
  }

  // === LEGACY COMPATIBILITY ===
  // These methods provide compatibility with the existing MCP client interface

  async connect() {
    return this.init();
  }

  async disconnect() {
    console.log('Calendar MCP service disconnected');
    this.isReady = false;
  }

  async ensureConnected() {
    return this.ensureReady();
  }

  // Parse tool result for compatibility with existing code
  parseToolResult(result) {
    if (result && typeof result === 'object') {
      return result;
    }
    return { message: result || 'Unknown result' };
  }
}

// Export singleton instance
export const calendarMCP = new CalendarMCP();

// For backwards compatibility
export default calendarMCP;
