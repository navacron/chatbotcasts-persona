-- Verification query: Compare Clerk User ID with database
-- Use this to verify that the user ID in your database matches what's in Clerk Dashboard

-- Step 1: Check what's stored in your database for chatbotcasts@gmail.com
SELECT 
  id as stored_user_id,
  email,
  display_name,
  created_at,
  CASE 
    WHEN id::text LIKE 'user_%' THEN '✅ Clerk User ID (correct format)'
    WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '⚠️ Old UUID format (needs update)'
    ELSE '❓ Unknown format'
  END as id_type
FROM public.users
WHERE email = 'chatbotcasts@gmail.com'
ORDER BY created_at DESC;

-- Step 2: Compare with Clerk Dashboard
-- Go to Clerk Dashboard → Users → Find chatbotcasts@gmail.com → Copy the "User ID"
-- It should match the stored_user_id above (should start with "user_")

-- Step 3: Check what data is linked to this user
SELECT 
  u.id as user_id,
  u.email,
  (SELECT COUNT(*) FROM public.conversations WHERE user_id = u.id) as conversation_count,
  (SELECT COUNT(*) FROM public.persona WHERE user_id = u.id) as persona_count,
  (SELECT COUNT(*) FROM public.billing_history WHERE user_id = u.id) as billing_count
FROM public.users u
WHERE u.email = 'chatbotcasts@gmail.com';

-- Step 4: If the IDs don't match, you need to:
-- 1. Get the correct Clerk User ID from Clerk Dashboard
-- 2. Run script 027_update_chatbotcasts_user_id.sql with the correct ID

