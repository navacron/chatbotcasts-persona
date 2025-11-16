-- Add index on slug field for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversations_slug ON conversations(slug);

-- Add unique constraint on slug to prevent duplicates
ALTER TABLE conversations ADD CONSTRAINT unique_slug UNIQUE (slug);

-- Add comment
COMMENT ON COLUMN conversations.slug IS 'URL-friendly slug for the conversation, must be unique';
