-- Add feature_image column to conversations table
-- This migration:
-- 1. Adds a feature_image column to store image URLs
-- 2. Populates feature_image from legacy MongoDB data for migrated records

-- Step 1: Add the feature_image column (defaults to NULL)
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS feature_image TEXT DEFAULT NULL;

RAISE NOTICE 'Added feature_image column to conversations table';

-- Step 2: Update feature_image from legacy data in mongo_posts_raw
-- For records that were migrated from MongoDB, extract feature_image from the JSON data
UPDATE conversations c
SET feature_image = (m.data->>'feature_image')
FROM mongo_posts_raw m
WHERE 
  c.slug = (m.data->>'slug')
  AND m.data->>'feature_image' IS NOT NULL
  AND m.data->>'feature_image' != '';

RAISE NOTICE 'Updated feature_image for migrated conversations from mongo_posts_raw';

-- Step 3: Verify the migration
DO $$
DECLARE
  total_conversations INT;
  conversations_with_images INT;
  migrated_with_images INT;
BEGIN
  -- Count total conversations
  SELECT COUNT(*) INTO total_conversations FROM conversations;
  
  -- Count conversations with feature images
  SELECT COUNT(*) INTO conversations_with_images 
  FROM conversations 
  WHERE feature_image IS NOT NULL;
  
  -- Count migrated conversations with feature images
  SELECT COUNT(*) INTO migrated_with_images
  FROM conversations c
  INNER JOIN mongo_posts_raw m ON c.slug = (m.data->>'slug')
  WHERE c.feature_image IS NOT NULL;
  
  RAISE NOTICE '=== Migration Summary ===';
  RAISE NOTICE 'Total conversations: %', total_conversations;
  RAISE NOTICE 'Conversations with feature_image: %', conversations_with_images;
  RAISE NOTICE 'Migrated conversations with feature_image: %', migrated_with_images;
END $$;

-- Step 4: Show sample of conversations with feature images
SELECT 
  id,
  title,
  slug,
  CASE 
    WHEN feature_image IS NOT NULL THEN LEFT(feature_image, 50) || '...'
    ELSE 'NULL'
  END as feature_image_preview,
  created_at
FROM conversations
ORDER BY created_at DESC
LIMIT 10;
