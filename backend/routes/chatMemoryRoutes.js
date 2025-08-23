import express from 'express';
import { chatMemoryService } from '../services/chatMemoryService.js';

const router = express.Router();

// ============================================================
// CONVERSATION ENDPOINTS
// ============================================================

/**
 * GET /chat/conversations
 * Get all conversations for the authenticated user
 */
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user_id;
    const {
      limit = 50,
      offset = 0,
      includeArchived = 'false',
      sortBy = 'updated_at',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      includeArchived: includeArchived === 'true',
      sortBy,
      sortOrder
    };

    const result = await chatMemoryService.getConversations(userId, options);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      conversations: result.conversations,
      pagination: result.pagination,
      message: result.message
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * POST /chat/conversations
 * Create a new conversation
 */
router.post('/conversations', async (req, res) => {
  try {
    const userId = req.user_id;
    const { title, summary, metadata } = req.body;

    const result = await chatMemoryService.createConversation(userId, {
      title,
      summary,
      metadata
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({
      conversation: result.conversation,
      message: result.message
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * GET /chat/conversations/:id
 * Get a specific conversation by ID
 */
router.get('/conversations/:id', async (req, res) => {
  try {
    const userId = req.user_id;
    const { id: conversationId } = req.params;

    const result = await chatMemoryService.getConversation(conversationId, userId);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json({
      conversation: result.conversation,
      message: result.message
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * PUT /chat/conversations/:id
 * Update a conversation
 */
router.put('/conversations/:id', async (req, res) => {
  try {
    const userId = req.user_id;
    const { id: conversationId } = req.params;
    const updates = req.body;

    const result = await chatMemoryService.updateConversation(conversationId, userId, updates);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      conversation: result.conversation,
      message: result.message
    });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

/**
 * DELETE /chat/conversations/:id
 * Delete a conversation
 */
router.delete('/conversations/:id', async (req, res) => {
  try {
    const userId = req.user_id;
    const { id: conversationId } = req.params;

    const result = await chatMemoryService.deleteConversation(conversationId, userId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: result.message });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

/**
 * POST /chat/conversations/:id/generate-title
 * Auto-generate conversation title
 */
router.post('/conversations/:id/generate-title', async (req, res) => {
  try {
    const { id: conversationId } = req.params;

    const result = await chatMemoryService.generateConversationTitle(conversationId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      conversation: result.conversation,
      generatedTitle: result.generatedTitle,
      message: result.message
    });
  } catch (error) {
    console.error('Generate title error:', error);
    res.status(500).json({ error: 'Failed to generate conversation title' });
  }
});

/**
 * GET /chat/conversations/:id/context
 * Get conversation context for AI processing
 */
router.get('/conversations/:id/context', async (req, res) => {
  try {
    const userId = req.user_id;
    const { id: conversationId } = req.params;
    const {
      messageLimit = 50,
      includeMetadata = 'true',
      includeAnalytics = 'false'
    } = req.query;

    const options = {
      messageLimit: parseInt(messageLimit),
      includeMetadata: includeMetadata === 'true',
      includeAnalytics: includeAnalytics === 'true'
    };

    const result = await chatMemoryService.getConversationContext(conversationId, userId, options);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      context: result.context,
      message: result.message_text
    });
  } catch (error) {
    console.error('Get conversation context error:', error);
    res.status(500).json({ error: 'Failed to get conversation context' });
  }
});

// ============================================================
// MESSAGE ENDPOINTS
// ============================================================

/**
 * GET /chat/conversations/:id/messages
 * Get messages for a conversation
 */
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const userId = req.user_id;
    const { id: conversationId } = req.params;
    const {
      limit = 100,
      offset = 0,
      include_system = 'false'
    } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      include_system: include_system === 'true'
    };

    const result = await chatMemoryService.getMessages(conversationId, userId, options);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      messages: result.messages,
      pagination: result.pagination,
      message: result.message_text
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * POST /chat/conversations/:id/messages
 * Add a message to a conversation
 */
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const messageData = req.body;

    // Validate required fields
    if (!messageData.role || !messageData.content) {
      return res.status(400).json({ error: 'Role and content are required' });
    }

    const result = await chatMemoryService.addMessage(conversationId, messageData);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({
      message: result.message,
      message_text: result.message_text
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

/**
 * PUT /chat/messages/:messageId
 * Update a message
 */
router.put('/messages/:messageId', async (req, res) => {
  try {
    const userId = req.user_id;
    const { messageId } = req.params;
    const updates = req.body;

    const result = await chatMemoryService.updateMessage(messageId, userId, updates);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      message: result.message,
      message_text: result.message_text
    });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

/**
 * DELETE /chat/messages/:messageId
 * Delete a message
 */
router.delete('/messages/:messageId', async (req, res) => {
  try {
    const userId = req.user_id;
    const { messageId } = req.params;

    const result = await chatMemoryService.deleteMessage(messageId, userId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: result.message_text });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ============================================================
// SEARCH AND ANALYTICS ENDPOINTS
// ============================================================

/**
 * GET /chat/search
 * Search conversations and messages
 */
router.get('/search', async (req, res) => {
  try {
    const userId = req.user_id;
    const { q: query, limit = 20, includeMessages = 'true' } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
    }

    const options = {
      limit: parseInt(limit),
      includeMessages: includeMessages === 'true'
    };

    const result = await chatMemoryService.searchConversations(userId, query, options);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      results: result.results,
      query: result.query,
      message: result.message_text
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search conversations' });
  }
});

/**
 * GET /chat/analytics
 * Get user chat analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const userId = req.user_id;
    const { timeframe = '30days' } = req.query;

    const result = await chatMemoryService.getUserAnalytics(userId, { timeframe });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      analytics: result.analytics,
      message: result.message_text
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// ============================================================
// TAG MANAGEMENT ENDPOINTS
// ============================================================

/**
 * POST /chat/conversations/:id/tags
 * Add tags to a conversation
 */
router.post('/conversations/:id/tags', async (req, res) => {
  try {
    const userId = req.user_id;
    const { id: conversationId } = req.params;
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: 'Tags array is required' });
    }

    const result = await chatMemoryService.addConversationTags(conversationId, userId, tags);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      tags: result.tags,
      message: result.message_text
    });
  } catch (error) {
    console.error('Add tags error:', error);
    res.status(500).json({ error: 'Failed to add tags' });
  }
});

/**
 * DELETE /chat/conversations/:id/tags
 * Remove tags from a conversation
 */
router.delete('/conversations/:id/tags', async (req, res) => {
  try {
    const userId = req.user_id;
    const { id: conversationId } = req.params;
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: 'Tags array is required' });
    }

    const result = await chatMemoryService.removeConversationTags(conversationId, userId, tags);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: result.message_text });
  } catch (error) {
    console.error('Remove tags error:', error);
    res.status(500).json({ error: 'Failed to remove tags' });
  }
});

// ============================================================
// BULK OPERATIONS ENDPOINTS
// ============================================================

/**
 * POST /chat/conversations/bulk/archive
 * Archive multiple conversations
 */
router.post('/conversations/bulk/archive', async (req, res) => {
  try {
    const userId = req.user_id;
    const { conversationIds } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({ error: 'conversationIds array is required' });
    }

    const result = await chatMemoryService.bulkArchiveConversations(userId, conversationIds);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      archivedConversations: result.archivedConversations,
      count: result.count,
      message: result.message_text
    });
  } catch (error) {
    console.error('Bulk archive error:', error);
    res.status(500).json({ error: 'Failed to archive conversations' });
  }
});

/**
 * DELETE /chat/conversations/bulk
 * Delete multiple conversations
 */
router.delete('/conversations/bulk', async (req, res) => {
  try {
    const userId = req.user_id;
    const { conversationIds } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({ error: 'conversationIds array is required' });
    }

    const result = await chatMemoryService.bulkDeleteConversations(userId, conversationIds);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      deletedCount: result.deletedCount,
      message: result.message_text
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to delete conversations' });
  }
});

// ============================================================
// UTILITY ENDPOINTS
// ============================================================

/**
 * GET /chat/health
 * Health check for chat memory service
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      status: 'healthy',
      service: 'chat-memory',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * POST /chat/start-session
 * Start a new chat session (convenience endpoint)
 */
router.post('/start-session', async (req, res) => {
  try {
    const userId = req.user_id;
    const { title = 'New Chat Session', initialMessage } = req.body;

    // Create a new conversation
    const conversationResult = await chatMemoryService.createConversation(userId, {
      title,
      summary: 'New chat session started',
      metadata: { 
        sessionType: 'chat',
        startedAt: new Date().toISOString()
      }
    });

    if (!conversationResult.success) {
      return res.status(400).json({ error: conversationResult.error });
    }

    const conversation = conversationResult.conversation;

    // Add initial message if provided
    if (initialMessage && initialMessage.trim()) {
      const messageResult = await chatMemoryService.addMessage(conversation.id, {
        role: 'user',
        content: initialMessage.trim(),
        content_type: 'text',
        metadata: { isInitialMessage: true }
      });

      if (messageResult.success) {
        // Auto-generate title based on initial message
        await chatMemoryService.generateConversationTitle(conversation.id);
      }
    }

    res.status(201).json({
      conversation,
      message: 'Chat session started successfully',
      sessionId: conversation.id
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Failed to start chat session' });
  }
});

export default router;
