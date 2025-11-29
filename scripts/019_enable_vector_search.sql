-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column to conversations table
-- Using 1536 dimensions for OpenAI text-embedding-ada-002 model
-- If using a different model, adjust dimensions accordingly
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for fast similarity search using cosine distance
CREATE INDEX IF NOT EXISTS conversations_embedding_idx 
ON conversations 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create a function to search conversations by similarity
CREATE OR REPLACE FUNCTION search_conversations_by_similarity(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  slug text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    conversations.id,
    conversations.title,
    conversations.description,
    conversations.slug,
    1 - (conversations.embedding <=> query_embedding) as similarity
  FROM conversations
  WHERE conversations.embedding IS NOT NULL
    AND 1 - (conversations.embedding <=> query_embedding) > match_threshold
  ORDER BY conversations.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create a function to generate search text (title + description)
CREATE OR REPLACE FUNCTION get_conversation_search_text(conv conversations)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN COALESCE(conv.title, '') || ' ' || COALESCE(conv.description, '');
END;
$$;

COMMENT ON COLUMN conversations.embedding IS 'Vector embedding of title + description for semantic search';
COMMENT ON FUNCTION search_conversations_by_similarity IS 'Search conversations using vector similarity with cosine distance';
