-- Migration Script: Add persona entries for all migrated conversations
-- This script creates entries in conversation_personas for each conversation
-- migrated from mongo_posts_raw, associating them with ChatBotCast Host and Oz Phd

-- First, let's see how many conversations need persona associations
DO $$
DECLARE
  conversation_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conversation_count
  FROM conversations
  WHERE user_id = '4c1c8bd3-465a-46e5-9966-67a99856ee5c';
  
  RAISE NOTICE 'Found % conversations to add personas to', conversation_count;
END $$;

-- Insert ChatBotCast Host persona for all migrated conversations
INSERT INTO conversation_personas (conversation_id, persona_id, created_at)
SELECT 
  c.id AS conversation_id,
  'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c'::uuid AS persona_id, -- ChatBotCast Host
  NOW() AS created_at
FROM conversations c
WHERE c.user_id = '4c1c8bd3-465a-46e5-9966-67a99856ee5c'
  AND NOT EXISTS (
    SELECT 1 FROM conversation_personas cp
    WHERE cp.conversation_id = c.id 
      AND cp.persona_id = 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c'::uuid
  )
ON CONFLICT DO NOTHING;

-- Get the count of ChatBotCast Host entries added
DO $$
DECLARE
  host_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO host_count
  FROM conversation_personas
  WHERE persona_id = 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c'::uuid
    AND conversation_id IN (
      SELECT id FROM conversations WHERE user_id = '4c1c8bd3-465a-46e5-9966-67a99856ee5c'
    );
  
  RAISE NOTICE 'Added/Found % ChatBotCast Host persona entries', host_count;
END $$;

-- IMPORTANT: Update the persona_id below with the correct ID for Oz Phd
-- Currently using placeholder: 'REPLACE-WITH-OZ-PHD-PERSONA-ID'
-- You can find the correct persona_id by running: SELECT id, name FROM persona WHERE name ILIKE '%oz%';

INSERT INTO conversation_personas (conversation_id, persona_id, created_at)
SELECT 
  c.id AS conversation_id,
  'ebacfcb0-ccea-41d5-8e4a-5cb4099f4f4e'::uuid AS persona_id, -- Oz Phd (UPDATE THIS ID)
  NOW() AS created_at
FROM conversations c
WHERE c.user_id = '4c1c8bd3-465a-46e5-9966-67a99856ee5c'
  AND NOT EXISTS (
    SELECT 1 FROM conversation_personas cp
    WHERE cp.conversation_id = c.id 
      AND cp.persona_id = 'ebacfcb0-ccea-41d5-8e4a-5cb4099f4f4e'::uuid
  )
ON CONFLICT DO NOTHING;

-- Get the count of Oz Phd entries added
DO $$
DECLARE
  oz_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO oz_count
  FROM conversation_personas
  WHERE persona_id = 'ebacfcb0-ccea-41d5-8e4a-5cb4099f4f4e'::uuid
    AND conversation_id IN (
      SELECT id FROM conversations WHERE user_id = '4c1c8bd3-465a-46e5-9966-67a99856ee5c'
    );
  
  RAISE NOTICE 'Added/Found % Oz Phd persona entries', oz_count;
END $$;

-- Verification: Check that each conversation has exactly 2 personas
SELECT 
  c.id,
  c.title,
  c.slug,
  COUNT(cp.persona_id) as persona_count,
  ARRAY_AGG(p.name) as persona_names
FROM conversations c
LEFT JOIN conversation_personas cp ON c.id = cp.conversation_id
LEFT JOIN persona p ON cp.persona_id = p.id
WHERE c.user_id = '4c1c8bd3-465a-46e5-9966-67a99856ee5c'
GROUP BY c.id, c.title, c.slug
ORDER BY c.created_at DESC
LIMIT 10;

-- Final summary
DO $$
DECLARE
  total_conversations INTEGER;
  total_persona_entries INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_conversations
  FROM conversations
  WHERE user_id = '4c1c8bd3-465a-46e5-9966-67a99856ee5c';
  
  SELECT COUNT(*) INTO total_persona_entries
  FROM conversation_personas
  WHERE conversation_id IN (
    SELECT id FROM conversations WHERE user_id = '4c1c8bd3-465a-46e5-9966-67a99856ee5c'
  );
  
  RAISE NOTICE '=== Migration Complete ===';
  RAISE NOTICE 'Total migrated conversations: %', total_conversations;
  RAISE NOTICE 'Total persona entries: %', total_persona_entries;
  RAISE NOTICE 'Expected persona entries: % (2 per conversation)', total_conversations * 2;
END $$;
