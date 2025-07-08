import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Clock, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'exam' | 'assignment' | 'class' | 'personal';
}

interface NewEvent {
  title: string;
  date: string;
  time: string;
  type: Event['type'];
}

const API_URL = 'http://localhost:4000';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : '');

const Calendar: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState<NewEvent>({ title: '', date: '', time: '', type: 'personal' });
  const [addingEvent, setAddingEvent] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/calendar/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const data = await res.json();
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const addEvent = async () => {
    if (newEvent.title && newEvent.date && newEvent.time) {
      setAddingEvent(true);
      try {
        const token = getToken();
        const res = await fetch(`${API_URL}/calendar/events`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newEvent),
        });
        
        if (!res.ok) {
          throw new Error('Failed to add event');
        }
        
        const addedEvent = await res.json();
        setEvents(prev => [...prev, addedEvent]);
        setNewEvent({ title: '', date: '', time: '', type: 'personal' });
        setShowAddModal(false);
      } catch (err: any) {
        alert(`Error adding event: ${err.message}`);
      } finally {
        setAddingEvent(false);
      }
    }
  };

  useEffect(() => {
    fetchEvents();
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
          <Button variant="outline">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Connect Google Calendar
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          Sync your academic schedule with Google Calendar for seamless planning.
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
