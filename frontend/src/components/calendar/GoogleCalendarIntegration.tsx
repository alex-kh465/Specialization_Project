import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarIcon, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = 'http://localhost:4000';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : '');

// Storage keys for persistent state
const CALENDAR_CONNECTION_KEY = 'google_calendar_connected';
const CALENDAR_CONNECTION_TIMESTAMP_KEY = 'google_calendar_connected_timestamp';
const CONNECTION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

const GoogleCalendarIntegration: React.FC = () => {
  const [isConnected, setIsConnected] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(CALENDAR_CONNECTION_KEY);
      const timestamp = localStorage.getItem(CALENDAR_CONNECTION_TIMESTAMP_KEY);
      
      if (cached && timestamp) {
        const cacheTime = parseInt(timestamp, 10);
        const now = Date.now();
        
        // Use cached value if it's still valid
        if (now - cacheTime < CONNECTION_CACHE_DURATION) {
          return cached === 'true';
        }
      }
    }
    return false;
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Helper function to update connection state with persistence
  const updateConnectionState = (connected: boolean) => {
    setIsConnected(connected);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CALENDAR_CONNECTION_KEY, connected.toString());
      localStorage.setItem(CALENDAR_CONNECTION_TIMESTAMP_KEY, Date.now().toString());
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = getToken();
      console.log('Checking auth status...');
      
      // Use working calendar status endpoint for status check
      const response = await fetch(`${API_URL}/calendar/mcp/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Calendar health check response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Calendar health data received:', data);
        
        const connected = data.mcpConnected;
        
        console.log('Connection status determined:', connected);
        
        if (connected) {
          updateConnectionState(true);
          console.log('Calendar connection confirmed - updating UI state');
        } else {
          console.log('Calendar service not healthy, treating as disconnected');
          updateConnectionState(false);
        }
      } else {
        // Try fallback with calendars endpoint
        console.log('Status endpoint failed, trying calendars fallback...');
        const fallbackResponse = await fetch(`${API_URL}/calendar/mcp/calendars`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const connected = fallbackData.message && fallbackData.message.includes('calendar');
          updateConnectionState(connected);
        } else {
          updateConnectionState(false);
        }
      }
    } catch (error) {
      console.error('Error checking calendar auth status:', error);
      updateConnectionState(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const token = getToken();
      
      // Use the new setup-auth endpoint
      toast({
        title: "Setting up Calendar",
        description: "Starting the calendar authentication process. This may take a moment...",
      });
      
      const setupResponse = await fetch(`${API_URL}/calendar/mcp/setup-auth`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const setupData = await setupResponse.json();
      
      if (setupResponse.ok && setupData.success) {
        // Authentication successful
        console.log('Setup successful, calendars data:', setupData.calendars);
        const connected = setupData.calendars && (setupData.calendars.items || setupData.calendars.calendars);
        updateConnectionState(!!connected);
        
        // Force an immediate UI update and then verify with server
        toast({
          title: "🎉 Calendar Connected!",
          description: "Your Google Calendar is now connected and ready to use!",
          duration: 5000,
        });
        
        // Re-check status after a short delay to ensure UI updates
        setTimeout(async () => {
          console.log('Performing delayed auth status check...');
          await checkAuthStatus();
        }, 1500);
      } else {
        // Authentication required or failed
        updateConnectionState(false);
        
        if (setupData.setupRequired) {
          toast({
            title: "Calendar Setup Required",
            description: setupData.message || "Please complete the authentication process. Check your terminal for the authentication URL.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Setup Failed",
            description: setupData.message || "Failed to set up calendar integration.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error('Error connecting calendar:', error);
      updateConnectionState(false);
      
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Google Calendar. Please check your setup and try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Clear persistent state
      updateConnectionState(false);
      
      // In a real implementation, you would call an API endpoint to revoke tokens
      // For now, we'll just clear the local state
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CALENDAR_CONNECTION_KEY);
        localStorage.removeItem(CALENDAR_CONNECTION_TIMESTAMP_KEY);
      }
      
      toast({
        title: "Calendar Disconnected",
        description: "Your Google Calendar has been disconnected.",
      });
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
    }
  };

  if (loading) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Connected</span>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleDisconnect}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleConnect}
      disabled={isConnecting}
    >
      {isConnecting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <CalendarIcon className="w-4 h-4 mr-2" />
          Connect Google Calendar
        </>
      )}
    </Button>
  );
};

export default GoogleCalendarIntegration;
