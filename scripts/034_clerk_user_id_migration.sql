-- Migration: Update user IDs after Clerk account migration
-- nimkofamily@gmail.com: user_36oUQd91xn43Bf9lkAR7ZV7M92q → user_3ABhAOp7ya5X5cOiu4lXTvmmsYx
-- chatbotcasts@gmail.com: user_36DTGEASxas8cImRKPqCG9Ej874 → user_3ABhM3uQWbpfhTuWduzx6r9OOMx
--
-- Tables updated:
--   - users (id)
--   - conversations (user_id)
--   - persona (user_id)
--   - billing_history (user_id) - if exists
--   - credit_usage_log (user_id) - if exists
--   - conversation_personas (user_id) - if exists
--   - conversation_revisions (editor_id) - if exists
--   - credit_transactions (user_id) - if exists
--
-- USAGE:
--   1. Backup your database (Supabase Dashboard → Database → Backups)
--   2. Run in Supabase SQL Editor or: psql $DATABASE_URL -f scripts/034_clerk_user_id_migration.sql
--   3. Verify: SELECT id, email FROM users WHERE email IN ('nimkofamily@gmail.com', 'chatbotcasts@gmail.com');

BEGIN;

DO $$
DECLARE
  -- User 1: nimkofamily@gmail.com
  old_id_1 TEXT := 'user_36oUQd91xn43Bf9lkAR7ZV7M92q';
  new_id_1 TEXT := 'user_3ABhAOp7ya5X5cOiu4lXTvmmsYx';

  -- User 2: chatbotcasts@gmail.com
  old_id_2 TEXT := 'user_36DTGEASxas8cImRKPqCG9Ej874';
  new_id_2 TEXT := 'user_3ABhM3uQWbpfhTuWduzx6r9OOMx';

  r RECORD;
  tbl TEXT;
  col TEXT;
  cnt INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Clerk User ID Migration';
  RAISE NOTICE '========================================';

  -- Process each user mapping
  FOR r IN (
    SELECT old_id_1 AS old_id, new_id_1 AS new_id, 'nimkofamily@gmail.com' AS email
    UNION ALL
    SELECT old_id_2, new_id_2, 'chatbotcasts@gmail.com'
  ) LOOP
    -- Skip if old and new are same (no migration needed)
    IF r.old_id = r.new_id THEN
      RAISE NOTICE 'Skipping % - IDs already match', r.email;
      CONTINUE;
    END IF;

    -- Check if old user exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = r.old_id) THEN
      RAISE NOTICE 'Skipping % - old user % not found in database', r.email, r.old_id;
      CONTINUE;
    END IF;

    -- Check if new user already exists (Clerk may have created it)
    IF EXISTS (SELECT 1 FROM public.users WHERE id = r.new_id) THEN
      RAISE NOTICE 'New user % already exists for %. Will migrate data and remove old record.', r.new_id, r.email;
    END IF;

    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Migrating: %', r.email;
    RAISE NOTICE '  Old ID: %', r.old_id;
    RAISE NOTICE '  New ID: %', r.new_id;
    RAISE NOTICE '----------------------------------------';

    -- Step 1: Ensure new user record exists (copy from old if new doesn't exist)
    -- Core columns: id, email, display_name, created_at, updated_at
    -- If your schema has extra columns (avatar_url, clerk_*, monthly_credit_limit, etc.), add them to the INSERT
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = r.new_id) THEN
      INSERT INTO public.users (id, email, display_name, created_at, updated_at)
      SELECT r.new_id, email, display_name, created_at, NOW()
      FROM public.users
      WHERE id = r.old_id;
      RAISE NOTICE '  ✓ Created new user record';
    ELSE
      -- New user exists (Clerk may have created it) - merge data from old record
      UPDATE public.users u_new SET
        email = COALESCE(u_old.email, u_new.email),
        display_name = COALESCE(u_old.display_name, u_new.display_name),
        updated_at = NOW()
      FROM public.users u_old
      WHERE u_new.id = r.new_id AND u_old.id = r.old_id;
      RAISE NOTICE '  ✓ Merged data into existing new user record';
    END IF;

    -- Step 2: Update all tables that reference user_id

    -- conversations
    UPDATE public.conversations SET user_id = r.new_id WHERE user_id = r.old_id;
    GET DIAGNOSTICS cnt = ROW_COUNT;
    RAISE NOTICE '  ✓ conversations: % rows', cnt;

    -- persona
    UPDATE public.persona SET user_id = r.new_id WHERE user_id = r.old_id;
    GET DIAGNOSTICS cnt = ROW_COUNT;
    RAISE NOTICE '  ✓ persona: % rows', cnt;

    -- billing_history (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_history') THEN
      UPDATE public.billing_history SET user_id = r.new_id WHERE user_id = r.old_id;
      GET DIAGNOSTICS cnt = ROW_COUNT;
      RAISE NOTICE '  ✓ billing_history: % rows', cnt;
    END IF;

    -- credit_usage_log (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_usage_log') THEN
      UPDATE public.credit_usage_log SET user_id = r.new_id WHERE user_id = r.old_id;
      GET DIAGNOSTICS cnt = ROW_COUNT;
      RAISE NOTICE '  ✓ credit_usage_log: % rows', cnt;
    END IF;

    -- conversation_personas (user_id for human participants)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversation_personas' AND column_name = 'user_id') THEN
      UPDATE public.conversation_personas SET user_id = r.new_id WHERE user_id = r.old_id;
      GET DIAGNOSTICS cnt = ROW_COUNT;
      RAISE NOTICE '  ✓ conversation_personas: % rows', cnt;
    END IF;

    -- conversation_revisions (editor_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversation_revisions') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversation_revisions' AND column_name = 'editor_id') THEN
        UPDATE public.conversation_revisions SET editor_id = r.new_id WHERE editor_id = r.old_id;
        GET DIAGNOSTICS cnt = ROW_COUNT;
        RAISE NOTICE '  ✓ conversation_revisions (editor_id): % rows', cnt;
      END IF;
    END IF;

    -- credit_transactions (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_transactions') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'credit_transactions' AND column_name = 'user_id') THEN
        UPDATE public.credit_transactions SET user_id = r.new_id WHERE user_id = r.old_id;
        GET DIAGNOSTICS cnt = ROW_COUNT;
        RAISE NOTICE '  ✓ credit_transactions: % rows', cnt;
      END IF;
    END IF;

    -- Step 3: Delete the old user record (only if different from new)
    IF r.old_id != r.new_id THEN
      DELETE FROM public.users WHERE id = r.old_id;
      RAISE NOTICE '  ✓ Removed old user record';
    END IF;

    RAISE NOTICE '  Done: %', r.email;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration complete!';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- Verification queries (run after migration):
-- SELECT id, email, display_name FROM public.users WHERE email IN ('nimkofamily@gmail.com', 'chatbotcasts@gmail.com');
-- SELECT user_id, COUNT(*) FROM public.conversations GROUP BY user_id;
-- SELECT user_id, COUNT(*) FROM public.persona GROUP BY user_id;
