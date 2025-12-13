-- Diagnostic query: Find ID mismatch between Clerk and database
-- This helps identify if the wrong ID field is being used

-- Check all users with chatbotcasts@gmail.com
SELECT 
  id,
  email,
  display_name,
  created_at,
  CASE 
    WHEN id::text LIKE 'user_%' THEN 'Clerk format'
    WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'UUID format'
    ELSE 'Other format'
  END as id_format,
  LENGTH(id::text) as id_length
FROM public.users
WHERE email = 'chatbotcasts@gmail.com'
ORDER BY created_at DESC;

-- Check webhook logs for the actual Clerk user ID
-- Look in your Vercel logs for: "[clerk-webhook] Clerk User ID from webhook:"
-- That ID should match what's in the database

-- If there's a mismatch:
-- 1. Get the Clerk User ID from Clerk Dashboard (Users → [Your User] → User ID)
-- 2. Compare with what's stored in database (run query above)
-- 3. If different, use script 027_update_chatbotcasts_user_id.sql to fix it


