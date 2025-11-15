-- Add slug column to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversations_slug ON conversations(slug);

-- Add comment
COMMENT ON COLUMN conversations.slug IS 'URL-friendly slug for the conversation';
