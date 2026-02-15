-- Edit / Extend feature: parent/root/version on conversations + conversation_revisions

-- 1. Add columns to conversations for continuation linking
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS parent_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS root_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_conversations_parent ON conversations(parent_conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_root ON conversations(root_conversation_id);

COMMENT ON COLUMN conversations.parent_conversation_id IS 'Parent post when this is a continuation (Part 2, etc.)';
COMMENT ON COLUMN conversations.root_conversation_id IS 'Root of the series (Part 1) for Part 3+';
COMMENT ON COLUMN conversations.version IS '1 = original; 2+ = Part 2, Part 3, etc.';

-- 2. Create conversation_revisions for edit history and rollback
CREATE TABLE IF NOT EXISTS   (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  editor_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_conversation_revisions_conversation_created
  ON conversation_revisions(conversation_id, created_at DESC);

COMMENT ON TABLE conversation_revisions IS 'Snapshot before each edit for rollback and Last updated';
