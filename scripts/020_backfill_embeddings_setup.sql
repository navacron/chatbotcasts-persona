-- This script prepares for backfilling embeddings
-- You'll need to run the actual embedding generation via your app/API
-- since it requires calling OpenAI API

-- Create a table to track embedding generation status
CREATE TABLE IF NOT EXISTS embedding_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert all conversations that need embeddings
INSERT INTO embedding_generation_log (conversation_id, status)
SELECT id, 'pending'
FROM conversations
WHERE embedding IS NULL
  AND title IS NOT NULL
  AND description IS NOT NULL
ON CONFLICT DO NOTHING;

-- Query to see which conversations need embeddings
SELECT 
  COUNT(*) as total_conversations,
  COUNT(embedding) as with_embeddings,
  COUNT(*) - COUNT(embedding) as missing_embeddings
FROM conversations;

-- Query to monitor embedding generation progress
SELECT 
  status,
  COUNT(*) as count
FROM embedding_generation_log
GROUP BY status
ORDER BY status;
