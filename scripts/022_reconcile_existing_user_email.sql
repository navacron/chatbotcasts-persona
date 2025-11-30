-- Migration: Reconcile existing user (chatbotcasts@gmail.com) for Clerk integration
-- This script helps prepare for email reconciliation when the user signs up with Clerk
--
-- IMPORTANT: This should be run BEFORE the user signs up with Clerk using chatbotcasts@gmail.com
-- The actual reconciliation will happen automatically via the sync function when they sign up

BEGIN;

-- Step 1: Find the existing user with chatbotcasts@gmail.com
-- This will show you the current user ID that needs to be reconciled
DO $$
DECLARE
  existing_user_id UUID;
  existing_email TEXT;
BEGIN
  SELECT id, email INTO existing_user_id, existing_email
  FROM public.users
  WHERE email = 'chatbotcasts@gmail.com'
  LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found existing user: ID=%, Email=%', existing_user_id, existing_email;
    RAISE NOTICE 'When this user signs up with Clerk using the same email,';
    RAISE NOTICE 'the sync function will automatically update this user ID to match the Clerk user ID.';
    RAISE NOTICE 'All related records (conversations, personas, billing_history) will be updated automatically.';
  ELSE
    RAISE NOTICE 'No existing user found with email: chatbotcasts@gmail.com';
    RAISE NOTICE 'A new user will be created when they sign up with Clerk.';
  END IF;
END $$;

-- Step 2: Create a helper function to manually reconcile if needed
-- This can be used if automatic reconciliation doesn't work
CREATE OR REPLACE FUNCTION public.reconcile_user_email(
  old_user_id UUID,
  new_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update conversations
  UPDATE public.conversations
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  -- Update personas
  UPDATE public.persona
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  -- Update billing_history
  UPDATE public.billing_history
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  -- Update the user record itself
  UPDATE public.users
  SET id = new_user_id
  WHERE id = old_user_id;

  RAISE NOTICE 'User reconciled: % -> %', old_user_id, new_user_id;
END;
$$;

-- Step 3: Add index on email for faster lookups during reconciliation
CREATE INDEX IF NOT EXISTS idx_users_email_lookup ON public.users(email);

COMMIT;

-- Usage Notes:
-- 1. When chatbotcasts@gmail.com signs up with Clerk, the webhook will automatically call syncClerkUserToDatabase()
-- 2. The sync function will detect the email match and update the user ID
-- 3. All related records will be automatically updated
-- 4. If automatic reconciliation fails, you can manually call:
--    SELECT public.reconcile_user_email('old-uuid', 'new-clerk-uuid');

