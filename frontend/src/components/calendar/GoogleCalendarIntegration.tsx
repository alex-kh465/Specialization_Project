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
      const response = await fetch(`${API_URL}/calendar/auth-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.authenticated);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/calendar/auth-url`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get authorization URL');
      }

      const data = await response.json();
      
      // Open Google OAuth in a popup window
      const popup = window.open(
        data.authUrl,
        'google-calendar-auth',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

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
