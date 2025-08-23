import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Create Supabase client for the service
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Chat Memory Service
 * Handles all chat conversation storage, retrieval, and management operations
 */
export class ChatMemoryService {
  constructor() {
    this.supabase = supabase;
  }

  // ============================================================
  // CONVERSATION MANAGEMENT
  // ============================================================

  /**
   * Create a new conversation
   * @param {string} userId - The user's ID
   * @param {Object} options - Conversation options
   * @returns {Promise<Object>} The created conversation
   */
  async createConversation(userId, options = {}) {
    try {
      const { title, summary, metadata } = options;

      const { data, error } = await this.supabase
        .from('conversations')
        .insert([{
          user_id: userId,
          title: title || 'New Conversation',
          summary: summary || null,
          metadata: metadata || {}
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        conversation: data,
        message: 'Conversation created successfully'
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      return {
        success: false,
        error: error.message,
        conversation: null
      };
    }
  }

  /**
   * Get all conversations for a user
   * @param {string} userId - The user's ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} List of conversations
   */
  async getConversations(userId, options = {}) {
    try {
      const { 
        limit = 50, 
        offset = 0, 
        includeArchived = false,
        sortBy = 'updated_at',
        sortOrder = 'desc'
      } = options;

      let query = this.supabase
        .from('conversation_summaries')
        .select('*')
        .eq('user_id', userId);

      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        conversations: data || [],
        pagination: {
          total: count,
          limit,
          offset,
          hasMore: data && data.length === limit
        },
        message: `Found ${data?.length || 0} conversations`
      };
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return {
        success: false,
        error: error.message,
        conversations: []
      };
    }
  }

  /**
   * Get a specific conversation by ID
   * @param {string} conversationId - The conversation ID
   * @param {string} userId - The user's ID
   * @returns {Promise<Object>} The conversation details
   */
  async getConversation(conversationId, userId) {
    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .select(`
          *,
          conversation_analytics (
            total_messages,
            total_tokens,
            total_user_messages,
            total_assistant_messages,
            session_duration_seconds,
            first_message_at,
            last_message_at
          ),
          conversation_tags (
            tag_name,
            color
          )
        `)
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Conversation not found');

      return {
        success: true,
        conversation: data,
        message: 'Conversation retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return {
        success: false,
        error: error.message,
        conversation: null
      };
    }
  }

  /**
   * Update a conversation
   * @param {string} conversationId - The conversation ID
   * @param {string} userId - The user's ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} The updated conversation
   */
  async updateConversation(conversationId, userId, updates) {
    try {
      const { title, summary, metadata, is_archived } = updates;

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (summary !== undefined) updateData.summary = summary;
      if (metadata !== undefined) updateData.metadata = metadata;
      if (is_archived !== undefined) updateData.is_archived = is_archived;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Conversation not found or access denied');

      return {
        success: true,
        conversation: data,
        message: 'Conversation updated successfully'
      };
    } catch (error) {
      console.error('Error updating conversation:', error);
      return {
        success: false,
        error: error.message,
        conversation: null
      };
    }
  }

  /**
   * Delete a conversation and all its messages
   * @param {string} conversationId - The conversation ID
   * @param {string} userId - The user's ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteConversation(conversationId, userId) {
    try {
      const { error } = await this.supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;

      return {
        success: true,
        message: 'Conversation deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Auto-generate conversation title based on first message
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<Object>} Updated conversation with new title
   */
  async generateConversationTitle(conversationId) {
    try {
      const { data, error } = await this.supabase
        .rpc('generate_conversation_title', { conv_id: conversationId });

      if (error) throw error;

      const generatedTitle = data;

      // Update the conversation with the generated title
      const { data: updatedConversation, error: updateError } = await this.supabase
        .from('conversations')
        .update({ title: generatedTitle })
        .eq('id', conversationId)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        success: true,
        conversation: updatedConversation,
        generatedTitle,
        message: 'Conversation title generated successfully'
      };
    } catch (error) {
      console.error('Error generating conversation title:', error);
      return {
        success: false,
        error: error.message,
        conversation: null
      };
    }
  }

  // ============================================================
  // MESSAGE MANAGEMENT
  // ============================================================

