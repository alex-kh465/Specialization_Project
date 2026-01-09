# Chat Memory System Usage Guide

## Overview

The chat memory system is now fully integrated into your backend and provides comprehensive conversation management, message storage, search capabilities, and analytics. This guide shows you how to use it effectively.

## Quick Start

### 1. Running the Demo

First, test that everything is working:

```bash
# Run the demo script
node demo-chat-memory.js

# Keep the demo data for testing (optional)
node demo-chat-memory.js --keep
```

### 2. Database Setup

Make sure your Supabase database has the chat memory schema:

```bash
# The schema should already be applied, but if you need to rerun it:
# Copy the SQL from chat-memory-schema.sql and run it in your Supabase SQL editor
```

## API Endpoints

The chat memory system exposes the following REST API endpoints under `/chat`:

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chat/conversations` | List user's conversations |
| POST | `/chat/conversations` | Create a new conversation |
| GET | `/chat/conversations/:id` | Get specific conversation |
| PUT | `/chat/conversations/:id` | Update conversation |
| DELETE | `/chat/conversations/:id` | Delete conversation |
| GET | `/chat/conversations/:id/context` | Get conversation context for AI |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chat/conversations/:id/messages` | Get messages in conversation |
| POST | `/chat/conversations/:id/messages` | Add message to conversation |
| PUT | `/chat/messages/:id` | Update a message |
| DELETE | `/chat/messages/:id` | Delete a message |

### Search & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chat/search` | Search conversations and messages |
| GET | `/chat/analytics` | Get user analytics |
| POST | `/chat/conversations/:id/tags` | Add tags to conversation |
| GET | `/chat/tags` | Get user's tags |

### Session Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat/start-session` | Start new conversation with initial message |
| POST | `/chat/conversations/:id/archive` | Archive conversation |
| POST | `/chat/conversations/:id/restore` | Restore archived conversation |

## Frontend Integration Examples

### Starting a New Chat Session

```javascript
// Start a new chat session with an initial message
const startNewChat = async (initialMessage, title = null) => {
  try {
    const response = await fetch('/chat/start-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        title: title || 'New Conversation',
        initialMessage: initialMessage
      })
    });

    const result = await response.json();
    
    if (result.success) {
      return result.sessionId; // Use this conversation ID going forward
    }
  } catch (error) {
    console.error('Failed to start chat session:', error);
  }
};

// Usage
const conversationId = await startNewChat("Help me plan my study schedule");
```

### Adding Messages to a Conversation

```javascript
// Add user message
const addUserMessage = async (conversationId, message) => {
  const response = await fetch(`/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      role: 'user',
      content: message,
      metadata: { 
        timestamp: Date.now(),
        source: 'web-app' 
      }
    })
  });

  return await response.json();
};

// Add AI assistant response
const addAssistantMessage = async (conversationId, response, tokenCount) => {
  const response = await fetch(`/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      role: 'assistant',
      content: response,
      tokens_count: tokenCount,
      metadata: {
        model: 'gpt-4',
        responseTime: Date.now() - startTime
      }
    })
  });

  return await response.json();
};
```

### Getting Conversation Context for AI Processing

```javascript
// Get conversation history for AI context
const getConversationContext = async (conversationId, messageLimit = 20) => {
  const response = await fetch(
    `/chat/conversations/${conversationId}/context?limit=${messageLimit}&includeMetadata=true`,
    {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    }
  );

  const result = await response.json();
  
  if (result.success) {
    // Format messages for AI API
    const messages = result.context.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    return {
      messages,
      conversation: result.context.conversation,
      totalMessages: result.context.messageCount
    };
  }
};

// Usage in AI chat processing
const processAIResponse = async (conversationId, userMessage) => {
  // 1. Add user message
  await addUserMessage(conversationId, userMessage);

  // 2. Get conversation context
  const context = await getConversationContext(conversationId);

  // 3. Send to AI API
  const aiResponse = await callAIAPI(context.messages);

  // 4. Add AI response to conversation
  await addAssistantMessage(conversationId, aiResponse.content, aiResponse.tokens);

  return aiResponse;
};
```

### Loading Conversation List

```javascript
// Get user's conversations with pagination
const loadConversations = async (page = 1, limit = 20) => {
  const response = await fetch(
    `/chat/conversations?page=${page}&limit=${limit}&sortBy=updated_at&sortOrder=desc`,
    {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    }
  );

  const result = await response.json();
  
  if (result.success) {
    return result.conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      summary: conv.summary,
      messageCount: conv.message_count,
      lastActivity: new Date(conv.updated_at),
      preview: conv.last_message_preview,
      tags: conv.tags || []
    }));
  }
};
```

### Search Functionality

```javascript
// Search conversations and messages
const searchChats = async (query, options = {}) => {
  const params = new URLSearchParams({
    q: query,
    limit: options.limit || 10,
    includeMessages: options.includeMessages || false,
    ...options
  });

  const response = await fetch(`/chat/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  });

  const result = await response.json();
  
  if (result.success) {
    return {
      conversations: result.results.conversations,
      messages: result.results.messages,
      totalResults: result.results.totalResults
    };
  }
};

