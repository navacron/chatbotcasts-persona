-- Migration: Update RLS policies to work with Clerk authentication
-- Since Clerk doesn't use auth.users, we need to update RLS policies
-- to work with Clerk user IDs stored in public.users
--
-- Note: Some policies will need to be updated in application code
-- to pass Clerk user ID as a parameter, but this migration updates
-- the database-level policies that can be updated

BEGIN;

-- Step 1: Update users table RLS policies
-- These policies currently use auth.uid() which won't work with Clerk
-- We'll make them more permissive and handle auth in application code

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Create new policies that work with service role (for API routes)
-- Application code will handle Clerk authentication checks
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (true); -- Application code will filter by Clerk user ID

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (true); -- Application code will verify Clerk user ID matches

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (true); -- Application code will verify Clerk user ID

-- Step 2: Update conversations RLS policies
-- These will be handled in application code, but we'll make them permissive
DROP POLICY IF EXISTS "conversations_select_public" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_delete_own" ON public.conversations;

-- Create permissive policies (auth handled in application code)
CREATE POLICY "conversations_select_public"
  ON public.conversations FOR SELECT
  USING (is_public = true OR true); -- Application code will filter by user_id

CREATE POLICY "conversations_insert_own"
  ON public.conversations FOR INSERT
  WITH CHECK (true); -- Application code will set user_id from Clerk

CREATE POLICY "conversations_update_own"
  ON public.conversations FOR UPDATE
  USING (true); -- Application code will verify user_id matches Clerk user

CREATE POLICY "conversations_delete_own"
  ON public.conversations FOR DELETE
  USING (true); -- Application code will verify user_id matches Clerk user

-- Step 3: Update persona RLS policies
DROP POLICY IF EXISTS persona_select_own ON public.persona;
DROP POLICY IF EXISTS persona_select_public ON public.persona;
DROP POLICY IF EXISTS persona_insert_own ON public.persona;
DROP POLICY IF EXISTS persona_update_own ON public.persona;
DROP POLICY IF EXISTS persona_delete_own ON public.persona;

CREATE POLICY persona_select_public
  ON public.persona FOR SELECT
  USING (is_public = true OR true); -- Application code will filter by user_id

CREATE POLICY persona_insert_own
  ON public.persona FOR INSERT
  WITH CHECK (true); -- Application code will set user_id from Clerk

CREATE POLICY persona_update_own
  ON public.persona FOR UPDATE
  USING (true); -- Application code will verify user_id matches Clerk user

CREATE POLICY persona_delete_own
  ON public.persona FOR DELETE
  USING (true); -- Application code will verify user_id matches Clerk user

-- Step 4: Update conversation_personas RLS policies
DROP POLICY IF EXISTS conversation_personas_select_own ON public.conversation_personas;
DROP POLICY IF EXISTS conversation_personas_select_public ON public.conversation_personas;
DROP POLICY IF EXISTS conversation_personas_insert_own ON public.conversation_personas;
DROP POLICY IF EXISTS conversation_personas_delete_own ON public.conversation_personas;

CREATE POLICY conversation_personas_select_public
  ON public.conversation_personas FOR SELECT
  USING (true); -- Application code will filter appropriately

CREATE POLICY conversation_personas_insert_own
  ON public.conversation_personas FOR INSERT
  WITH CHECK (true); -- Application code will verify ownership

CREATE POLICY conversation_personas_delete_own
  ON public.conversation_personas FOR DELETE
  USING (true); -- Application code will verify ownership

COMMIT;

-- IMPORTANT NOTES:
-- 1. These policies are permissive because Clerk authentication is handled in application code
-- 2. All API routes must verify Clerk user ID before performing operations
-- 3. The service role key is used in API routes to bypass RLS when needed
-- 4. Application code should always check: user_id matches the authenticated Clerk user ID

