-- Add category_id to conversations table
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES category(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversations_category_id ON conversations(category_id);

-- Set default category to "Other" for existing conversations
UPDATE conversations 
SET category_id = (SELECT id FROM category WHERE slug = 'other')
WHERE category_id IS NULL;

-- Set default category for new conversations
ALTER TABLE conversations 
  ALTER COLUMN category_id SET DEFAULT (SELECT id FROM category WHERE slug = 'other');
