-- Helper query: Find Clerk user ID for chatbotcasts@gmail.com
-- Run this first to get your Clerk user ID, then use it in 027_update_chatbotcasts_user_id.sql

-- Option 1: If you've already signed up with Clerk, find the new user ID
SELECT 
  id as clerk_user_id,
  email,
  display_name,
  created_at
FROM public.users
WHERE email = 'chatbotcasts@gmail.com'
ORDER BY created_at DESC
LIMIT 5;

-- Option 2: Find the old user ID (before Clerk)
SELECT 
  id as old_user_id,
  email,
  display_name,
  created_at
FROM public.users
WHERE email = 'chatbotcasts@gmail.com'
ORDER BY created_at ASC
LIMIT 5;

-- Option 3: See all users with this email (to compare old vs new)
SELECT 
  id,
  email,
  display_name,
  created_at,
  CASE 
    WHEN id::text LIKE 'user_%' THEN 'Clerk User ID'
    ELSE 'Old UUID'
  END as id_type
FROM public.users
WHERE email = 'chatbotcasts@gmail.com'
ORDER BY created_at DESC;


