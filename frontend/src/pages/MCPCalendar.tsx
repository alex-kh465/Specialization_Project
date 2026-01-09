import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  RefreshCw, 
  Search,
  MapPin,
  Users,
  Bell,
  Palette,
  Filter,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import GoogleCalendarIntegration from '@/components/calendar/GoogleCalendarIntegration';
import { useToast } from '@/hooks/use-toast';

// Enhanced interfaces for MCP Calendar
interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  colorId?: string;
  recurring?: boolean;
  status?: string;
  htmlLink?: string;
  reminders?: {
    useDefault: boolean;
    overrides: Array<{method: string; minutes: number}>;
  };
}

interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  selected?: boolean;
}

interface EventColor {
  background: string;
  foreground: string;
}

interface AvailabilitySlot {
  start: string;
  end: string;
}

interface NewEvent {
  calendarId: string;
  summary: string;
  description: string;
  start: string;
  end: string;
  location: string;
  attendees: Array<{email: string}>;
  colorId?: string;
  reminders?: {
    useDefault: boolean;
    overrides: Array<{method: string; minutes: number}>;
  };
  recurrence?: string[];
}

const API_URL = 'http://localhost:4000';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : '');

// Helper function to parse calendars from MCP message format
const parseCalendarsFromMessage = (message: string): Calendar[] => {
  const calendars: Calendar[] = [];
  
  // Split the message by double newlines to get calendar blocks
  const blocks = message.split('\n\n').filter(block => block.trim());
  
  for (const block of blocks) {
    const lines = block.split('\n');
    const titleLine = lines[0];
    
    // Extract calendar info from title line format: "Name (email@domain.com)"
    if (titleLine && titleLine.includes('(') && titleLine.includes(')')) {
      const match = titleLine.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (match) {
        const [, summary, id] = match;
        const isPrimary = titleLine.includes('PRIMARY');
        
        calendars.push({
          id: id.trim(),
          summary: summary.trim(),
          primary: isPrimary,
          selected: isPrimary // Default selection for primary
        });
      }
    }
  }
  
  return calendars;
};

// Helper function to parse events from MCP message format
const parseEventsFromMessage = (message: string): GoogleCalendarEvent[] => {
  const events: GoogleCalendarEvent[] = [];
  
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
          // Parse date strings from "Mon, Jan 01, 2024, 10:00 AM GMT+5:30" format
          const parseDateTime = (dateStr: string) => {
            const cleanStr = dateStr.replace(/ GMT.*$/, '');
            return new Date(cleanStr).toISOString();
          };
          
          events.push({
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
          });
        }
      }
    }
  }
  
  return events;
};

