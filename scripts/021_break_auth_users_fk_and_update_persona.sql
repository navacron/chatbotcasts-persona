-- Migration: Break foreign key from users.id to auth.users.id
-- and update persona.user_id to reference users.id instead of auth.users.id
-- 
-- This migration:
-- 1. Ensures all persona.user_id values have corresponding entries in public.users
-- 2. Drops the foreign key constraint from persona.user_id to auth.users.id
-- 3. Adds a foreign key from persona.user_id to users.id
-- 4. Drops the foreign key constraint from users.id to auth.users.id

BEGIN;

-- Step 1: Ensure all persona.user_id values have corresponding entries in public.users
-- This handles any personas that might reference auth.users directly
-- We'll create missing users records for any persona.user_id that exists in auth.users but not in public.users
INSERT INTO public.users (id, email, display_name, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'display_name',
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    split_part(au.email, '@', 1)
  ) as display_name,
  au.created_at,
  NOW()
FROM auth.users au
INNER JOIN public.persona p ON p.user_id = au.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Verify all persona.user_id values exist in public.users
-- If any personas reference auth.users that don't exist in public.users, we've already created them in Step 1
-- This step is just a safety check - no actual update needed since IDs should match

-- Step 3: Drop the existing foreign key constraint from persona.user_id to auth.users.id
ALTER TABLE public.persona 
DROP CONSTRAINT IF EXISTS persona_user_id_fkey;

-- Step 4: Add a new foreign key constraint from persona.user_id to users.id
ALTER TABLE public.persona
ADD CONSTRAINT persona_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Step 5: Drop the foreign key constraint from users.id to auth.users.id
-- This makes users.id independent from auth.users.id
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Note: After this migration:
-- - public.users.id is no longer constrained to auth.users.id (foreign key removed)
-- - public.persona.user_id now references public.users.id instead of auth.users.id
-- - RLS policies will continue to work because they use auth.uid() which returns the same UUID
--   that exists in both auth.users and public.users (as long as IDs remain in sync)
--
-- IMPORTANT: You'll need to ensure users are synced between auth.users and public.users
-- The existing trigger (handle_new_user) should continue to work, but you may want to:
-- 1. Keep the trigger to auto-create public.users when auth.users are created
-- 2. Or manually manage the sync if you're using Clerk (which doesn't use auth.users)
--
-- If using Clerk, you'll need to sync Clerk user IDs to public.users manually
-- or create a webhook/function to handle Clerk user creation events

COMMIT;

