-- Migration: Add subscription columns to users table if they don't exist
-- These columns are needed for the Clerk user sync function

BEGIN;

-- Add subscription_tier column if it doesn't exist
-- Note: Some schemas might use subscription_plan instead
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'subscription_tier'
  ) THEN
    -- Check if subscription_plan exists instead
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'subscription_plan'
    ) THEN
      RAISE NOTICE 'subscription_plan column exists, skipping subscription_tier';
    ELSE
      ALTER TABLE public.users ADD COLUMN subscription_tier TEXT DEFAULT 'free';
      RAISE NOTICE 'Added subscription_tier column to users table';
    END IF;
  ELSE
    RAISE NOTICE 'subscription_tier column already exists';
  END IF;
END $$;

-- Add subscription_status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.users ADD COLUMN subscription_status TEXT DEFAULT 'active';
    RAISE NOTICE 'Added subscription_status column to users table';
  ELSE
    RAISE NOTICE 'subscription_status column already exists';
  END IF;
END $$;

-- Set default values for existing users (only if columns exist)
DO $$ 
BEGIN
  -- Only update if subscription_tier column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'subscription_tier'
  ) THEN
    UPDATE public.users 
    SET 
      subscription_tier = COALESCE(subscription_tier, 'free'),
      subscription_status = COALESCE(subscription_status, 'active')
    WHERE subscription_tier IS NULL OR subscription_status IS NULL;
    RAISE NOTICE 'Updated default subscription values for existing users';
  END IF;
END $$;

COMMIT;

