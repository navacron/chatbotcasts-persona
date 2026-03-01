ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS audio_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS audio_error  TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_audio_status
  ON conversations (audio_status)
  WHERE is_public = true;

COMMENT ON COLUMN conversations.audio_status IS
  'Audio generation state: NULL=not started, processing, completed, failed';
COMMENT ON COLUMN conversations.audio_error IS
  'Error message when audio_status = failed';
