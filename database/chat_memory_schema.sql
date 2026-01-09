-- ============================================================
-- CHAT MEMORY SYSTEM - SUPABASE SCHEMA
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CONVERSATIONS TABLE
-- Stores conversation sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Indexes
    CONSTRAINT conversations_title_length_check CHECK (char_length(title) >= 1),
    CONSTRAINT conversations_title_not_empty CHECK (trim(title) != '')
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(is_archived) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);

-- ============================================================
-- MESSAGES TABLE
-- Stores individual messages within conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'function')),
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'json', 'markdown', 'html')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tokens_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Additional fields for context and features
    parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    edit_count INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT messages_content_not_empty CHECK (trim(content) != ''),
    CONSTRAINT messages_tokens_non_negative CHECK (tokens_count >= 0),
    CONSTRAINT messages_edit_count_non_negative CHECK (edit_count >= 0)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages(parent_message_id);

-- Full-text search index for message content
CREATE INDEX IF NOT EXISTS idx_messages_content_fts ON messages USING gin(to_tsvector('english', content));

-- ============================================================
-- CONVERSATION_TAGS TABLE
-- For organizing and categorizing conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tag_name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280', -- Hex color code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate tags per conversation
    UNIQUE(conversation_id, tag_name),
    
    -- Constraints
    CONSTRAINT tag_name_format CHECK (tag_name ~ '^[a-zA-Z0-9_-]+$'),
    CONSTRAINT tag_name_length CHECK (char_length(tag_name) BETWEEN 1 AND 50),
    CONSTRAINT color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_conversation_tags_conversation_id ON conversation_tags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_name ON conversation_tags(tag_name);

-- ============================================================
-- CONVERSATION_ANALYTICS TABLE
-- Track usage statistics and analytics
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Analytics data
    total_messages INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_user_messages INTEGER DEFAULT 0,
    total_assistant_messages INTEGER DEFAULT 0,
    
    -- Duration tracking
    session_duration_seconds INTEGER DEFAULT 0,
    first_message_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    
    -- Performance metrics
    avg_response_time_ms INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT analytics_non_negative_counts CHECK (
        total_messages >= 0 AND 
        total_tokens >= 0 AND 
        total_user_messages >= 0 AND 
        total_assistant_messages >= 0 AND
        session_duration_seconds >= 0
    )
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_conversation_id ON conversation_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_user_id ON conversation_analytics(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_analytics_unique ON conversation_analytics(conversation_id);

-- ============================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================

-- Function to update conversation's updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = NOW() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp when messages are added
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON messages;
CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- Function to update conversation analytics
CREATE OR REPLACE FUNCTION update_conversation_analytics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO conversation_analytics (
        conversation_id, 
        user_id, 
        total_messages, 
        total_user_messages, 
        total_assistant_messages,
        first_message_at,
        last_message_at
    )
    SELECT 
        NEW.conversation_id,
        c.user_id,
        COUNT(m.id),
        COUNT(m.id) FILTER (WHERE m.role = 'user'),
        COUNT(m.id) FILTER (WHERE m.role = 'assistant'),
        MIN(m.created_at),
        MAX(m.created_at)
    FROM conversations c
    LEFT JOIN messages m ON m.conversation_id = c.id
    WHERE c.id = NEW.conversation_id
    GROUP BY c.id, c.user_id
    ON CONFLICT (conversation_id) 
    DO UPDATE SET
        total_messages = EXCLUDED.total_messages,
        total_user_messages = EXCLUDED.total_user_messages,
        total_assistant_messages = EXCLUDED.total_assistant_messages,
        first_message_at = EXCLUDED.first_message_at,
        last_message_at = EXCLUDED.last_message_at,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update analytics when messages are added
DROP TRIGGER IF EXISTS trigger_update_conversation_analytics ON messages;
CREATE TRIGGER trigger_update_conversation_analytics
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_analytics();

-- Function to generate conversation title based on first few messages
CREATE OR REPLACE FUNCTION generate_conversation_title(conv_id UUID)
RETURNS VARCHAR(255) AS $$
DECLARE
    first_user_message TEXT;
    generated_title VARCHAR(255);
BEGIN
    -- Get the first user message content
    SELECT content INTO first_user_message
    FROM messages 
    WHERE conversation_id = conv_id AND role = 'user' 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF first_user_message IS NULL THEN
        RETURN 'New Conversation';
    END IF;
    
    -- Generate title from first 50 characters of first message
    generated_title := COALESCE(
        SUBSTRING(TRIM(first_user_message) FROM 1 FOR 50),
        'New Conversation'
    );
    
    -- Clean up the title
    IF LENGTH(generated_title) = 50 THEN
        generated_title := generated_title || '...';
    END IF;
    
    RETURN generated_title;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analytics ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" ON conversations
    FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = messages.conversation_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = messages.conversation_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update messages in their conversations" ON messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = messages.conversation_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete messages in their conversations" ON messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = messages.conversation_id 
            AND user_id = auth.uid()
        )
    );

