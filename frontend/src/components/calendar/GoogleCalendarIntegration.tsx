import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarIcon, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = 'http://localhost:4000';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : '');

const GoogleCalendarIntegration: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = getToken();
      // Try to fetch calendars to check if MCP Calendar is working
      const response = await fetch(`${API_URL}/calendar/mcp/calendars`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.items && data.items.length > 0);
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error checking MCP auth status:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // For MCP Calendar, we'll trigger a simple calendar fetch which should trigger OAuth flow
      toast({
        title: "Connecting to Google Calendar",
        description: "This will trigger the MCP server OAuth flow. Please check your terminal/console.",
      });
      
      // Try to fetch calendars - this will trigger MCP OAuth flow if not authenticated
      const token = getToken();
      const response = await fetch(`${API_URL}/calendar/mcp/calendars`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setIsConnected(true);
        toast({
          title: "🎉 Calendar Connected!",
          description: "Your Google Calendar is now connected via MCP server!",
          duration: 5000,
        });
      } else {
        throw new Error('MCP Calendar connection failed');
      }

      // Listen for messages from the popup window
      const messageListener = (event: MessageEvent) => {
        if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
          // Authentication successful
          setIsConnected(true);
          setIsConnecting(false);
          if (popup) {
            popup.close();
          }
          
          toast({
            title: "🎉 Calendar Connected!",
            description: "Your Google Calendar is now connected. You can create events through AI chat!",
            duration: 5000,
          });
          
          // Remove the event listener
          window.removeEventListener('message', messageListener);
        }
      };
      
      // Add message listener
      window.addEventListener('message', messageListener);
      
      // Also listen for popup close (in case user closes manually)
      const checkClosed = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);
          window.removeEventListener('message', messageListener);
          
          // Check if authentication was successful even if popup was closed
          setTimeout(async () => {
            await checkAuthStatus();
          }, 1000);
        }
      }, 1000);

    } catch (error: any) {
      console.error('Error connecting calendar:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Google Calendar",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    // In a real implementation, you would call an API endpoint to revoke tokens
    setIsConnected(false);
    toast({
      title: "Calendar Disconnected",
      description: "Your Google Calendar has been disconnected.",
    });
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