const MCPCalendar: React.FC = () => {
  // State for MCP Calendar features
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [colors, setColors] = useState<{[key: string]: EventColor}>({});
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(['primary']);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('events');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdvancedAdd, setShowAdvancedAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isSearching, setIsSearching] = useState(false);
  
  // Event management
  const [newEvent, setNewEvent] = useState<NewEvent>({
    calendarId: 'primary',
    summary: '',
    description: '',
    start: '',
    end: '',
    location: '',
    attendees: [],
    reminders: { useDefault: true, overrides: [] }
  });
  const [attendeeInput, setAttendeeInput] = useState('');
  const [searchResults, setSearchResults] = useState<GoogleCalendarEvent[]>([]);
  const [editingEvent, setEditingEvent] = useState<GoogleCalendarEvent | null>(null);
  const [addingEvent, setAddingEvent] = useState(false);
  const [customReminders, setCustomReminders] = useState<Array<{method: string; minutes: number}>>([]);
  
  const { toast } = useToast();

  // Helper function to normalize event data to ensure consistent format
  const normalizeEventData = (event: any): GoogleCalendarEvent => {
    if (!event) return null;
    
    const normalized: GoogleCalendarEvent = {
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
      htmlLink: event.htmlLink,
      reminders: event.reminders || { useDefault: true, overrides: [] }
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

  // Calendar API Functions using new endpoints
  const fetchMCPCalendars = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/calendar/mcp/calendars`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Raw calendars response:', JSON.stringify(data, null, 2));
        
        // Handle the specific structure from your server logs
        let calendarList: Calendar[] = [];
        
        // Based on your server logs, the structure is: { calendars: [...] }
        if (Array.isArray(data.calendars)) {
          calendarList = data.calendars.map((cal: any) => ({
            id: cal.id || '',
            summary: cal.name || cal.summary || cal.displayName || cal.id || 'Unnamed Calendar',
            description: cal.description || '',
            primary: !!cal.primary,
            selected: !!cal.selected,
            backgroundColor: cal.backgroundColor,
            foregroundColor: cal.foregroundColor
          }));
        }
        // Fallback for other possible structures
        else if (data.success && data.data && Array.isArray(data.data.calendars)) {
          calendarList = data.data.calendars.map((cal: any) => ({
            id: cal.id || '',
            summary: cal.name || cal.summary || cal.displayName || cal.id || 'Unnamed Calendar',
            description: cal.description || '',
            primary: !!cal.primary,
            selected: !!cal.selected,
            backgroundColor: cal.backgroundColor,
            foregroundColor: cal.foregroundColor
          }));
        }
        // Handle wrapped structure with items array
        else if (data.success && data.data && data.data.calendars && Array.isArray(data.data.calendars.items)) {
          calendarList = data.data.calendars.items.map((cal: any) => ({
            id: cal.id || '',
            summary: cal.name || cal.summary || cal.displayName || cal.id || 'Unnamed Calendar',
            description: cal.description || '',
            primary: !!cal.primary,
            selected: !!cal.selected,
            backgroundColor: cal.backgroundColor,
            foregroundColor: cal.foregroundColor
          }));
        }
        // Handle direct items array
        else if (Array.isArray(data.items)) {
          calendarList = data.items.map((cal: any) => ({
            id: cal.id || '',
            summary: cal.name || cal.summary || cal.displayName || cal.id || 'Unnamed Calendar',
            description: cal.description || '',
            primary: !!cal.primary,
            selected: !!cal.selected,
            backgroundColor: cal.backgroundColor,
            foregroundColor: cal.foregroundColor
          }));
        }
        // Message parsing fallback
        else if (data.message || (data.data && data.data.message)) {
          calendarList = parseCalendarsFromMessage(data.message || data.data.message);
        }
        
        console.log('Final parsed calendars:', calendarList);
        setCalendars(calendarList);
        
        // Ensure a sensible default selection if current selection isn't present
        if (calendarList.length > 0) {
          const primaryCal = calendarList.find(c => c.primary);
          const defaultId = primaryCal ? primaryCal.id : calendarList[0].id;
          console.log('Setting default calendar:', defaultId, 'Primary found:', !!primaryCal);
          setSelectedCalendars(prev => {
            const current = prev && prev.length > 0 && calendarList.some(c => c.id === prev[0]) ? prev : [defaultId];
            console.log('Selected calendars updated to:', current);
            return current;
          });
          // Always default to primary calendar for new events
          setNewEvent(prev => ({ ...prev, calendarId: defaultId }));
        }
      } else {
        console.error('Failed to fetch calendars - Status:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch calendars:', error);
    }
  };

  const fetchMCPEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      
      const params = new URLSearchParams({
        calendarId: selectedCalendars[0] || 'primary',
        timeMin: now.toISOString(),
        timeMax: nextMonth.toISOString(),
        timeZone: 'Asia/Kolkata'
      });
      
      const response = await fetch(`${API_URL}/calendar/mcp/events?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Events response:', data);
        // Handle the structured response from endpoints-minimal.js
        let eventList = [];
        if (data.success && data.data && data.data.events) {
          eventList = data.data.events;
        } else if (data.success && data.data && typeof data.data.message === 'string') {
          // Parse from MCP message format
          eventList = parseEventsFromMessage(data.data.message);
        } else if (data.events) {
          eventList = data.events;
        } else if (data.message) {
          eventList = parseEventsFromMessage(data.message);
        }
        
        // Normalize all events to ensure consistent format
        const normalizedEvents = eventList.map(event => normalizeEventData(event)).filter(event => event !== null);
        console.log('Normalized events:', normalizedEvents);
        setGoogleEvents(normalizedEvents);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch Google Calendar events');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
      toast({
        title: "Error",
        description: err.message || 'Failed to load events',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchColors = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/calendar/mcp/colors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setColors(data.data.event || data.data || {});
        } else {
          setColors(data.event || data || {});
        }
      }
    } catch (error) {
      console.error('Failed to fetch colors:', error);
    }
  };

  const searchEvents = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const token = getToken();
      const now = new Date();
      const pastDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      const futureDate = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
      
      const params = new URLSearchParams({
        query: searchQuery,
        calendarId: 'primary',
        timeMin: dateRange.start || pastDate.toISOString(),
        timeMax: dateRange.end || futureDate.toISOString(),
        timeZone: 'Asia/Kolkata'
      });
      
      const response = await fetch(`${API_URL}/calendar/mcp/search?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Search response:', data);
        // Handle the structured response from endpoints-minimal.js
        let eventList = [];
        if (data.success && data.data && data.data.events) {
          eventList = data.data.events;
        } else if (data.success && data.data && typeof data.data.message === 'string') {
          // Parse from MCP message format
          eventList = parseEventsFromMessage(data.data.message);
        } else if (data.events) {
          eventList = data.events;
        } else if (data.message) {
          eventList = parseEventsFromMessage(data.message);
        }
        
        // Normalize all events to ensure consistent format
        const normalizedEvents = eventList.map(event => normalizeEventData(event)).filter(event => event !== null);
        setSearchResults(normalizedEvents);
        
        toast({
          title: "Search Complete",
          description: `Found ${normalizedEvents.length} events matching "${searchQuery}"`
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Search failed');
      }
    } catch (error: any) {
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search events",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const findAvailableSlots = async () => {
    try {
      const token = getToken();
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const response = await fetch(`${API_URL}/calendar/mcp/availability`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          calendars: [selectedCalendars[0] || 'primary'],
          timeMin: now.toISOString(),
          timeMax: tomorrow.toISOString(),
          duration: 60,
          timeZone: 'Asia/Kolkata'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const slots = data.data?.availableSlots || data.availableSlots || [];
        setAvailableSlots(slots);
        toast({
          title: "Availability Found",
          description: `Found ${slots.length} available slots`
        });
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Availability request failed');
      }
    } catch (error: any) {
      toast({
        title: "Availability Check Failed",
        description: error.message || "Failed to find available slots",
        variant: "destructive"
      });
    }
  };

  const createMCPEvent = async () => {
    if (!newEvent.summary || !newEvent.start || !newEvent.end) return;
    
    setAddingEvent(true);
    try {
      const token = getToken();
      
      // Helper function to convert datetime-local value to IST timezone-aware format
      const convertToIST = (datetimeLocal) => {
        if (!datetimeLocal) return datetimeLocal;
        
        // datetime-local gives us YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS in local time
        let formattedDateTime = datetimeLocal.includes(':') && datetimeLocal.split(':').length === 2 
          ? datetimeLocal + ':00' 
          : datetimeLocal;
        
        // Simply append IST timezone offset to treat the time as IST
        // This tells the backend that this time is in IST timezone
        return formattedDateTime + '+05:30';
      };
      
      const eventData = {
        ...newEvent,
        start: convertToIST(newEvent.start),
        end: convertToIST(newEvent.end),
        timeZone: 'Asia/Kolkata'
      };
      
      const response = await fetch(`${API_URL}/calendar/mcp/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Event Created",
          description: data.message || "Your event has been added to Google Calendar"
        });
        setShowAddModal(false);
        resetEventForm();
        fetchMCPEvents();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to create event',
        variant: "destructive"
      });
    } finally {
      setAddingEvent(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/calendar/mcp/events/${eventId}?calendarId=primary`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Event Deleted",
          description: data.message || "The event has been removed from your calendar"
        });
        fetchMCPEvents();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete event');
      }
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete the event",
        variant: "destructive"
      });
    }
  };

  const updateMCPEvent = async () => {
    if (!editingEvent) return;
    
    setAddingEvent(true);
    try {
      const token = getToken();
      
      // Ensure datetime format includes seconds and add IST timezone
      const eventData = {
        calendarId: 'primary',
        summary: newEvent.summary,
        description: newEvent.description,
        start: newEvent.start.includes(':') && newEvent.start.split(':').length === 2 ? newEvent.start + ':00' : newEvent.start,
        end: newEvent.end.includes(':') && newEvent.end.split(':').length === 2 ? newEvent.end + ':00' : newEvent.end,
        location: newEvent.location,
        attendees: newEvent.attendees,
        colorId: newEvent.colorId,
        reminders: newEvent.reminders,
        timeZone: 'Asia/Kolkata'
      };
      
      const response = await fetch(`${API_URL}/calendar/mcp/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Event Updated",
          description: data.message || "Your event has been updated successfully"
        });
        setEditingEvent(null);
        resetEventForm();
        fetchMCPEvents();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to update event',
        variant: "destructive"
      });
    } finally {
      setAddingEvent(false);
    }
  };

  const resetEventForm = () => {
    // Find primary calendar or first available calendar
    const primaryCal = calendars.find(c => c.primary);
    const defaultCalendarId = primaryCal ? primaryCal.id : (calendars.length > 0 ? calendars[0].id : 'primary');
    
    setNewEvent({
      calendarId: defaultCalendarId,
      summary: '',
      description: '',
      start: '',
      end: '',
      location: '',
      attendees: [],
      reminders: { useDefault: true, overrides: [] }
    });
    setAttendeeInput('');
    setCustomReminders([]);
  };

  const fetchEventDetails = async (eventId: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/calendar/mcp/events/${eventId}?calendarId=primary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Detailed event data:', data);
        
        // Handle the structured response
        let eventData = null;
        if (data.success && data.data) {
          eventData = data.data;
        } else if (data.event) {
          eventData = data.event;
        } else {
          eventData = data;
        }
        
        return normalizeEventData(eventData);
      } else {
        console.error('Failed to fetch event details');
        return null;
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      return null;
    }
  };

  const startEditingEvent = async (event: GoogleCalendarEvent) => {
    setEditingEvent(event);
    
    // First try to get detailed event data from backend
    const detailedEvent = await fetchEventDetails(event.id);
    const eventToUse = detailedEvent || event;
    
    // Find primary calendar or use the event's calendar
    const primaryCal = calendars.find(c => c.primary);
    const defaultCalendarId = primaryCal ? primaryCal.id : 'primary';
    
    // Helper function to convert UTC datetime to IST for form display
    const convertUTCToISTForForm = (utcDateTime) => {
      if (!utcDateTime) return '';
      
      try {
        // Create a date object from the UTC datetime
        const utcDate = new Date(utcDateTime);
        
        // Convert to IST by adding 5 hours 30 minutes (330 minutes)
        const istDate = new Date(utcDate.getTime() + (330 * 60 * 1000));
        
        // Format for datetime-local input (YYYY-MM-DDTHH:MM:SS)
        const year = istDate.getUTCFullYear();
        const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(istDate.getUTCDate()).padStart(2, '0');
        const hours = String(istDate.getUTCHours()).padStart(2, '0');
        const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
        const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      } catch (error) {
        console.error('Error converting UTC to IST for form:', error);
        return utcDateTime.slice(0, 19); // Fallback to original format
      }
    };
    
    // Prepare attendees data - ensure we have email addresses
    const eventAttendees = eventToUse.attendees?.map(a => ({ 
      email: a.email || a.displayName || a 
    })).filter(a => a.email) || [];
    
    // Enhanced reminders data processing
    let eventReminders = { useDefault: true, overrides: [] };
    let hasCustomReminders = false;
    
    // Check multiple possible sources for reminders
    if (eventToUse.reminders) {
      eventReminders = eventToUse.reminders;
    } else if (detailedEvent && detailedEvent.reminders) {
      eventReminders = detailedEvent.reminders;
    } else if (event.reminders) {
      eventReminders = event.reminders;
    }
    
    // Determine if there are custom reminders
    hasCustomReminders = !eventReminders.useDefault && 
                        eventReminders.overrides && 
                        eventReminders.overrides.length > 0;
    
    // Debug logging
    console.log('🔍 REMINDER DEBUGGING:');
    console.log('Original event reminders:', event.reminders);
    console.log('Detailed event reminders:', detailedEvent?.reminders);
    console.log('Final event reminders:', eventReminders);
    console.log('Has custom reminders:', hasCustomReminders);
    console.log('Use default:', eventReminders.useDefault);
    console.log('Overrides:', eventReminders.overrides);
    
    // Prepare the reminder state for the form
    const formReminders = {
      useDefault: eventReminders.useDefault !== false, // Default to true if undefined
      overrides: eventReminders.overrides || []
    };
    
    // If we have overrides but useDefault is true, it means we should show custom reminders
    if (eventReminders.overrides && eventReminders.overrides.length > 0) {
      formReminders.useDefault = false;
      hasCustomReminders = true;
    }
    
    console.log('📝 Form reminders will be set to:', formReminders);
    console.log('📝 Custom reminders state will be set to:', eventReminders.overrides || []);
    
    // Debug datetime conversion
    console.log('🕒 DATETIME CONVERSION DEBUG:');
    console.log('Original start:', eventToUse.start.dateTime);
    console.log('Original end:', eventToUse.end.dateTime);
    const convertedStart = convertUTCToISTForForm(eventToUse.start.dateTime);
    const convertedEnd = convertUTCToISTForForm(eventToUse.end.dateTime);
    console.log('Converted start (IST):', convertedStart);
    console.log('Converted end (IST):', convertedEnd);
    
    setNewEvent({
      calendarId: defaultCalendarId,
      summary: eventToUse.summary,
      description: eventToUse.description || '',
      start: convertedStart,
      end: convertedEnd,
      location: eventToUse.location || '',
      attendees: eventAttendees,
      colorId: eventToUse.colorId,
      reminders: formReminders
    });
    
    // Set custom reminders state
    const customRemindersToSet = hasCustomReminders ? (eventReminders.overrides || []) : [];
    setCustomReminders(customRemindersToSet);
    
    console.log('✅ Final states set:');
    console.log('- newEvent.reminders:', formReminders);
    console.log('- customReminders:', customRemindersToSet);
    console.log('- Switch should be:', !formReminders.useDefault);
    
    setShowAddModal(true);
  };

  useEffect(() => {
    fetchMCPCalendars();
    fetchMCPEvents();
    fetchColors();
  }, []);

  const formatEventTime = (event: GoogleCalendarEvent) => {
    try {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      
      // Check if dates are valid
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return {
          date: 'Invalid Date',
          time: 'Invalid Time'
        };
      }
      
      return {
        date: start.toLocaleDateString('en-IN'),
        time: `${start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
      };
    } catch (error) {
      console.error('Error formatting event time:', error, event);
      return {
        date: 'Invalid Date',
        time: 'Invalid Time'
      };
    }
  };

  // Helper functions for attendees
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addAttendee = () => {
    const email = attendeeInput.trim();
    if (!email) {
      toast({
        title: "Empty Email",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }
    
    if (!validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    if (newEvent.attendees.some(a => a.email === email)) {
      toast({
        title: "Duplicate Email",
        description: "This attendee is already added",
        variant: "destructive"
      });
      return;
    }
    
    setNewEvent(prev => ({
      ...prev,
      attendees: [...prev.attendees, { email }]
    }));
    setAttendeeInput('');
    toast({
      title: "Attendee Added",
      description: `${email} has been added to the event`
    });
  };

  const removeAttendee = (emailToRemove: string) => {
    setNewEvent(prev => ({
      ...prev,
      attendees: prev.attendees.filter(a => a.email !== emailToRemove)
    }));
    toast({
      title: "Attendee Removed",
      description: `Attendee has been removed from the event`
    });
  };

  // Helper functions for custom reminders
  const addCustomReminder = (method: string, minutes: number) => {
    const newReminder = { method, minutes };
    console.log('➕ Adding custom reminder:', newReminder);
    
    if (!customReminders.some(r => r.method === method && r.minutes === minutes)) {
      const updatedReminders = [...customReminders, newReminder];
      setCustomReminders(updatedReminders);
      setNewEvent(prev => ({
        ...prev,
        reminders: {
          useDefault: false,
          overrides: updatedReminders
        }
      }));
      console.log('✅ Added reminder. New list:', updatedReminders);
    } else {
      console.log('⚠️ Reminder already exists');
    }
  };

  const removeCustomReminder = (index: number) => {
    console.log('🗑️ Removing reminder at index:', index);
    const updated = customReminders.filter((_, i) => i !== index);
    setCustomReminders(updated);
    setNewEvent(prev => ({
      ...prev,
      reminders: {
        useDefault: updated.length === 0,
        overrides: updated
      }
    }));
    console.log('✅ Removed reminder. New list:', updated);
  };

  const clearSearchResults = () => {
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">MCP Smart Calendar</h1>
          <p className="text-gray-600">Advanced calendar management with Google Calendar integration</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={fetchMCPEvents} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        <Dialog open={showAddModal} onOpenChange={(open) => {
            setShowAddModal(open);
            if (!open && !editingEvent) {
              resetEventForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingEvent(null);
                resetEventForm();
              }}>
                <Plus className="w-4 h-4 mr-2" />
                New Event
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Google Calendar Integration Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-semibold">Google Calendar</h3>
                <p className="text-sm text-gray-600">Sync with your Google Calendar for full integration</p>
              </div>
            </div>
            <GoogleCalendarIntegration />
          </div>
        </CardContent>
      </Card>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="w-5 h-5" />
            <span>Available Features</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm">Create Events</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm">Edit Events</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm">Delete Events</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm">Search Events</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm">Multi-Calendar</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm">Availability Check</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm">Smart Scheduling</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm">Event Colors</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm">Attendee Management</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm">Custom Reminders</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm">Location Support</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm">AI Integration</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Calendar Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="calendars">Calendars</TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex items-center space-x-4 mb-6">
            <Select
              value={selectedCalendars[0] || ''}
              onValueChange={(value) => {
                console.log('Calendar dropdown changed to:', value);
                setSelectedCalendars([value]);
              }}
            >
              <SelectTrigger className="w-80 h-11 text-gray-900 bg-white border border-gray-300 shadow-sm">
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <SelectValue placeholder="Select Calendar">
                      {selectedCalendars[0] && calendars.length > 0 && (() => {
                        const selectedCal = calendars.find(c => c.id === selectedCalendars[0]);
                        if (selectedCal) {
                          return (
                            <div className="flex flex-col items-start">
                              <span className="text-sm font-medium text-gray-900 truncate max-w-72">
                                {selectedCal.summary}
                              </span>
                              {selectedCal.primary && (
                                <span className="text-xs text-blue-600">Primary</span>
                              )}
                            </div>
                          );
                        }
                        return "Select Calendar";
                      })()}
                    </SelectValue>
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-50 max-h-72 overflow-auto w-96">
                {calendars.length === 0 ? (
                  <div className="px-3 py-2 text-gray-500 text-sm">No calendars available</div>
                ) : (
                  calendars.map((calendar) => {
                    console.log('Rendering calendar option:', calendar.id, calendar.summary);
                    return (
                      <div
                        key={calendar.id}
                        className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100 cursor-pointer px-3 py-3 min-h-[3rem] border-0 outline-0"
                        onClick={() => {
                          console.log('Calendar dropdown changed to:', calendar.id);
                          setSelectedCalendars([calendar.id]);
                        }}
                      >
                        <div className="flex flex-col items-start w-full">
                          <span className="font-medium text-gray-900 text-sm leading-tight truncate max-w-80">
                            {calendar.summary}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            {calendar.primary && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                Primary
                              </span>
                            )}
                            {calendar.backgroundColor && (
                              <div 
                                className="w-3 h-3 rounded-full border border-gray-300" 
                                style={{ backgroundColor: calendar.backgroundColor }}
                                title={`Calendar color: ${calendar.backgroundColor}`}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={findAvailableSlots}>
              <Clock className="w-4 h-4 mr-2" />
              Find Free Time
            </Button>
          </div>

          {/* Events List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Loading events...</p>
              </div>
            ) : googleEvents.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No events found</h3>
                  <p className="text-gray-600">Create your first event or connect your Google Calendar</p>
                </CardContent>
              </Card>
            ) : (
              googleEvents.map((event) => {
                const { date, time } = formatEventTime(event);
                return (
                  <Card key={event.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-lg">{event.summary}</h3>
                            {event.colorId && colors[event.colorId] && (
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: colors[event.colorId].background }}
                              />
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{date} • {time}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span>{event.location}</span>
                              </div>
                            )}
                            {event.attendees && event.attendees.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <Users className="w-4 h-4" />
                                <span>{event.attendees.length} attendees</span>
                              </div>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-gray-700 text-sm">{event.description}</p>
                          )}
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="mt-3">
                              <div className="flex flex-wrap gap-2">
                                {event.attendees.slice(0, 3).map((attendee, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {attendee.displayName || attendee.email}
                                    {attendee.responseStatus === 'accepted' && <CheckCircle2 className="w-3 h-3 ml-1" />}
                                    {attendee.responseStatus === 'declined' && <AlertCircle className="w-3 h-3 ml-1" />}
                                  </Badge>
                                ))}
                                {event.attendees.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{event.attendees.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={event.htmlLink} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => startEditingEvent(event)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteEvent(event.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      searchEvents();
                    }
                  }}
                />
                <Button onClick={searchEvents} disabled={isSearching}>
                  <Search className={`w-4 h-4 mr-2 ${isSearching ? 'animate-spin' : ''}`} />
                  Search
                </Button>
                {searchResults.length > 0 && (
                  <Button variant="outline" onClick={clearSearchResults}>
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="datetime-local"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="datetime-local"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
              {searchResults.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Search className="w-5 h-5" />
                      <span>Search Results</span>
                      <Badge variant="secondary" className="ml-2">
                        {searchResults.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {searchResults.map((event) => {
                        const { date, time } = formatEventTime(event);
                        return (
                          <Card key={event.id} className="hover:shadow-md transition-shadow border-l-4 border-blue-400">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <h3 className="font-semibold text-lg">{event.summary}</h3>
                                    {event.colorId && colors[event.colorId] && (
                                      <div 
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: colors[event.colorId].background }}
                                      />
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                                    <div className="flex items-center space-x-1">
                                      <Clock className="w-4 h-4" />
                                      <span>{date} • {time}</span>
                                    </div>
                                    {event.location && (
                                      <div className="flex items-center space-x-1">
                                        <MapPin className="w-4 h-4" />
                                        <span>{event.location}</span>
                                      </div>
                                    )}
                                    {event.attendees && event.attendees.length > 0 && (
                                      <div className="flex items-center space-x-1">
                                        <Users className="w-4 h-4" />
                                        <span>{event.attendees.length} attendees</span>
                                      </div>
                                    )}
                                  </div>
                                  {event.description && (
                                    <p className="text-gray-700 text-sm">{event.description}</p>
                                  )}
                                </div>
                                <div className="flex space-x-2">
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={event.htmlLink} target="_blank" rel="noopener noreferrer">
                                      <Eye className="w-4 h-4" />
                                    </a>
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => startEditingEvent(event)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => deleteEvent(event.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability Tab */}
        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Time Slots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={findAvailableSlots} className="w-full">
                  <Clock className="w-4 h-4 mr-2" />
                  Find Available Slots (Next 24 Hours)
                </Button>
                {availableSlots.length > 0 && (
                  <div className="space-y-2">
                    {availableSlots.slice(0, 10).map((slot, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-sm">
                          {new Date(slot.start).toLocaleString('en-IN')} - {new Date(slot.end).toLocaleTimeString('en-IN')}
                        </span>
                        <Button size="sm" onClick={() => {
                          setNewEvent(prev => ({
                            ...prev,
                            start: slot.start.slice(0, 19),
                            end: slot.end.slice(0, 19)
                          }));
                          setShowAddModal(true);
                        }}>
                          Schedule
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendars Tab */}
        <TabsContent value="calendars" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Calendars</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {calendars.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <p>No calendars found. Please connect your Google Calendar.</p>
                  </div>
                ) : (
                  calendars.map((calendar) => (
                    <div key={calendar.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-gray-900 text-base">
                            {calendar.summary}
                          </h4>
                          {calendar.backgroundColor && (
                            <div 
                              className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" 
                              style={{ backgroundColor: calendar.backgroundColor }}
                              title={`Calendar color: ${calendar.backgroundColor}`}
                            />
                          )}
                        </div>
                        {calendar.description && (
                          <p className="text-sm text-gray-600 mt-1">{calendar.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {calendar.primary && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">Primary Calendar</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Switch
                          checked={selectedCalendars.includes(calendar.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCalendars(prev => [...prev, calendar.id]);
                            } else {
                              setSelectedCalendars(prev => prev.filter(id => id !== calendar.id));
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Event Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={newEvent.summary}
                onChange={(e) => setNewEvent(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Event title"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={newEvent.start}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={newEvent.end}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Event description..."
              />
            </div>

            <div>
              <Label>Location</Label>
              <Input
                value={newEvent.location}
                onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Event location"
              />
            </div>

            <div>
              <Label>Calendar</Label>
              <Select
                value={newEvent.calendarId}
                onValueChange={(value) => setNewEvent(prev => ({ ...prev, calendarId: value }))}
              >
                <SelectTrigger className="text-gray-900 bg-white border-gray-300">
                  <SelectValue className="text-gray-900" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {calendars.map((calendar) => (
                    <SelectItem 
                      key={calendar.id} 
                      value={calendar.id}
                      className="text-black py-3 [&>span[data-radix-select-item-indicator]]:hidden"
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: calendar.backgroundColor || '#4285f4' }}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{calendar.summary}</span>
                          {calendar.primary && (
                            <span className="text-xs text-gray-500 ml-4">Primary</span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Attendees Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-900">Attendees</Label>
              <div className="flex space-x-2">
                <Input
                  value={attendeeInput}
                  onChange={(e) => setAttendeeInput(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAttendee();
                    }
                  }}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addAttendee}
                  className="px-3"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {newEvent.attendees.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                  <Users className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">No attendees added yet</p>
                  <p className="text-xs text-gray-400 mt-1">Add email addresses to invite people</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">
                      {newEvent.attendees.length} attendee{newEvent.attendees.length !== 1 ? 's' : ''} invited
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-lg bg-white">
                    <div className="max-h-40 overflow-y-auto">
                      {newEvent.attendees.map((attendee, index) => (
                        <div 
                          key={index} 
                          className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${
                            index !== newEvent.attendees.length - 1 ? 'border-b border-gray-100' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {attendee.email || 'No email'}
                              </span>
                              {attendee.displayName && attendee.displayName !== attendee.email && (
                                <span className="text-xs text-gray-500 truncate">
                                  {attendee.displayName}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttendee(attendee.email)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                          >
                            <span className="text-lg">×</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Reminders Section */}
            <div className="space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-blue-600" />
                <Label className="text-sm font-medium text-gray-900">Reminders</Label>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={!newEvent.reminders?.useDefault}
                    onCheckedChange={(checked) => {
                      console.log('🔄 Switch toggled to:', checked);
                      console.log('Current state:', { useDefault: newEvent.reminders?.useDefault, customReminders });
                      
                      if (!checked) {
                        // Switch to default reminders
                        setCustomReminders([]);
                        setNewEvent(prev => ({
                          ...prev,
                          reminders: { useDefault: true, overrides: [] }
                        }));
                        console.log('✅ Switched to default reminders');
                      } else {
                        // Switch to custom reminders
                        const existingReminders = customReminders.length > 0 ? customReminders : [{ method: 'popup', minutes: 15 }];
                        setCustomReminders(existingReminders);
                        setNewEvent(prev => ({
                          ...prev,
                          reminders: { useDefault: false, overrides: existingReminders }
                        }));
                        console.log('✅ Switched to custom reminders:', existingReminders);
                      }
                    }}
                  />
                  <div className="flex flex-col">
                    <Label className="text-sm font-medium text-gray-900">
                      Set custom reminders for this event
                    </Label>
                    <span className="text-xs text-gray-500">
                      {newEvent.reminders?.useDefault ? 
                        'Using your default calendar reminder settings' : 
                        `Custom reminders active (${customReminders.length})`
                      }
                    </span>
                  </div>
                </div>
                
                {!newEvent.reminders?.useDefault && (
                  <div className="space-y-4 bg-white p-3 rounded border">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Timing</Label>
                        <Select onValueChange={(value) => {
                          const minutes = parseInt(value);
                          addCustomReminder('popup', minutes);
                        }}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Add reminder" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">At event time</SelectItem>
                            <SelectItem value="5">5 minutes before</SelectItem>
                            <SelectItem value="10">10 minutes before</SelectItem>
                            <SelectItem value="15">15 minutes before</SelectItem>
                            <SelectItem value="30">30 minutes before</SelectItem>
                            <SelectItem value="60">1 hour before</SelectItem>
                            <SelectItem value="120">2 hours before</SelectItem>
                            <SelectItem value="1440">1 day before</SelectItem>
                            <SelectItem value="2880">2 days before</SelectItem>
                            <SelectItem value="10080">1 week before</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Method</Label>
                        <Select onValueChange={(method) => {
                          if (customReminders.length > 0) {
                            const lastReminder = customReminders[customReminders.length - 1];
                            const updatedReminders = [...customReminders.slice(0, -1), 
                              { ...lastReminder, method }];
                            setCustomReminders(updatedReminders);
                            setNewEvent(prev => ({
                              ...prev,
                              reminders: { useDefault: false, overrides: updatedReminders }
                            }));
                          }
                        }}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Notification" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="popup">Popup notification</SelectItem>
                            <SelectItem value="email">Email notification</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {customReminders.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-blue-700">Active Reminders:</Label>
                        <div className="space-y-2">
                          {customReminders.map((reminder, index) => (
                            <div key={index} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                              <div className="flex items-center space-x-2">
                                <Bell className="w-4 h-4 text-blue-500" />
                                <span className="text-sm text-blue-800 font-medium">
                                  {reminder.minutes === 0 ? 'At event time' : 
                                   reminder.minutes === 1440 ? '1 day before' :
                                   reminder.minutes === 2880 ? '2 days before' :
                                   reminder.minutes === 10080 ? '1 week before' :
                                   reminder.minutes >= 60 ? `${Math.floor(reminder.minutes / 60)}h ${reminder.minutes % 60}m before` :
                                   `${reminder.minutes} min before`}
                                  • {reminder.method}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCustomReminder(index)}
                                className="h-6 w-6 p-0 hover:bg-red-100 text-red-600 hover:text-red-700"
                              >
                                <span className="text-sm">×</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button 
                onClick={editingEvent ? updateMCPEvent : createMCPEvent} 
                disabled={addingEvent} 
                className="flex-1"
              >
                {addingEvent ? (editingEvent ? 'Updating...' : 'Creating...') : (editingEvent ? 'Update Event' : 'Create Event')}
              </Button>
              <Button variant="outline" onClick={() => {
                setShowAddModal(false);
                setEditingEvent(null);
                resetEventForm();
              }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MCPCalendar;
