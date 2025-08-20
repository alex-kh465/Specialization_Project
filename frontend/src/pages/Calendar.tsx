import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  BookOpen, 
  AlertCircle, 
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
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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

const Calendar: React.FC = () => {
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
  const [editingEvent, setEditingEvent] = useState<GoogleCalendarEvent | null>(null);
  const [addingEvent, setAddingEvent] = useState(false);
  
  const { toast } = useToast();

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
              try {
                return new Date(cleanStr).toISOString();
              } catch (e) {
                console.warn('Failed to parse date:', dateStr);
                return new Date().toISOString(); // fallback
              }
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
  
  // Helper function to normalize event data to ensure consistent format
  const normalizeEventData = (event: any): GoogleCalendarEvent => {
    // Handle different event formats from various sources
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
        // Handle all-day events
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
        // Handle all-day events
        normalized.end.dateTime = new Date(event.end.date + 'T23:59:59').toISOString();
      }
    }
    
    // Ensure valid dates
    if (!normalized.start.dateTime || isNaN(new Date(normalized.start.dateTime).getTime())) {
      normalized.start.dateTime = new Date().toISOString();
    }
    if (!normalized.end.dateTime || isNaN(new Date(normalized.end.dateTime).getTime())) {
      normalized.end.dateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour later
    }
    
    return normalized;
  };

  // MCP Calendar API Functions
  const fetchMCPCalendars = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/calendar/calendars`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Calendars API response:', data);
        // Handle the structured response from endpoints-minimal.js
        if (data.success && data.data) {
          // Handle both structured and MCP raw response
          let calendarList = [];
          if (data.data.calendars && Array.isArray(data.data.calendars)) {
            calendarList = data.data.calendars;
          } else if (data.data.message && typeof data.data.message === 'string') {
            // Parse from MCP message format
            calendarList = parseCalendarsFromMessage(data.data.message);
          }
          setCalendars(calendarList);
        } else if (data.calendars) {
          setCalendars(data.calendars);
        }
      } else {
        console.error('Failed to fetch calendars - Status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch calendars:', error);
    }
  };
  
  // Helper function to parse calendars from MCP message format
  const parseCalendarsFromMessage = (message: string): Calendar[] => {
    const calendars: Calendar[] = [];
    const blocks = message.split('\n\n').filter(block => block.trim());
    
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
  };

  const fetchMCPEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      
      const params = new URLSearchParams({
        calendarId: selectedCalendars[0] || 'primary', // Use first selected calendar
        timeMin: now.toISOString(),
        timeMax: nextMonth.toISOString(),
        timeZone: 'Asia/Kolkata'
      });
      
      const response = await fetch(`${API_URL}/calendar/events?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Events API response:', data);
        // Handle the structured response from endpoints-minimal.js
        let eventList = [];
        if (data.success && data.data) {
          // Handle both structured and MCP raw response
          if (data.data.events && Array.isArray(data.data.events)) {
            eventList = data.data.events;
          } else if (data.data.message && typeof data.data.message === 'string') {
            // Parse from MCP message format
            eventList = parseEventsFromMessage(data.data.message);
          }
        } else if (data.events) {
          eventList = data.events;
        }
        
        // Normalize event data to ensure proper format
        const normalizedEvents = eventList.map(event => normalizeEventData(event));
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
      const response = await fetch(`${API_URL}/calendar/colors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Colors API response:', data);
        // Handle the structured response from endpoints-minimal.js
        if (data.success && data.data) {
          setColors(data.data.colors?.event || data.data.event || {});
        } else {
          setColors(data.event || {});
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
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      
      const params = new URLSearchParams({
        calendarId: 'primary',
        query: searchQuery,
        timeMin: dateRange.start || now.toISOString().slice(0, 19),
        timeMax: dateRange.end || nextMonth.toISOString().slice(0, 19),
        timeZone: 'Asia/Kolkata'
      });
      
      const response = await fetch(`${API_URL}/calendar/events/search?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Search API response:', data);
        // Handle the structured response from endpoints-minimal.js
        let eventList = [];
        if (data.success && data.data) {
          // Handle both structured and MCP raw response
          if (data.data.events && Array.isArray(data.data.events)) {
            eventList = data.data.events;
          } else if (data.data.message && typeof data.data.message === 'string') {
            // Parse from MCP message format
            eventList = parseEventsFromMessage(data.data.message);
          }
        } else if (data.events) {
          eventList = data.events;
        }
        
        // Normalize event data to ensure proper format
        const normalizedEvents = eventList.map(event => normalizeEventData(event));
        setGoogleEvents(normalizedEvents);
        
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
          calendars: selectedCalendars,
          timeMin: now.toISOString().slice(0, 19),
          timeMax: tomorrow.toISOString().slice(0, 19),
          duration: 60,
          timeZone: 'Asia/Kolkata'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.availableSlots || []);
        toast({
          title: "Availability Found",
          description: `Found ${data.availableSlots?.length || 0} available slots`
        });
      }
    } catch (error) {
      toast({
        title: "Availability Check Failed",
        description: "Failed to find available slots",
        variant: "destructive"
      });
    }
  };

  const createMCPEvent = async () => {
    if (!newEvent.summary || !newEvent.start || !newEvent.end) return;
    
    setAddingEvent(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/calendar/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newEvent)
      });
      
      if (response.ok) {
        toast({
          title: "Event Created",
          description: "Your event has been added to Google Calendar"
        });
        setShowAddModal(false);
        setNewEvent({
          calendarId: 'primary',
          summary: '',
          description: '',
          start: '',
          end: '',
          location: '',
          attendees: [],
          reminders: { useDefault: true, overrides: [] }
        });
        fetchMCPEvents();
      } else {
        throw new Error('Failed to create event');
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
      const response = await fetch(`${API_URL}/calendar/events/${eventId}?calendarId=primary`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast({
          title: "Event Deleted",
          description: "The event has been removed from your calendar"
        });
        fetchMCPEvents();
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the event",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchMCPCalendars();
    fetchMCPEvents();
    fetchColors();
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'exam': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'assignment': return <BookOpen className="w-4 h-4 text-orange-500" />;
      case 'class': return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <CalendarIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'exam': return 'border-l-red-500 bg-red-50';
      case 'assignment': return 'border-l-orange-500 bg-orange-50';
      case 'class': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Calendar</h1>
          <p className="text-gray-600">Manage your academic schedule with AI assistance</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Calendar Integration */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Google Calendar Sync</h2>
          <GoogleCalendarIntegration />
        </div>
        <p className="text-sm text-gray-600">
          Sync your academic schedule with Google Calendar for seamless planning and AI-powered event creation through chat.
        </p>
      </Card>

      {/* Calendar Status and Debug Info */}
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Calendar Status</h3>
            <p className="text-xs text-gray-600">
              {loading ? 'Loading...' : error ? `Error: ${error}` : `${googleEvents.length} events found, ${calendars.length} calendars`}
            </p>
          </div>
          <Button size="sm" onClick={fetchMCPEvents} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </Card>

      {/* Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
          
          {loading ? (
            <Card className="p-6 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading events...</p>
            </Card>
          ) : error ? (
            <Card className="p-6 text-center border-red-200 bg-red-50">
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-red-700">{error}</p>
              <Button size="sm" onClick={fetchMCPEvents} className="mt-2">Retry</Button>
            </Card>
          ) : googleEvents.length === 0 ? (
            <Card className="p-6 text-center">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600 mb-4">Create your first event or check your calendar sync.</p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </Card>
          ) : (
            googleEvents.map((event) => (
              <Card key={event.id} className={`p-4 border-l-4 border-l-blue-500 bg-blue-50`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <CalendarIcon className="w-4 h-4 text-blue-500 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{event.summary}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(event.start.dateTime).toLocaleString('en-IN', { 
                          timeZone: 'Asia/Kolkata',
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </p>
                      {event.location && (
                        <p className="text-xs text-gray-500 flex items-center mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {event.location}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-xs text-gray-600 mt-1">{event.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" onClick={() => setEditingEvent(event)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteEvent(event.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Mini Calendar */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Quick Add</h3>
            <div className="space-y-3">
              <Input placeholder="Add using natural language..." />
              <p className="text-xs text-gray-500">
                Try: "Math exam next Friday at 2pm" or "Assignment due tomorrow"
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Upcoming Events</h3>
            <div className="space-y-2">
              {googleEvents.slice(0, 3).map((event) => (
                <div key={event.id} className="flex items-center space-x-2 text-sm">
                  <CalendarIcon className="w-4 h-4 text-gray-500" />
                  <span className="truncate">{event.summary}</span>
                </div>
              ))}
              {googleEvents.length === 0 && (
                <p className="text-xs text-gray-500">No upcoming events</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add New Event</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={newEvent.summary}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Enter event title"
                />
              </div>
              <div>
                <Label htmlFor="start">Start Date & Time</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={newEvent.start}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, start: e.target.value + ':00' }))}
                />
              </div>
              <div>
                <Label htmlFor="end">End Date & Time</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={newEvent.end}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, end: e.target.value + ':00' }))}
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Event description"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Event location"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <Button onClick={createMCPEvent} disabled={addingEvent} className="flex-1">
                {addingEvent ? 'Creating...' : 'Add Event'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Calendar;