-- Conversation tags policies
CREATE POLICY "Users can manage tags in their conversations" ON conversation_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = conversation_tags.conversation_id 
            AND user_id = auth.uid()
        )
    );

-- Analytics policies
CREATE POLICY "Users can view their conversation analytics" ON conversation_analytics
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- SAMPLE DATA FUNCTIONS
-- ============================================================

-- Function to create a sample conversation (useful for testing)
CREATE OR REPLACE FUNCTION create_sample_conversation(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    conv_id UUID;
BEGIN
    -- Create conversation
    INSERT INTO conversations (user_id, title, summary)
    VALUES (p_user_id, 'Sample Conversation', 'A sample conversation for testing')
    RETURNING id INTO conv_id;
    
    -- Add sample messages
    INSERT INTO messages (conversation_id, role, content) VALUES
    (conv_id, 'user', 'Hello! Can you help me with managing my expenses?'),
    (conv_id, 'assistant', 'Of course! I''d be happy to help you manage your expenses. I can help you track spending, set budgets, analyze patterns, and provide insights. What specific aspect of expense management would you like to focus on?'),
    (conv_id, 'user', 'I want to set a monthly budget and track my spending by categories.'),
    (conv_id, 'assistant', 'Great choice! Setting up a monthly budget with category tracking is an excellent way to manage your finances. Here''s how we can get started:

1. **Monthly Budget**: First, let''s determine your total monthly income and set a realistic budget amount.
2. **Categories**: We can create categories like Food, Transportation, Entertainment, Bills, etc.
3. **Tracking**: I''ll help you log expenses and monitor your spending against each category limit.

What''s your approximate monthly income, and do you have any existing spending categories in mind?');
    
    RETURN conv_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================

-- View for conversation summaries with latest message info
CREATE OR REPLACE VIEW conversation_summaries AS
SELECT 
    c.id,
    c.user_id,
    c.title,
    c.summary,
    c.created_at,
    c.updated_at,
    c.is_archived,
    COALESCE(a.total_messages, 0) as message_count,
    COALESCE(a.total_user_messages, 0) as user_message_count,
    COALESCE(a.total_assistant_messages, 0) as assistant_message_count,
    a.last_message_at,
    (
        SELECT content 
        FROM messages m 
        WHERE m.conversation_id = c.id 
        ORDER BY m.created_at DESC 
        LIMIT 1
    ) as last_message_preview
FROM conversations c
LEFT JOIN conversation_analytics a ON a.conversation_id = c.id
ORDER BY c.updated_at DESC;

-- View for message threads with conversation context
CREATE OR REPLACE VIEW message_threads AS
SELECT 
    m.id,
    m.conversation_id,
    c.title as conversation_title,
    c.user_id,
    m.role,
    m.content,
    m.content_type,
    m.created_at,
    m.tokens_count,
    m.metadata,
    m.parent_message_id,
    m.is_edited,
    m.edit_count,
    ROW_NUMBER() OVER (PARTITION BY m.conversation_id ORDER BY m.created_at) as message_order
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
ORDER BY c.updated_at DESC, m.created_at ASC;

-- ============================================================
-- CLEANUP AND MAINTENANCE FUNCTIONS
-- ============================================================

-- Function to archive old conversations
CREATE OR REPLACE FUNCTION archive_old_conversations(days_threshold INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    UPDATE conversations 
    SET is_archived = TRUE, updated_at = NOW()
    WHERE updated_at < (NOW() - INTERVAL '1 day' * days_threshold)
    AND is_archived = FALSE;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to delete very old archived conversations
CREATE OR REPLACE FUNCTION cleanup_old_conversations(days_threshold INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM conversations 
    WHERE updated_at < (NOW() - INTERVAL '1 day' * days_threshold)
    AND is_archived = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- GRANTS AND PERMISSIONS
-- ============================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_tags TO authenticated;
GRANT SELECT ON conversation_analytics TO authenticated;
GRANT SELECT ON conversation_summaries TO authenticated;
GRANT SELECT ON message_threads TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE conversations IS 'Stores chat conversation sessions with metadata and organization features';
COMMENT ON TABLE messages IS 'Individual messages within conversations, supporting various content types and threading';
COMMENT ON TABLE conversation_tags IS 'Tags for organizing and categorizing conversations';
COMMENT ON TABLE conversation_analytics IS 'Analytics and usage statistics for conversations';
COMMENT ON VIEW conversation_summaries IS 'Summary view of conversations with message counts and preview';
COMMENT ON VIEW message_threads IS 'Messages with conversation context and ordering';

COMMENT ON FUNCTION generate_conversation_title(UUID) IS 'Automatically generates a conversation title based on the first user message';
COMMENT ON FUNCTION archive_old_conversations(INTEGER) IS 'Archives conversations older than specified days threshold';
COMMENT ON FUNCTION cleanup_old_conversations(INTEGER) IS 'Permanently deletes very old archived conversations';
