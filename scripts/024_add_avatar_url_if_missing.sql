-- Migration: Add avatar_url column to users table if it doesn't exist
-- This ensures the column exists for Clerk user sync

BEGIN;

-- Add avatar_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
    RAISE NOTICE 'Added avatar_url column to users table';
  ELSE
    RAISE NOTICE 'avatar_url column already exists';
  END IF;
END $$;

COMMIT;

