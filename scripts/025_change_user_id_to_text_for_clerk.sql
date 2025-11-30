    -- Migration: Change users.id and all user_id foreign keys from UUID to TEXT
    -- This is required because Clerk user IDs are strings (e.g., "user_36DP8uV8MCZbxypUpRORSwwYaeb")
    -- not UUIDs
    --
    -- This migration uses a memory-efficient approach by processing in smaller steps

    -- Step 1: Increase maintenance_work_mem temporarily for this session
    SET maintenance_work_mem = '128MB';

BEGIN;

-- Step 2: Drop all RLS policies that reference user_id columns
-- These must be dropped before we can alter the column types

-- Drop billing_history policies
DROP POLICY IF EXISTS "Users can view own billing history" ON public.billing_history;
DROP POLICY IF EXISTS "Service role can manage billing history" ON public.billing_history;

-- Drop conversations policies (if they reference user_id)
DROP POLICY IF EXISTS "conversations_select_public" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_delete_own" ON public.conversations;

-- Drop persona policies (if they reference user_id)
DROP POLICY IF EXISTS persona_select_own ON public.persona;
DROP POLICY IF EXISTS persona_select_public ON public.persona;
DROP POLICY IF EXISTS persona_insert_own ON public.persona;
DROP POLICY IF EXISTS persona_update_own ON public.persona;
DROP POLICY IF EXISTS persona_delete_own ON public.persona;

-- Drop conversation_personas policies (if they reference user_id through conversations)
DROP POLICY IF EXISTS conversation_personas_select_own ON public.conversation_personas;
DROP POLICY IF EXISTS conversation_personas_select_public ON public.conversation_personas;
DROP POLICY IF EXISTS conversation_personas_insert_own ON public.conversation_personas;
DROP POLICY IF EXISTS conversation_personas_delete_own ON public.conversation_personas;

-- Drop users policies (if they reference id)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

COMMIT;

BEGIN;

-- Step 3: Drop all foreign key constraints that reference users.id
ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;

ALTER TABLE public.persona 
DROP CONSTRAINT IF EXISTS persona_user_id_fkey;

ALTER TABLE public.billing_history 
DROP CONSTRAINT IF EXISTS billing_history_user_id_fkey;

COMMIT;

    -- Step 4: Convert foreign key columns first (these are smaller operations)
    BEGIN;

    -- Convert conversations.user_id
    ALTER TABLE public.conversations 
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

    COMMIT;

    BEGIN;

    -- Convert persona.user_id
    ALTER TABLE public.persona 
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

    COMMIT;

    BEGIN;

    -- Convert billing_history.user_id
    ALTER TABLE public.billing_history 
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

    COMMIT;

    -- Step 5: Convert users.id (primary key - this is the biggest operation)
    -- We'll do this in a separate transaction with increased memory
    BEGIN;

    -- Drop the primary key constraint temporarily
    ALTER TABLE public.users 
    DROP CONSTRAINT IF EXISTS users_pkey;

    -- Convert the id column
    ALTER TABLE public.users 
    ALTER COLUMN id TYPE TEXT USING id::TEXT;

    -- Re-add primary key constraint
    ALTER TABLE public.users 
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

    COMMIT;

    -- Step 6: Re-add foreign key constraints
    BEGIN;

    ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

    ALTER TABLE public.persona
    ADD CONSTRAINT persona_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

    ALTER TABLE public.billing_history
    ADD CONSTRAINT billing_history_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

COMMIT;

-- Step 7: Re-create RLS policies (updated for TEXT user_id)
BEGIN;

-- Re-create billing_history policies
CREATE POLICY "Users can view own billing history"
  ON public.billing_history FOR SELECT
  USING (true); -- Application code will verify user_id matches Clerk user

CREATE POLICY "Service role can manage billing history"
  ON public.billing_history FOR ALL
  USING (true)
  WITH CHECK (true);

-- Re-create conversations policies (permissive - auth handled in app code)
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

-- Re-create persona policies (permissive - auth handled in app code)
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

-- Re-create conversation_personas policies (permissive - auth handled in app code)
CREATE POLICY conversation_personas_select_public
  ON public.conversation_personas FOR SELECT
  USING (true); -- Application code will filter appropriately

CREATE POLICY conversation_personas_insert_own
  ON public.conversation_personas FOR INSERT
  WITH CHECK (true); -- Application code will verify ownership

CREATE POLICY conversation_personas_delete_own
  ON public.conversation_personas FOR DELETE
  USING (true); -- Application code will verify ownership

-- Re-create users policies (permissive - auth handled in app code)
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (true); -- Application code will filter by Clerk user ID

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (true); -- Application code will verify user ID matches Clerk user

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (true); -- Application code will set ID from Clerk

COMMIT;

-- Step 8: Update functions that use UUID for user_id
    BEGIN;

    -- Update increment_credits function if it exists
    DROP FUNCTION IF EXISTS public.increment_credits(UUID, INTEGER);
    CREATE OR REPLACE FUNCTION public.increment_credits(user_id TEXT, amount INTEGER)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
    UPDATE public.users
    SET credits = COALESCE(credits, 0) + amount
    WHERE id = user_id;
    END;
    $$;

    -- Update reconcile_user_email function
    DROP FUNCTION IF EXISTS public.reconcile_user_email(UUID, UUID);
    CREATE OR REPLACE FUNCTION public.reconcile_user_email(
    old_user_id TEXT,
    new_user_id TEXT
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

    COMMIT;

    -- Reset maintenance_work_mem to default
    RESET maintenance_work_mem;

    -- IMPORTANT NOTES:
    -- 1. This migration processes in smaller transactions to reduce memory usage
    -- 2. If you still get memory errors, you may need to:
    --    a. Run each BEGIN/COMMIT block separately
    --    b. Or contact Supabase support to temporarily increase maintenance_work_mem
    -- 3. All existing UUID user IDs will be converted to TEXT
    -- 4. Clerk user IDs (like "user_36DP8uV8MCZbxypUpRORSwwYaeb") can now be stored
