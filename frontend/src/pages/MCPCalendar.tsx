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
  const [editingEvent, setEditingEvent] = useState<GoogleCalendarEvent | null>(null);
  const [addingEvent, setAddingEvent] = useState(false);
  
  const { toast } = useToast();

  // Calendar API Functions using new endpoints
  const fetchMCPCalendars = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/calendar/mcp/calendars`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Calendars response:', data);
        // Handle multiple MCP response formats
        let calendarsArray = [];
        if (data.calendars && Array.isArray(data.calendars)) {
          // Direct structured response from MCP
          calendarsArray = data.calendars;
        } else if (data.data && Array.isArray(data.data)) {
          // Backend wrapped response
          calendarsArray = data.data;
        } else if (data.items && Array.isArray(data.items)) {
          // Google Calendar API format
          calendarsArray = data.items;
        } else if (data.message && typeof data.message === 'string') {
          // Parse text-based calendar list from MCP
          calendarsArray = parseCalendarsFromMessage(data.message);
        } else {
          console.log('Unexpected calendar response format:', data);
          console.log('Available keys:', Object.keys(data));
        }
        console.log('Parsed calendars:', calendarsArray.length);
        setCalendars(calendarsArray);
      } else {
        console.error('Failed to fetch calendars:', response.statusText);
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
        calendarId: selectedCalendars.length > 1 ? JSON.stringify(selectedCalendars) : selectedCalendars[0],
        timeMin: now.toISOString().slice(0, 19),
        timeMax: nextMonth.toISOString().slice(0, 19),
        timeZone: 'Asia/Kolkata'
      });
      
      const response = await fetch(`${API_URL}/calendar/mcp/events?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Events response:', data);
        // Handle multiple MCP response formats
        let eventsArray = [];
        if (data.events && Array.isArray(data.events)) {
          // Direct structured response from MCP
          eventsArray = data.events;
        } else if (data.data && Array.isArray(data.data)) {
          // Backend wrapped response
          eventsArray = data.data;
        } else if (data.items && Array.isArray(data.items)) {
          // Google Calendar API format
          eventsArray = data.items;
        } else if (data.message && typeof data.message === 'string') {
          // Parse text-based events list from MCP
          eventsArray = parseEventsFromMessage(data.message);
        } else {
          console.log('Unexpected events response format:', data);
          console.log('Available keys:', Object.keys(data));
        }
        console.log('Parsed events:', eventsArray.length);
        setGoogleEvents(eventsArray);
      } else {
        throw new Error('Failed to fetch Google Calendar events');
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
        setColors(data.event || data.data?.event || {});
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
      
      const response = await fetch(`${API_URL}/calendar/mcp/search?query=${encodeURIComponent(searchQuery)}&${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Search response:', data);
        // Handle multiple MCP response formats for search
        let eventsArray = [];
        if (data.events && Array.isArray(data.events)) {
          // Direct structured response from MCP
          eventsArray = data.events;
        } else if (data.data && Array.isArray(data.data)) {
          // Backend wrapped response
          eventsArray = data.data;
        } else if (data.items && Array.isArray(data.items)) {
          // Google Calendar API format
          eventsArray = data.items;
        } else if (data.message && typeof data.message === 'string') {
          eventsArray = parseEventsFromMessage(data.message);
        } else {
          console.log('Unexpected search response format:', data);
          console.log('Available keys:', Object.keys(data));
        }
        console.log('Search results:', eventsArray.length);
        setGoogleEvents(eventsArray);
        toast({
          title: "Search Complete",
          description: `Found ${eventsArray.length} events`
        });
      }
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Failed to search events",
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
          timeZone: 'Asia/Kolkata'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const slots = data.availableSlots || data.data?.availableSlots || [];
        setAvailableSlots(slots);
        toast({
          title: "Availability Found",
          description: `Found ${slots.length} available slots`
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
      const response = await fetch(`${API_URL}/calendar/mcp/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newEvent)
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Event Created",
          description: data.message || "Your event has been added to Google Calendar"
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
      const response = await fetch(`${API_URL}/calendar/mcp/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          calendarId: 'primary',
          summary: newEvent.summary,
          description: newEvent.description,
          start: newEvent.start,
          end: newEvent.end,
          location: newEvent.location,
          attendees: newEvent.attendees,
          colorId: newEvent.colorId,
          reminders: newEvent.reminders
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Event Updated",
          description: data.message || "Your event has been updated successfully"
        });
        setEditingEvent(null);
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

  const startEditingEvent = (event: GoogleCalendarEvent) => {
    setEditingEvent(event);
    setNewEvent({
      calendarId: 'primary',
      summary: event.summary,
      description: event.description || '',
      start: event.start.dateTime.slice(0, 19),
      end: event.end.dateTime.slice(0, 19),
      location: event.location || '',
      attendees: event.attendees?.map(a => ({ email: a.email })) || [],
      colorId: event.colorId,
      reminders: { useDefault: true, overrides: [] }
    });
    setShowAddModal(true);
  };

  useEffect(() => {
    fetchMCPCalendars();
    fetchMCPEvents();
    fetchColors();
  }, []);

  const formatEventTime = (event: GoogleCalendarEvent) => {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    return {
      date: start.toLocaleDateString('en-IN'),
      time: `${start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
    };
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
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button>
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
              value={selectedCalendars[0]}
              onValueChange={(value) => setSelectedCalendars([value])}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Calendar" />
              </SelectTrigger>
              <SelectContent>
                {calendars.map((calendar) => (
                  <SelectItem key={calendar.id} value={calendar.id}>
                    {calendar.summary}
                  </SelectItem>
                ))}
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
                />
                <Button onClick={searchEvents} disabled={isSearching}>
                  <Search className={`w-4 h-4 mr-2 ${isSearching ? 'animate-spin' : ''}`} />
                  Search
                </Button>
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
                {calendars.map((calendar) => (
                  <div key={calendar.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{calendar.summary}</h4>
                      {calendar.description && (
                        <p className="text-sm text-gray-600">{calendar.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {calendar.primary && <Badge>Primary</Badge>}
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
                ))}
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((calendar) => (
                    <SelectItem key={calendar.id} value={calendar.id}>
                      {calendar.summary}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={!newEvent.reminders?.useDefault}
                onCheckedChange={(checked) => 
                  setNewEvent(prev => ({
                    ...prev,
                    reminders: {
                      useDefault: !checked,
                      overrides: checked ? [{ method: 'popup', minutes: 15 }] : []
                    }
                  }))
                }
              />
              <Label>Custom reminders (15 min before)</Label>
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
