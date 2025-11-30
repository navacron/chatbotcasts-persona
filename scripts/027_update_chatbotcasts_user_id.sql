-- Migration: Update user ID for chatbotcasts@gmail.com to new Clerk user ID
-- This reconciles the existing user with their new Clerk account
--
-- USAGE:
-- 1. Find your Clerk user ID from Clerk Dashboard or webhook logs
--    Format: "user_36DPxyaWa4kfWtOz7zjamGG0ygW" (starts with "user_")
-- 2. Replace 'YOUR_CLERK_USER_ID_HERE' below with your actual Clerk user ID
-- 3. Run this script

BEGIN;

-- ⚠️ REPLACE THIS with your actual Clerk user ID
-- You can find it in:
-- - Clerk Dashboard → Users → Select your user → Copy the User ID
-- - Webhook logs (look for "id": "user_...")
-- - After signing up, check the users table for the new ID
DO $$
DECLARE
  old_user_id TEXT;
  new_clerk_user_id TEXT := 'YOUR_CLERK_USER_ID_HERE'; -- ⚠️ REPLACE THIS
  user_email TEXT := 'chatbotcasts@gmail.com';
  conversations_updated INTEGER;
  personas_updated INTEGER;
  billing_updated INTEGER;
BEGIN
  -- Validate that Clerk user ID was replaced
  IF new_clerk_user_id = 'YOUR_CLERK_USER_ID_HERE' THEN
    RAISE EXCEPTION 'Please replace YOUR_CLERK_USER_ID_HERE with your actual Clerk user ID (e.g., "user_36DPxyaWa4kfWtOz7zjamGG0ygW")';
  END IF;

  -- Get the old user ID
  SELECT id INTO old_user_id
  FROM public.users
  WHERE email = user_email
  LIMIT 1;

  IF old_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Make sure the user exists in the database.', user_email;
  END IF;

  IF old_user_id = new_clerk_user_id THEN
    RAISE NOTICE 'User ID is already set to %. No update needed.', new_clerk_user_id;
    RETURN;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Reconciling user: %', user_email;
  RAISE NOTICE 'Old User ID: %', old_user_id;
  RAISE NOTICE 'New Clerk User ID: %', new_clerk_user_id;
  RAISE NOTICE '========================================';

  -- Step 1: Update all foreign key references (must be done before updating users table)
  
  -- Update conversations
  UPDATE public.conversations
  SET user_id = new_clerk_user_id
  WHERE user_id = old_user_id;
  GET DIAGNOSTICS conversations_updated = ROW_COUNT;
  RAISE NOTICE '✓ Updated conversations: % rows', conversations_updated;

  -- Update personas
  UPDATE public.persona
  SET user_id = new_clerk_user_id
  WHERE user_id = old_user_id;
  GET DIAGNOSTICS personas_updated = ROW_COUNT;
  RAISE NOTICE '✓ Updated personas: % rows', personas_updated;

  -- Update billing_history
  UPDATE public.billing_history
  SET user_id = new_clerk_user_id
  WHERE user_id = old_user_id;
  GET DIAGNOSTICS billing_updated = ROW_COUNT;
  RAISE NOTICE '✓ Updated billing_history: % rows', billing_updated;

  -- Step 2: Update the user record itself (this must be last)
  UPDATE public.users
  SET id = new_clerk_user_id,
      updated_at = NOW()
  WHERE id = old_user_id;

  RAISE NOTICE '✓ Updated users table';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Reconciliation complete!';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Conversations: %', conversations_updated;
  RAISE NOTICE '  - Personas: %', personas_updated;
  RAISE NOTICE '  - Billing History: %', billing_updated;
  RAISE NOTICE '  - User ID: % → %', old_user_id, new_clerk_user_id;
  RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verification query (run this after the migration to verify):
-- SELECT 
--   u.id, 
--   u.email, 
--   u.display_name,
--   (SELECT COUNT(*) FROM public.conversations WHERE user_id = u.id) as conversation_count,
--   (SELECT COUNT(*) FROM public.persona WHERE user_id = u.id) as persona_count,
--   (SELECT COUNT(*) FROM public.billing_history WHERE user_id = u.id) as billing_count
-- FROM public.users u
-- WHERE u.email = 'chatbotcasts@gmail.com';

