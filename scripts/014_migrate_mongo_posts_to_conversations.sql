-- Migration script to move data from mongo_posts_raw to conversations table
-- This script extracts JSON data from mongo_posts_raw.data and populates conversations table

DO $$
DECLARE
  mongo_record RECORD;
  new_conversation_id UUID;
  mongo_data JSONB;
BEGIN
  -- Loop through all records in mongo_posts_raw
  FOR mongo_record IN SELECT id, data FROM mongo_posts_raw
  LOOP
    BEGIN
      mongo_data := mongo_record.data;
      
      -- Insert into conversations table
      INSERT INTO conversations (
        id,
        title,
        topic,
        description,
        slug,
        data,
        is_public,
        user_id,
        created_at,
        updated_at,
        view_count
      )
      VALUES (
        gen_random_uuid(), -- Generate new UUID for conversation
        COALESCE(mongo_data->>'title', 'Untitled Conversation'), -- Extract title from JSON
        COALESCE(mongo_data->>'topic', mongo_data->>'title', 'General Discussion'), -- Use topic or title
        COALESCE(mongo_data->>'description', mongo_data->>'content', 'No description available'), -- Extract description
        COALESCE(mongo_data->>'slug', 'conversation-' || substr(gen_random_uuid()::text, 1, 8)), -- Extract slug or generate one
        mongo_data, -- Store full JSON data
        true, -- Set is_public to true
        '4c1c8bd3-465a-46e5-9966-67a99856ee5c'::uuid, -- User ID as specified
        COALESCE((mongo_data->>'created_at')::timestamp, NOW()), -- Use created_at from JSON or current time
        COALESCE((mongo_data->>'updated_at')::timestamp, NOW()), -- Use updated_at from JSON or current time
        COALESCE((mongo_data->>'view_count')::integer, 0) -- Extract view_count or default to 0
      )
      RETURNING id INTO new_conversation_id;
      
      RAISE NOTICE 'Migrated mongo post % to conversation %', mongo_record.id, new_conversation_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error migrating mongo post %: %', mongo_record.id, SQLERRM;
      CONTINUE; -- Continue to next record even if this one fails
    END;
  END LOOP;
  
  RAISE NOTICE 'Migration complete!';
END $$;

-- Optional: Query to verify the migration
SELECT 
  COUNT(*) as total_conversations,
  COUNT(CASE WHEN user_id = '4c1c8bd3-465a-46e5-9966-67a99856ee5c'::uuid THEN 1 END) as migrated_conversations,
  COUNT(CASE WHEN is_public = true THEN 1 END) as public_conversations
FROM conversations;