// Usage
const searchResults = await searchChats('study schedule', {
  limit: 5,
  includeMessages: true
});
```

### Getting Analytics

```javascript
// Get user chat analytics
const getChatAnalytics = async (timeframe = '30days') => {
  const response = await fetch(`/chat/analytics?timeframe=${timeframe}`, {
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  });

  const result = await response.json();
  
  if (result.success) {
    return {
      totalConversations: result.analytics.stats.totalConversations,
      totalMessages: result.analytics.stats.totalMessages,
      avgMessagesPerConversation: result.analytics.stats.avgMessagesPerConversation,
      activeConversations: result.analytics.stats.activeConversations,
      topTags: result.analytics.topTags,
      activityByDay: result.analytics.activityByDay
    };
  }
};
```

## Backend Service Usage

You can also use the chat memory service directly in your backend code:

```javascript
import { chatMemoryService } from './services/chatMemoryService.js';

// Create conversation
const result = await chatMemoryService.createConversation(userId, {
  title: 'Planning Session',
  summary: 'User needs help with planning',
  metadata: { source: 'api', priority: 'high' }
});

// Add message
await chatMemoryService.addMessage(conversationId, {
  role: 'user',
  content: 'Hello, I need help',
  metadata: { timestamp: Date.now() }
});

// Get context for AI processing
const context = await chatMemoryService.getConversationContext(
  conversationId, 
  userId, 
  { messageLimit: 10, includeMetadata: true }
);

// Search
const searchResults = await chatMemoryService.searchConversations(
  userId, 
  'planning help', 
  { limit: 5 }
);

// Analytics
const analytics = await chatMemoryService.getUserAnalytics(userId, {
  timeframe: '7days'
});
```

## Best Practices

### 1. Conversation Management

- **Auto-generate titles**: Use the `generateConversationTitle()` method after a few messages
- **Regular archiving**: Archive old conversations to keep the active list manageable
- **Tagging**: Add relevant tags for better organization and search

### 2. Message Handling

- **Include metadata**: Store useful metadata like timestamps, model versions, response times
- **Token tracking**: Track token usage for cost monitoring and analytics
- **Error handling**: Always handle API errors gracefully

### 3. Search Optimization

- **Use specific queries**: More specific search terms yield better results
- **Combine filters**: Use tags, date ranges, and other filters to narrow results
- **Cache frequent searches**: Consider caching popular search queries

### 4. Performance

- **Pagination**: Always paginate conversation lists and search results
- **Limit context**: Don't load entire conversation history - use reasonable limits
- **Batch operations**: Use bulk operations when adding multiple messages

### 5. Security

- **Always authenticate**: Ensure all requests are authenticated
- **User isolation**: The system enforces user-based access control
- **Input validation**: Validate all input data before processing

## Monitoring and Analytics

The system provides comprehensive analytics:

- **Conversation metrics**: Total, active, archived conversations
- **Message statistics**: Total messages, average per conversation
- **Usage patterns**: Activity by day, popular tags
- **Search insights**: Query patterns and result effectiveness

## Troubleshooting

### Common Issues

1. **"User not authenticated"**: Ensure JWT token is valid and passed in Authorization header
2. **"Conversation not found"**: Verify the conversation ID and user ownership
3. **"Database connection failed"**: Check Supabase connection and environment variables

### Debug Mode

Enable detailed logging by setting:
```bash
export DEBUG=chat-memory:*
```

### Testing

Run the demo script to verify everything is working:
```bash
node demo-chat-memory.js
```

The demo will test all major functionality and show you exactly how each feature works.

---

## Next Steps

Now that your chat memory system is set up and working, you can:

1. **Run the demo**: `node demo-chat-memory.js`
2. **Integrate with your frontend**: Use the API examples above
3. **Customize as needed**: Modify the service or add new endpoints
4. **Monitor usage**: Use the analytics to understand user behavior
5. **Scale as needed**: The system is designed to handle production workloads

The chat memory system is production-ready and will enhance your AI assistant by providing persistent, searchable conversation history with comprehensive analytics and management features.