  /**
   * Add a message to a conversation
   * @param {string} conversationId - The conversation ID
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} The created message
   */
  async addMessage(conversationId, messageData) {
    try {
      const { 
        role, 
        content, 
        content_type = 'text', 
        tokens_count = 0, 
        metadata = {}, 
        parent_message_id 
      } = messageData;

      // Validate required fields
      if (!role || !content) {
        throw new Error('Role and content are required');
      }

      if (!['user', 'assistant', 'system', 'function'].includes(role)) {
        throw new Error('Invalid role. Must be user, assistant, system, or function');
      }

      const { data, error } = await this.supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          role,
          content: content.trim(),
          content_type,
          tokens_count,
          metadata,
          parent_message_id
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: data,
        message_text: 'Message added successfully'
      };
    } catch (error) {
      console.error('Error adding message:', error);
      return {
        success: false,
        error: error.message,
        message: null
      };
    }
  }

  /**
   * Get messages for a conversation
   * @param {string} conversationId - The conversation ID
   * @param {string} userId - The user's ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} List of messages
   */
  async getMessages(conversationId, userId, options = {}) {
    try {
      const { limit = 100, offset = 0, include_system = false } = options;

      // First verify the user has access to this conversation
      const { data: conversation } = await this.supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      let query = this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId);

      if (!include_system) {
        query = query.neq('role', 'system');
      }

      query = query
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        messages: data || [],
        pagination: {
          limit,
          offset,
          hasMore: data && data.length === limit
        },
        message_text: `Found ${data?.length || 0} messages`
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return {
        success: false,
        error: error.message,
        messages: []
      };
    }
  }

  /**
   * Get conversation context for AI processing
   * @param {string} conversationId - The conversation ID
   * @param {string} userId - The user's ID
   * @param {Object} options - Context options
   * @returns {Promise<Object>} Conversation context
   */
  async getConversationContext(conversationId, userId, options = {}) {
    try {
      const { 
        messageLimit = 50, 
        includeMetadata = true,
        includeAnalytics = false 
      } = options;

      // Get the conversation details
      const conversationResult = await this.getConversation(conversationId, userId);
      if (!conversationResult.success) {
        return conversationResult;
      }

      // Get recent messages
      const messagesResult = await this.getMessages(conversationId, userId, {
        limit: messageLimit,
        include_system: false
      });

      if (!messagesResult.success) {
        return messagesResult;
      }

      const context = {
        conversation: conversationResult.conversation,
        messages: messagesResult.messages,
        messageCount: messagesResult.messages.length,
        hasMoreMessages: messagesResult.pagination.hasMore
      };

      if (includeMetadata) {
        context.metadata = conversationResult.conversation.metadata;
      }

      if (includeAnalytics) {
        context.analytics = conversationResult.conversation.conversation_analytics?.[0] || null;
      }

      return {
        success: true,
        context,
        message_text: 'Conversation context retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return {
        success: false,
        error: error.message,
        context: null
      };
    }
  }

  /**
   * Update a message
   * @param {string} messageId - The message ID
   * @param {string} userId - The user's ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} The updated message
   */
  async updateMessage(messageId, userId, updates) {
    try {
      const { content, metadata, tokens_count } = updates;

      // Verify user has access to this message
      const { data: existingMessage } = await this.supabase
        .from('messages')
        .select(`
          *,
          conversations!inner(user_id)
        `)
        .eq('id', messageId)
        .single();

      if (!existingMessage || existingMessage.conversations.user_id !== userId) {
        throw new Error('Message not found or access denied');
      }

      const updateData = {};
      if (content !== undefined) {
        updateData.content = content.trim();
        updateData.is_edited = true;
        updateData.edit_count = (existingMessage.edit_count || 0) + 1;
      }
      if (metadata !== undefined) updateData.metadata = metadata;
      if (tokens_count !== undefined) updateData.tokens_count = tokens_count;

      const { data, error } = await this.supabase
        .from('messages')
        .update(updateData)
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: data,
        message_text: 'Message updated successfully'
      };
    } catch (error) {
      console.error('Error updating message:', error);
      return {
        success: false,
        error: error.message,
        message: null
      };
    }
  }

  /**
   * Delete a message
   * @param {string} messageId - The message ID
   * @param {string} userId - The user's ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteMessage(messageId, userId) {
    try {
      // Verify user has access to this message
      const { data: existingMessage } = await this.supabase
        .from('messages')
        .select(`
          id,
          conversations!inner(user_id)
        `)
        .eq('id', messageId)
        .single();

      if (!existingMessage || existingMessage.conversations.user_id !== userId) {
        throw new Error('Message not found or access denied');
      }

      const { error } = await this.supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      return {
        success: true,
        message_text: 'Message deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================
  // SEARCH AND ANALYTICS
  // ============================================================

  /**
   * Search conversations and messages
   * @param {string} userId - The user's ID
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchConversations(userId, query, options = {}) {
    try {
      const { limit = 20, includeMessages = true } = options;

      if (!query || query.trim().length < 2) {
        throw new Error('Search query must be at least 2 characters long');
      }

      // Search in conversation titles and summaries
      const { data: conversationResults, error: convError } = await this.supabase
        .from('conversation_summaries')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
        .limit(limit);

      if (convError) throw convError;

      let messageResults = [];
      if (includeMessages) {
        // Search in message content using full-text search
        const { data: msgResults, error: msgError } = await this.supabase
          .from('message_threads')
          .select('*')
          .eq('user_id', userId)
          .textSearch('content', query)
          .limit(limit);

        if (msgError) throw msgError;
        messageResults = msgResults || [];
      }

      return {
        success: true,
        results: {
          conversations: conversationResults || [],
          messages: messageResults,
          totalResults: (conversationResults?.length || 0) + (messageResults?.length || 0)
        },
        query: query.trim(),
        message_text: `Found ${(conversationResults?.length || 0)} conversations and ${messageResults.length} messages`
      };
    } catch (error) {
      console.error('Error searching conversations:', error);
      return {
        success: false,
        error: error.message,
        results: { conversations: [], messages: [], totalResults: 0 }
      };
    }
  }

  /**
   * Get user chat analytics
   * @param {string} userId - The user's ID
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Analytics data
   */
  async getUserAnalytics(userId, options = {}) {
    try {
      const { timeframe = '30days' } = options;

      // Calculate date range
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          startDate = new Date('2020-01-01');
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get conversation analytics
      const { data: analytics, error } = await this.supabase
        .from('conversation_analytics')
        .select(`
          *,
          conversations!inner(created_at, updated_at, is_archived)
        `)
        .eq('user_id', userId)
        .gte('conversations.created_at', startDate.toISOString());

      if (error) throw error;

      // Calculate aggregated statistics
      const stats = {
        totalConversations: analytics?.length || 0,
        totalMessages: analytics?.reduce((sum, a) => sum + (a.total_messages || 0), 0) || 0,
        totalTokens: analytics?.reduce((sum, a) => sum + (a.total_tokens || 0), 0) || 0,
        avgMessagesPerConversation: 0,
        activeConversations: analytics?.filter(a => !a.conversations.is_archived).length || 0,
        archivedConversations: analytics?.filter(a => a.conversations.is_archived).length || 0
      };

      if (stats.totalConversations > 0) {
        stats.avgMessagesPerConversation = Math.round(stats.totalMessages / stats.totalConversations);
      }

      return {
        success: true,
        analytics: {
          timeframe,
          period: {
            start: startDate.toISOString(),
            end: now.toISOString()
          },
          stats,
          conversationDetails: analytics || []
        },
        message_text: `Analytics retrieved for ${timeframe} period`
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return {
        success: false,
        error: error.message,
        analytics: null
      };
    }
  }

  // ============================================================
  // TAG MANAGEMENT
  // ============================================================

  /**
   * Add tags to a conversation
   * @param {string} conversationId - The conversation ID
   * @param {string} userId - The user's ID
   * @param {Array<string>} tags - Tags to add
   * @returns {Promise<Object>} Result of tag addition
   */
  async addConversationTags(conversationId, userId, tags) {
    try {
      // Verify user owns the conversation
      const { data: conversation } = await this.supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      // Prepare tag data
      const tagData = tags.map(tag => ({
        conversation_id: conversationId,
        tag_name: tag.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
        color: '#6B7280' // Default color
      }));

      const { data, error } = await this.supabase
        .from('conversation_tags')
        .upsert(tagData, { 
          onConflict: 'conversation_id,tag_name',
          ignoreDuplicates: true 
        })
        .select();

      if (error) throw error;

      return {
        success: true,
        tags: data || [],
        message_text: `Added ${data?.length || 0} tags to conversation`
      };
    } catch (error) {
      console.error('Error adding conversation tags:', error);
      return {
        success: false,
        error: error.message,
        tags: []
      };
    }
  }

  /**
   * Remove tags from a conversation
   * @param {string} conversationId - The conversation ID
   * @param {string} userId - The user's ID
   * @param {Array<string>} tags - Tags to remove
   * @returns {Promise<Object>} Result of tag removal
   */
  async removeConversationTags(conversationId, userId, tags) {
    try {
      // Verify user owns the conversation
      const { data: conversation } = await this.supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      const { error } = await this.supabase
        .from('conversation_tags')
        .delete()
        .eq('conversation_id', conversationId)
        .in('tag_name', tags.map(tag => tag.toLowerCase()));

      if (error) throw error;

      return {
        success: true,
        message_text: `Removed tags from conversation`
      };
    } catch (error) {
      console.error('Error removing conversation tags:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================
  // BULK OPERATIONS
  // ============================================================

  /**
   * Archive multiple conversations
   * @param {string} userId - The user's ID
   * @param {Array<string>} conversationIds - Conversation IDs to archive
   * @returns {Promise<Object>} Archive result
   */
  async bulkArchiveConversations(userId, conversationIds) {
    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in('id', conversationIds)
        .select('id, title');

      if (error) throw error;

      return {
        success: true,
        archivedConversations: data || [],
        count: data?.length || 0,
        message_text: `Archived ${data?.length || 0} conversations`
      };
    } catch (error) {
      console.error('Error bulk archiving conversations:', error);
      return {
        success: false,
        error: error.message,
        archivedConversations: [],
        count: 0
      };
    }
  }

  /**
   * Delete multiple conversations
   * @param {string} userId - The user's ID
   * @param {Array<string>} conversationIds - Conversation IDs to delete
   * @returns {Promise<Object>} Deletion result
   */
  async bulkDeleteConversations(userId, conversationIds) {
    try {
      const { error } = await this.supabase
        .from('conversations')
        .delete()
        .eq('user_id', userId)
        .in('id', conversationIds);

      if (error) throw error;

      return {
        success: true,
        deletedCount: conversationIds.length,
        message_text: `Deleted ${conversationIds.length} conversations`
      };
    } catch (error) {
      console.error('Error bulk deleting conversations:', error);
      return {
        success: false,
        error: error.message,
        deletedCount: 0
      };
    }
  }
}

// Export singleton instance
export const chatMemoryService = new ChatMemoryService();
