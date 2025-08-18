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

  // MCP Calendar API Functions
  const fetchMCPCalendars = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/calendar/mcp/calendars`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCalendars(data.items || []);
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
        calendarId: selectedCalendars.join(','),
        timeMin: now.toISOString().slice(0, 19),
        timeMax: nextMonth.toISOString().slice(0, 19),
        timeZone: 'Asia/Kolkata'
      });
      
      const response = await fetch(`${API_URL}/calendar/mcp/events?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGoogleEvents(data.items || []);
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
        setColors(data.event || {});
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
      
      const response = await fetch(`${API_URL}/calendar/mcp/search?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGoogleEvents(data.items || []);
        toast({
          title: "Search Complete",
          description: `Found ${data.items?.length || 0} events`
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
      const response = await fetch(`${API_URL}/calendar/mcp/events`, {
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
      const response = await fetch(`${API_URL}/calendar/mcp/events/${eventId}?calendarId=primary`, {
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

      {/* Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
          
          {events.map((event) => (
            <Card key={event.id} className={`p-4 border-l-4 ${getEventColor(event.type)}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getEventIcon(event.type)}
                  <div>
                    <h3 className="font-medium text-gray-900">{event.title}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(event.date).toLocaleDateString()} at {event.time}
                    </p>
                    <span className="inline-block mt-1 px-2 py-1 text-xs bg-white rounded-full capitalize">
                      {event.type}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
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
            <h3 className="font-semibold mb-3">This Week</h3>
            <div className="space-y-2">
              {events.slice(0, 3).map((event) => (
                <div key={event.id} className="flex items-center space-x-2 text-sm">
                  {getEventIcon(event.type)}
                  <span className="truncate">{event.title}</span>
                </div>
              ))}
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
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter event title"
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={newEvent.type}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, type: e.target.value as Event['type'] }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="personal">Personal</option>
                  <option value="class">Class</option>
                  <option value="exam">Exam</option>
                  <option value="assignment">Assignment</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <Button onClick={addEvent} className="flex-1">Add Event</Button>
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
