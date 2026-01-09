
import React, { useState } from 'react';
import { Send, Bot, User, Loader2, Calendar, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  calendarEvent?: any;
  calendarCreated?: boolean;
}

const API_URL = 'http://localhost:4000';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : '');

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm your AI Study Assistant. I can help you with your academics and even schedule meetings or events through natural language. Just ask me! \n\nTry saying something like:\n• 'Schedule a study session tomorrow at 3pm'\n• 'Set up a meeting with my project team next Friday'\n• 'Remind me about my assignment deadline'\n\nOr ask me any academic question!",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: currentInput }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || 'No response from AI.',
        sender: 'ai',
        timestamp: new Date(),
        calendarEvent: data.calendarEvent,
        calendarCreated: data.calendarCreated
      };

      setMessages(prev => [...prev, aiMessage]);

      // Show toast notification for calendar events
      if (data.calendarEvent) {
        if (data.calendarCreated) {
          toast({
            title: "📅 Event Created!",
            description: `${data.calendarEvent.title} has been added to your Google Calendar.`,
            duration: 5000,
          });
        } else {
          toast({
            title: "📅 Event Details Ready",
            description: "Connect your Google Calendar to automatically create events!",
            duration: 5000,
          });
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      
      // Better error message handling
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error.message && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.error && typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      }
      
      const aiErrorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiErrorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 h-[600px] flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">AI Study Assistant</h2>
        <p className="text-sm text-gray-500">Ask me anything about your studies!</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex space-x-3 max-w-xs lg:max-w-md ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.sender === 'user' 
                      ? 'bg-blue-500' 
                      : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}>
                    {message.sender === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
                <div className={`rounded-lg px-4 py-2 ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="text-sm whitespace-pre-line">
                    {message.content}
                  </div>
                  
                  {/* Calendar Event Display */}
                  {message.calendarEvent && message.sender === 'ai' && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        {message.calendarCreated ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Calendar className="w-4 h-4 text-blue-500" />
                        )}
                        <span className="text-sm font-medium text-blue-900">
                          {message.calendarCreated ? 'Event Created' : 'Event Ready'}
                        </span>
                      </div>
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold">{message.calendarEvent.title}</p>
                        {message.calendarEvent.start && (
                          <p className="text-xs mt-1">
                            📅 {new Date(message.calendarEvent.start).toLocaleString('en-IN', { 
                              timeZone: 'Asia/Kolkata',
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </p>
                        )}
                        {message.calendarEvent.location && (
                          <p className="text-xs mt-1">📍 {message.calendarEvent.location}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex space-x-3 max-w-xs lg:max-w-md">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me about your studies..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
