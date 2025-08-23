import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Sparkles, Clock, MessageCircle, Plus, Search, MoreVertical, Archive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UsageMeter from '@/components/common/UsageMeter';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
  tokens_count?: number;
  metadata?: any;
}

interface Conversation {
  id: string;
  title: string;
  summary?: string;
  message_count: number;
  updated_at: string;
  last_message_preview?: string;
  status: 'active' | 'archived';
}

const API_URL = 'http://localhost:4000';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : '');

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showConversations, setShowConversations] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    }
  }, [currentConversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const token = getToken();
      console.log('Loading conversations with token:', token ? 'Token available' : 'No token found');
      
      const response = await fetch(`${API_URL}/chat/conversations?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Conversations response status:', response.status);
      const data = await response.json();
      console.log('Conversations response data:', data);
      
      if (response.status === 200 && data.conversations) {
        setConversations(data.conversations);
        // If no current conversation and we have conversations, select the first one
        if (!currentConversationId && data.conversations.length > 0) {
          setCurrentConversationId(data.conversations[0].id);
        }
      } else {
        console.error('Failed to load conversations:', data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string, showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoadingMessages(true);
        // Clear messages immediately to show loading state
        setMessages([]);
      }
      
      const token = getToken();
      console.log('Loading messages for conversation:', conversationId);
      
      // Load messages with a reasonable limit (last 50 messages)
      const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/messages?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Load messages response status:', response.status);
      const data = await response.json();
      console.log('Load messages response data:', data);
      
      if (response.ok) {
        const loadedMessages = data.messages || [];
        setMessages(loadedMessages);
        console.log('✅ Loaded', loadedMessages.length, 'messages for conversation:', conversationId);
        
        // If we loaded messages and this is the active conversation, show a brief success indicator
        if (loadedMessages.length > 0 && showLoading) {
          console.log('📝 Conversation loaded:', {
            id: conversationId,
            messageCount: loadedMessages.length,
            firstMessage: loadedMessages[0]?.content?.substring(0, 50) + '...',
            lastMessage: loadedMessages[loadedMessages.length - 1]?.content?.substring(0, 50) + '...'
          });
        } else if (loadedMessages.length === 0) {
          console.log('📭 Conversation is empty:', conversationId);
        }
      } else {
        console.error('❌ Failed to load messages. Status:', response.status, 'Data:', data);
        console.error('Error details:', data.error || 'Unknown error');
        setMessages([]); // Set empty array on error
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]); // Set empty array on error
    } finally {
      if (showLoading) {
        setIsLoadingMessages(false);
      }
    }
  };

  const startNewConversation = async (initialMessage: string) => {
    try {
      const token = getToken();
      console.log('Starting new conversation with token:', token ? 'Token available' : 'No token');
      
      const response = await fetch(`${API_URL}/chat/start-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'New Conversation',
          initialMessage: initialMessage
        }),
      });
      
      console.log('Start session response status:', response.status);
      const data = await response.json();
      console.log('Start session response data:', data);
      
      // Check for successful response (201 status) and sessionId presence
      if (response.status === 201 && data.sessionId) {
        const newConversationId = data.sessionId;
        setCurrentConversationId(newConversationId);
        await loadConversations(); // Refresh the conversations list
        return newConversationId;
      } else {
        console.error('Start session failed:', data.error || 'Unknown error');
        throw new Error(`API Error: ${data.error || 'Failed to create session'}`);
      }
    } catch (error) {
      console.error('Failed to start new conversation:', error);
      throw error; // Re-throw to let handleSendMessage catch it
    }
  };

  const addMessageToConversation = async (conversationId: string, message: string, role: 'user' | 'assistant') => {
    try {
      const token = getToken();
      console.log(`Adding ${role} message to conversation:`, conversationId);
      const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: role,
          content: message,
          metadata: {
            timestamp: Date.now(),
            source: 'web-app'
          }
        }),
      });
      console.log('Add message response status:', response.status);
      const data = await response.json();
      console.log('Add message response data:', data);
      
      if (response.status === 201 && data.message) {
        console.log('Message added successfully:', data.message.id);
        return data.message;
      } else {
        console.error('Failed to add message - API error:', data.error || 'Unknown error');
        console.error('Expected status 201 and message field, got:', response.status, data);
        return null;
      }
    } catch (error) {
      console.error('Failed to add message - Network/Parse error:', error);
    }
    return null;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const messageText = inputMessage;
    setInputMessage('');
    setIsTyping(true);

    console.log('Sending message:', messageText);
    console.log('Current conversation ID:', currentConversationId);

    try {
      let conversationId = currentConversationId;
      
      // If no current conversation, start a new one
      if (!conversationId) {
        console.log('Starting new conversation...');
        conversationId = await startNewConversation(messageText);
        console.log('New conversation ID:', conversationId);
        if (!conversationId) {
          throw new Error('Failed to create conversation');
        }
      } else {
        console.log('Adding message to existing conversation...');
        // Add user message to existing conversation
        const userMessage = await addMessageToConversation(conversationId, messageText, 'user');
        console.log('User message result:', userMessage);
        if (userMessage) {
          setMessages(prev => [...prev, userMessage]);
        }
      }

      // Get conversation context for AI - always load from database to ensure completeness
      let conversationContext = [];
      try {
        if (conversationId) {
          console.log('Loading full conversation context from database...');
          const token = getToken();
          const contextResponse = await fetch(`${API_URL}/chat/conversations/${conversationId}/context?limit=20&includeMetadata=false`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (contextResponse.ok) {
            const contextData = await contextResponse.json();
            console.log('Context response:', contextData);
            
            if (contextData.success && contextData.context && contextData.context.messages) {
              // Use the full conversation history from database
              conversationContext = contextData.context.messages.map(msg => ({
                role: msg.role,
                content: msg.content
              }));
              console.log('Including full conversation context from DB:', conversationContext.length, 'messages');
            } else {
              // Fallback to current session messages if DB context fails
              console.log('DB context failed, using session messages as fallback');
              conversationContext = messages.slice(-10).map(msg => ({
                role: msg.role,
                content: msg.content
              }));
            }
          } else {
            // Fallback to current session messages
            console.log('Context API call failed, using session messages');
            conversationContext = messages.slice(-10).map(msg => ({
              role: msg.role,
              content: msg.content
            }));
          }
        }
      } catch (contextError) {
        console.log('Failed to get conversation context from DB, using session fallback:', contextError);
        // Fallback to current session messages
        conversationContext = messages.slice(-10).map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }

      // Get AI response from your backend
      try {
        console.log('Getting AI response from backend...');
        const aiResponse = await fetch(`${API_URL}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            message: messageText,
            conversationId: conversationId,
            context: conversationContext
          }),
        });
        
        const aiData = await aiResponse.json();
        console.log('AI response:', aiData);
        
        if (aiResponse.ok && aiData.response) {
          console.log('Adding AI response...');
          const assistantMessage = await addMessageToConversation(conversationId!, aiData.response, 'assistant');
          console.log('Assistant message result:', assistantMessage);
          if (assistantMessage) {
            setMessages(prev => [...prev, assistantMessage]);
          }
        } else {
          // Fallback error message
          const errorMessage = await addMessageToConversation(
            conversationId!, 
            'Sorry, I encountered an error while processing your request. Please try again.', 
            'assistant'
          );
          if (errorMessage) {
            setMessages(prev => [...prev, errorMessage]);
          }
        }
      } catch (aiError) {
        console.error('AI response error:', aiError);
        // Fallback error message
        const errorMessage = await addMessageToConversation(
          conversationId!, 
          'Sorry, I\'m having trouble connecting to my AI service. Please try again later.', 
          'assistant'
        );
        if (errorMessage) {
          setMessages(prev => [...prev, errorMessage]);
        }
      } finally {
        // Refresh conversations to update last message preview
        loadConversations();
        setIsTyping(false);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error details:', error.message);
      setIsTyping(false);
      
      // Add error message with more details
      const errorMessage = {
        id: Date.now().toString(),
        content: `Sorry, there was an error: ${error.message}. Please check the console for details and try again.`,
        role: 'assistant' as const,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const selectConversation = (conversationId: string) => {
    console.log('🔄 Switching to conversation:', conversationId);
    setCurrentConversationId(conversationId);
    // loadMessages will be called automatically by the useEffect
  };

  const archiveConversation = async (conversationId: string) => {
    try {
      const token = getToken();
      await fetch(`${API_URL}/chat/conversations/${conversationId}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      loadConversations();
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to archive conversation:', error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    // Show confirmation dialog
    const conversation = conversations.find(c => c.id === conversationId);
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete "${conversation?.title}"?\n\nThis action cannot be undone and will delete all messages in this conversation.`
    );
    
    if (!confirmDelete) return;

    try {
      const token = getToken();
      console.log('Deleting conversation:', conversationId);
      
      const response = await fetch(`${API_URL}/chat/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Delete response status:', response.status);
      
      if (response.ok || response.status === 204) {
        console.log('Conversation deleted successfully');
        
        // If we're currently viewing the deleted conversation, clear it
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null);
          setMessages([]);
        }
        
        // Refresh conversations list
        await loadConversations();
        
        // Show success message (you could replace this with a toast notification)
        alert('Conversation deleted successfully!');
      } else {
        const errorData = await response.json();
        console.error('Delete failed:', errorData);
        alert(`Failed to delete conversation: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Conversations Sidebar */}
      {showConversations && (
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0 h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Conversations</h2>
              <Button
                size="sm"
                onClick={() => {
                  setCurrentConversationId(null);
                  setMessages([]);
                }}
                className="h-8 w-8 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <Input
              placeholder="Search conversations..."
              className="text-sm"
              // You can add search functionality here later
            />
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-2">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs">Start chatting to create your first conversation</p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                      currentConversationId === conversation.id
                        ? 'bg-blue-100 border-blue-200 border'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => selectConversation(conversation.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {conversation.title}
                        </p>
                        {conversation.last_message_preview && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {conversation.last_message_preview}
                          </p>
                        )}
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs text-gray-500">
                            {conversation.message_count} messages
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(conversation.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              archiveConversation(conversation.id);
                            }}
                          >
                            <Archive className="w-3 h-3 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conversation.id);
                            }}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConversations(!showConversations)}
                className="lg:hidden"
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {currentConversationId
                    ? conversations.find(c => c.id === currentConversationId)?.title || 'Chat'
                    : 'AI Chat Assistant'
                  }
                </h1>
                <p className="text-sm text-gray-600">
                  {currentConversationId
                    ? isLoadingMessages
                      ? 'Loading messages...'
                      : `${messages.length} messages`
                    : 'Start a new conversation'
                  }
                </p>
              </div>
            </div>
            
            <Card className="p-3">
              <UsageMeter current={conversations.length} total={50} label="Conversations" color="blue" />
            </Card>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4">
          {isLoadingMessages ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading conversation history...</p>
                <p className="text-sm text-gray-500 mt-1">Fetching your messages</p>
              </div>
            </div>
          ) : messages.length === 0 && !currentConversationId ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to AI Chat!</h3>
                <p className="text-gray-600 mb-4">
                  Your conversations are now saved and persistent. Ask me anything to get started!
                </p>
                <div className="grid grid-cols-1 gap-2 text-sm text-gray-500">
                  <p>✨ Persistent conversation history</p>
                  <p>🔍 Search across all conversations</p>
                  <p>📊 Track your usage and analytics</p>
                </div>
              </div>
            </div>
          ) : messages.length === 0 && currentConversationId ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-6 h-6 text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Empty Conversation</h3>
                <p className="text-gray-600 mb-4">
                  This conversation doesn't have any messages yet. Start typing to begin!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex space-x-3 max-w-xs lg:max-w-md ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' 
                        ? 'bg-blue-500' 
                        : 'bg-gradient-to-br from-purple-500 to-pink-500'
                    }`}>
                      {message.role === 'user' ? (
                        <span className="text-white text-sm font-medium">U</span>
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    
                    <div className={`px-4 py-2 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div className="flex items-center space-x-1 mt-1">
                        <Clock className="w-3 h-3 opacity-70" />
                        <span className="text-xs opacity-70">
                          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {message.tokens_count && (
                          <span className="text-xs opacity-70 ml-2">
                            {message.tokens_count} tokens
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex space-x-3 max-w-xs lg:max-w-md">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="px-4 py-2 bg-gray-100 rounded-2xl">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Invisible div for auto-scrolling to bottom */}
              <div ref={messagesEndRef} />
            </div>
          )}
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
          <div className="flex space-x-3 max-w-4xl mx-auto">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={currentConversationId ? "Type your message..." : "Start a new conversation..."}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!inputMessage.trim() || isTyping}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center max-w-4xl mx-auto">
            {currentConversationId 
              ? "Messages are automatically saved to your conversation history."
              : "Start typing to create a new conversation. All messages will be saved."
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;
