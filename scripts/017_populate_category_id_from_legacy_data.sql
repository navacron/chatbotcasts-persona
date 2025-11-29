-- Migration: Populate conversations.category_id from legacy data
-- This script matches the category field in conversations.data JSON to category.slug
-- and updates the conversations.category_id accordingly

DO $$
DECLARE
  updated_count INTEGER := 0;
  total_count INTEGER := 0;
BEGIN
  -- Count total conversations that need category_id populated
  SELECT COUNT(*) INTO total_count
  FROM conversations
  WHERE category_id IS NULL
    AND data->>'category' IS NOT NULL;
    
  RAISE NOTICE 'Found % conversations with missing category_id but have category in data', total_count;

  -- Update conversations.category_id by matching data->>'category' to category.slug
  UPDATE conversations c
  SET 
    category_id = cat.id,
    updated_at = NOW()
  FROM category cat
  WHERE c.category_id IS NULL
    AND c.data->>'category' IS NOT NULL
    AND c.data->>'category' = cat.slug;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE 'Successfully updated % conversations with category_id', updated_count;
  
  -- Show unmapped categories (if any)
  RAISE NOTICE 'Checking for unmapped categories...';
  
  PERFORM 1 FROM (
    SELECT DISTINCT data->>'category' as category_value
    FROM conversations
    WHERE category_id IS NULL
      AND data->>'category' IS NOT NULL
  ) unmapped
  WHERE NOT EXISTS (
    SELECT 1 FROM category WHERE slug = unmapped.category_value
  );
  
  IF FOUND THEN
    RAISE NOTICE 'Warning: Some categories in data do not match any category.slug';
  END IF;

END $$;

-- Verification: Show category distribution
SELECT 
  cat.name as category_name,
  cat.slug as category_slug,
  COUNT(c.id) as conversation_count
FROM conversations c
JOIN category cat ON c.category_id = cat.id
GROUP BY cat.id, cat.name, cat.slug
ORDER BY conversation_count DESC;

-- Show conversations still missing category_id
SELECT 
  COUNT(*) as conversations_without_category,
  COUNT(DISTINCT data->>'category') as unique_unmapped_categories
FROM conversations
WHERE category_id IS NULL;

-- Show sample of unmapped category values (if any)
SELECT DISTINCT 
  data->>'category' as unmapped_category_value,
  COUNT(*) as count
FROM conversations
WHERE category_id IS NULL
  AND data->>'category' IS NOT NULL
GROUP BY data->>'category'
ORDER BY count DESC
LIMIT 10;
