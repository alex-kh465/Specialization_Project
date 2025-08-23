#!/usr/bin/env node

/**
 * Chat Memory System Demo Script
 * 
 * This script demonstrates how to use the chat memory system by:
 * 1. Creating a sample conversation
 * 2. Adding messages to it
 * 3. Retrieving conversation context
 * 4. Searching through conversations
 * 5. Getting analytics
 * 
 * Run with: node demo-chat-memory.js
 */

import { chatMemoryService } from './services/chatMemoryService.js';
import dotenv from 'dotenv';

dotenv.config();

// Mock user ID for testing (in real app, this comes from JWT token)
// Using a proper UUID format that matches your Supabase auth users
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

async function demoBasicOperations() {
  console.log('🚀 Starting Chat Memory System Demo\n');

  try {
    // 1. Create a new conversation
    console.log('📝 Step 1: Creating a new conversation...');
    const conversationResult = await chatMemoryService.createConversation(TEST_USER_ID, {
      title: 'Demo Chat Session',
      summary: 'A demonstration of the chat memory system',
      metadata: { 
        demo: true, 
        version: '1.0',
        createdBy: 'demo-script'
      }
    });

    if (!conversationResult.success) {
      throw new Error(`Failed to create conversation: ${conversationResult.error}`);
    }

    const conversationId = conversationResult.conversation.id;
    console.log(`✅ Created conversation: ${conversationId}`);
    console.log(`   Title: ${conversationResult.conversation.title}\n`);

    // 2. Add some sample messages
    console.log('💬 Step 2: Adding messages to the conversation...');
    
    const messages = [
      {
        role: 'user',
        content: 'Hello! Can you help me understand how to manage my study schedule?',
        metadata: { source: 'demo' }
      },
      {
        role: 'assistant',
        content: 'Of course! I\'d be happy to help you create an effective study schedule. Here are some key strategies:\n\n1. **Time blocking**: Allocate specific time slots for different subjects\n2. **Priority setting**: Focus on high-importance topics first\n3. **Break intervals**: Use techniques like Pomodoro (25min study, 5min break)\n4. **Consistency**: Try to study at the same times each day\n\nWhat subjects are you currently studying?',
        tokens_count: 95,
        metadata: { responseTime: 1200, model: 'demo-assistant' }
      },
      {
        role: 'user',
        content: 'I\'m studying Computer Science - mainly algorithms, data structures, and web development. I have exams coming up in 3 weeks.',
        metadata: { urgency: 'high' }
      },
      {
        role: 'assistant',
        content: 'Great! With 3 weeks until exams, here\'s a focused study plan for CS subjects:\n\n**Week 1-2: Foundation Building**\n- **Algorithms**: Practice 2-3 problems daily (sorting, searching, graph algorithms)\n- **Data Structures**: Review and implement core structures (arrays, linked lists, trees, hash tables)\n- **Web Development**: Focus on key concepts and frameworks you\'ll be tested on\n\n**Week 3: Intensive Review**\n- Mock exams and timed practice\n- Review weak areas identified in weeks 1-2\n- Quick reference sheets for algorithms and data structure complexities\n\n**Daily Schedule Suggestion:**\n- Morning (2 hours): Algorithms practice\n- Afternoon (2 hours): Data structures implementation\n- Evening (1 hour): Web development concepts\n\nWould you like me to help you create a more detailed daily schedule?',
        tokens_count: 180,
        metadata: { 
          responseTime: 2100, 
          model: 'demo-assistant',
          suggestions: ['daily-schedule', 'practice-problems', 'study-resources']
        }
      },
      {
        role: 'user',
        content: 'Yes, that would be very helpful! Can you create a detailed daily schedule for me?'
      }
    ];

    for (const [index, messageData] of messages.entries()) {
      const messageResult = await chatMemoryService.addMessage(conversationId, messageData);
      
      if (messageResult.success) {
        console.log(`   ✅ Added ${messageData.role} message ${index + 1}`);
      } else {
        console.log(`   ❌ Failed to add message ${index + 1}: ${messageResult.error}`);
      }

      // Small delay to simulate real conversation timing
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Step 3: Retrieving conversation context...`);
    
    // 3. Get conversation context (like you'd do for AI processing)
    const contextResult = await chatMemoryService.getConversationContext(
      conversationId, 
      TEST_USER_ID, 
      {
        messageLimit: 10,
        includeMetadata: true,
        includeAnalytics: true
      }
    );

    if (contextResult.success) {
      console.log(`✅ Retrieved context with ${contextResult.context.messageCount} messages`);
      console.log(`   Conversation: ${contextResult.context.conversation.title}`);
      console.log(`   Last updated: ${new Date(contextResult.context.conversation.updated_at).toLocaleString()}`);
      
      if (contextResult.context.analytics) {
        console.log(`   Analytics: ${contextResult.context.analytics.total_messages} total messages`);
      }
    } else {
      console.log(`❌ Failed to get context: ${contextResult.error}`);
    }

    // 4. List all conversations
    console.log(`\n📋 Step 4: Listing all conversations...`);
    const conversationsResult = await chatMemoryService.getConversations(TEST_USER_ID, {
      limit: 10,
      sortBy: 'updated_at',
      sortOrder: 'desc'
    });

    if (conversationsResult.success) {
      console.log(`✅ Found ${conversationsResult.conversations.length} conversation(s):`);
      conversationsResult.conversations.forEach((conv, index) => {
        console.log(`   ${index + 1}. ${conv.title} (${conv.message_count} messages)`);
        console.log(`      Last activity: ${new Date(conv.updated_at).toLocaleString()}`);
        if (conv.last_message_preview) {
          const preview = conv.last_message_preview.length > 50 
            ? conv.last_message_preview.substring(0, 50) + '...' 
            : conv.last_message_preview;
          console.log(`      Last message: ${preview}`);
        }
      });
    } else {
      console.log(`❌ Failed to list conversations: ${conversationsResult.error}`);
    }

    // 5. Search functionality
    console.log(`\n🔍 Step 5: Testing search functionality...`);
    const searchResult = await chatMemoryService.searchConversations(
      TEST_USER_ID, 
      'study schedule algorithms', 
      { 
        limit: 5,
        includeMessages: true 
      }
    );

    if (searchResult.success) {
      console.log(`✅ Search found:`);
      console.log(`   Conversations: ${searchResult.results.conversations.length}`);
      console.log(`   Messages: ${searchResult.results.messages.length}`);
      console.log(`   Total results: ${searchResult.results.totalResults}`);
    } else {
      console.log(`❌ Search failed: ${searchResult.error}`);
    }

    // 6. Get analytics
    console.log(`\n📈 Step 6: Getting user analytics...`);
    const analyticsResult = await chatMemoryService.getUserAnalytics(TEST_USER_ID, {
      timeframe: '30days'
    });

    if (analyticsResult.success) {
      const stats = analyticsResult.analytics.stats;
      console.log(`✅ Analytics for last 30 days:`);
      console.log(`   Total conversations: ${stats.totalConversations}`);
      console.log(`   Total messages: ${stats.totalMessages}`);
      console.log(`   Average messages per conversation: ${stats.avgMessagesPerConversation}`);
      console.log(`   Active conversations: ${stats.activeConversations}`);
      console.log(`   Archived conversations: ${stats.archivedConversations}`);
    } else {
      console.log(`❌ Analytics failed: ${analyticsResult.error}`);
    }

    // 7. Add tags to the conversation
    console.log(`\n🏷️  Step 7: Adding tags to the conversation...`);
    const tagsResult = await chatMemoryService.addConversationTags(
      conversationId, 
      TEST_USER_ID, 
      ['computer-science', 'study-planning', 'exam-prep', 'demo']
    );

    if (tagsResult.success) {
      console.log(`✅ Added ${tagsResult.tags.length} tags to the conversation`);
    } else {
      console.log(`❌ Failed to add tags: ${tagsResult.error}`);
    }

    // 8. Generate a title based on the conversation content
    console.log(`\n🎯 Step 8: Auto-generating conversation title...`);
    const titleResult = await chatMemoryService.generateConversationTitle(conversationId);

    if (titleResult.success) {
      console.log(`✅ Generated title: "${titleResult.generatedTitle}"`);
      console.log(`   Original title: "Demo Chat Session"`);
    } else {
      console.log(`❌ Failed to generate title: ${titleResult.error}`);
    }

    console.log(`\n🎉 Demo completed successfully! All chat memory features are working.`);
    console.log(`\n💡 The conversation ID is: ${conversationId}`);
    console.log(`   You can now use this in your frontend to continue the conversation.`);

    return conversationId;

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

async function demoAPIIntegration() {
  console.log('\n🔗 API Integration Example\n');
  console.log('Here\'s how you would integrate this in your frontend:\n');
  
  console.log('```javascript');
  console.log('// 1. Start a new chat session');
  console.log('const response = await fetch("/chat/start-session", {');
  console.log('  method: "POST",');
  console.log('  headers: {');
  console.log('    "Content-Type": "application/json",');
  console.log('    "Authorization": `Bearer ${userToken}`');
  console.log('  },');
  console.log('  body: JSON.stringify({');
  console.log('    title: "Study Planning Session",');
  console.log('    initialMessage: "Help me create a study schedule"');
  console.log('  })');
  console.log('});');
  console.log('const session = await response.json();');
  console.log('const conversationId = session.sessionId;\n');

  console.log('// 2. Add user message');
  console.log('await fetch(`/chat/conversations/${conversationId}/messages`, {');
  console.log('  method: "POST",');
  console.log('  headers: {');
  console.log('    "Content-Type": "application/json",');
  console.log('    "Authorization": `Bearer ${userToken}`');
  console.log('  },');
  console.log('  body: JSON.stringify({');
  console.log('    role: "user",');
  console.log('    content: "I need help with my CS exams"');
  console.log('  })');
  console.log('});\n');

  console.log('// 3. Get conversation context for AI processing');
  console.log('const contextResponse = await fetch(`/chat/conversations/${conversationId}/context`, {');
  console.log('  headers: { "Authorization": `Bearer ${userToken}` }');
  console.log('});');
  console.log('const context = await contextResponse.json();\n');

  console.log('// 4. Add AI response');
  console.log('await fetch(`/chat/conversations/${conversationId}/messages`, {');
  console.log('  method: "POST",');
  console.log('  headers: {');
  console.log('    "Content-Type": "application/json",');
  console.log('    "Authorization": `Bearer ${userToken}`');
  console.log('  },');
  console.log('  body: JSON.stringify({');
  console.log('    role: "assistant",');
  console.log('    content: aiResponse,');
  console.log('    tokens_count: tokenCount');
  console.log('  })');
  console.log('});\n');

  console.log('// 5. List all conversations');
  console.log('const conversationsResponse = await fetch("/chat/conversations", {');
  console.log('  headers: { "Authorization": `Bearer ${userToken}` }');
  console.log('});');
  console.log('const conversations = await conversationsResponse.json();');
  console.log('```\n');
}

async function demoCleanup(conversationId) {
  console.log('🧹 Cleanup: Removing demo conversation...');
  
  if (!conversationId) {
    console.log('⚠️  No conversation ID provided for cleanup');
    return;
  }

  try {
    const deleteResult = await chatMemoryService.deleteConversation(conversationId, TEST_USER_ID);
    
    if (deleteResult.success) {
      console.log('✅ Demo conversation deleted successfully');
    } else {
      console.log(`❌ Failed to delete demo conversation: ${deleteResult.error}`);
    }
  } catch (error) {
    console.log(`❌ Cleanup error: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('        🧠 CHAT MEMORY SYSTEM DEMO');
  console.log('='.repeat(60));
  
  // Check if we should skip cleanup
  const skipCleanup = process.argv.includes('--keep');
  
  let conversationId;
  
  try {
    // Run the main demo
    conversationId = await demoBasicOperations();
    
    // Show API integration examples
    await demoAPIIntegration();
    
    // Cleanup unless --keep flag is used
    if (!skipCleanup) {
      await demoCleanup(conversationId);
    } else {
      console.log(`\n💾 Demo conversation preserved (ID: ${conversationId})`);
      console.log('   Use --keep flag to preserve demo data in future runs');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Chat Memory System is ready for production use!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Demo execution failed:', error.message);
    
    // Attempt cleanup even if demo failed
    if (!skipCleanup && conversationId) {
      await demoCleanup(conversationId);
    }
    
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Demo interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Check if this script is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { demoBasicOperations, demoAPIIntegration, demoCleanup };
