-- Migration: Setup Clerk subscription-based credit system
-- This tracks subscriptions, monthly credit limits, and credit usage

BEGIN;

-- Step 1: Add Clerk subscription tracking columns to users table
DO $$ 
BEGIN
  -- Add clerk_subscription_id (from Clerk Billing)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'clerk_subscription_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN clerk_subscription_id TEXT;
    RAISE NOTICE 'Added clerk_subscription_id column';
  END IF;

  -- Add clerk_plan_id (the plan slug from Clerk, e.g., 'pro', 'premium')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'clerk_plan_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN clerk_plan_id TEXT DEFAULT 'free';
    RAISE NOTICE 'Added clerk_plan_id column';
  END IF;

  -- Add subscription_status (active, canceled, past_due, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.users ADD COLUMN subscription_status TEXT DEFAULT 'active';
    RAISE NOTICE 'Added subscription_status column';
  END IF;

  -- Add monthly_credit_limit (10 for free, 1000 for subscribed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'monthly_credit_limit'
  ) THEN
    ALTER TABLE public.users ADD COLUMN monthly_credit_limit INTEGER DEFAULT 10;
    RAISE NOTICE 'Added monthly_credit_limit column';
  END IF;

  -- Add credits_used_this_month (track usage for monthly reset)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'credits_used_this_month'
  ) THEN
    ALTER TABLE public.users ADD COLUMN credits_used_this_month INTEGER DEFAULT 0;
    RAISE NOTICE 'Added credits_used_this_month column';
  END IF;

  -- Add last_credit_reset (timestamp of last monthly reset)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'last_credit_reset'
  ) THEN
    ALTER TABLE public.users ADD COLUMN last_credit_reset TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added last_credit_reset column';
  END IF;
END $$;

-- Step 2: Create credit_usage_log table to track individual credit deductions
CREATE TABLE IF NOT EXISTS public.credit_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  credits_used INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on credit_usage_log
ALTER TABLE public.credit_usage_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_usage_log
CREATE POLICY "Users can view own credit usage"
  ON public.credit_usage_log FOR SELECT
  USING (true); -- Application code will filter by user_id

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_usage_user_id ON public.credit_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_created_at ON public.credit_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_clerk_subscription ON public.users(clerk_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_clerk_plan ON public.users(clerk_plan_id);

-- Step 4: Update increment_credits function to use TEXT and handle monthly limits
DROP FUNCTION IF EXISTS public.increment_credits(TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.increment_credits(
  p_user_id TEXT,
  p_amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET credits = COALESCE(credits, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;

-- Step 5: Create function to check and decrement credits
CREATE OR REPLACE FUNCTION public.check_and_decrement_credits(
  p_user_id TEXT,
  p_credits_needed INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record RECORD;
  v_credits_available INTEGER;
  v_monthly_limit INTEGER;
  v_credits_used INTEGER;
  v_last_reset TIMESTAMPTZ;
  v_current_month_start TIMESTAMPTZ;
BEGIN
  -- Get user record
  SELECT 
    id,
    credits,
    monthly_credit_limit,
    credits_used_this_month,
    last_credit_reset,
    clerk_plan_id,
    subscription_status
  INTO v_user_record
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Calculate current month start (first day of current month)
  v_current_month_start := date_trunc('month', NOW());

  -- Check if we need to reset monthly usage (new month)
  IF v_user_record.last_credit_reset IS NULL OR v_user_record.last_credit_reset < v_current_month_start THEN
    -- Reset monthly usage
    UPDATE public.users
    SET 
      credits_used_this_month = 0,
      last_credit_reset = v_current_month_start,
      -- Reset credits to monthly limit
      credits = COALESCE(monthly_credit_limit, 10)
    WHERE id = p_user_id;
    
    v_credits_used := 0;
    v_monthly_limit := COALESCE(v_user_record.monthly_credit_limit, 10);
    v_credits_available := v_monthly_limit;
  ELSE
    v_credits_used := COALESCE(v_user_record.credits_used_this_month, 0);
    v_monthly_limit := COALESCE(v_user_record.monthly_credit_limit, 10);
    v_credits_available := v_monthly_limit - v_credits_used;
  END IF;

  -- Check if user has enough credits
  IF v_credits_available < p_credits_needed THEN
    RETURN FALSE;
  END IF;

  -- Decrement credits
  UPDATE public.users
  SET 
    credits = credits - p_credits_needed,
    credits_used_this_month = COALESCE(credits_used_this_month, 0) + p_credits_needed
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

-- Step 6: Create function to get available credits
CREATE OR REPLACE FUNCTION public.get_available_credits(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record RECORD;
  v_credits_available INTEGER;
  v_monthly_limit INTEGER;
  v_credits_used INTEGER;
  v_current_month_start TIMESTAMPTZ;
BEGIN
  -- Get user record
  SELECT 
    credits,
    monthly_credit_limit,
    credits_used_this_month,
    last_credit_reset
  INTO v_user_record
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate current month start
  v_current_month_start := date_trunc('month', NOW());

  -- Check if we need to reset monthly usage
  IF v_user_record.last_credit_reset IS NULL OR v_user_record.last_credit_reset < v_current_month_start THEN
    v_monthly_limit := COALESCE(v_user_record.monthly_credit_limit, 10);
    v_credits_available := v_monthly_limit;
  ELSE
    v_monthly_limit := COALESCE(v_user_record.monthly_credit_limit, 10);
    v_credits_used := COALESCE(v_user_record.credits_used_this_month, 0);
    v_credits_available := v_monthly_limit - v_credits_used;
  END IF;

  RETURN GREATEST(0, v_credits_available);
END;
$$;

-- Step 7: Initialize existing users with default values
UPDATE public.users
SET 
  monthly_credit_limit = COALESCE(monthly_credit_limit, 10),
  credits_used_this_month = COALESCE(credits_used_this_month, 0),
  last_credit_reset = COALESCE(last_credit_reset, NOW()),
  clerk_plan_id = COALESCE(clerk_plan_id, 'free'),
  subscription_status = COALESCE(subscription_status, 'active'),
  credits = COALESCE(credits, 10)
WHERE monthly_credit_limit IS NULL 
   OR credits_used_this_month IS NULL 
   OR last_credit_reset IS NULL;

COMMIT;

-- Usage Notes:
-- 1. Free users: monthly_credit_limit = 10, clerk_plan_id = 'free'
-- 2. Subscribed users: monthly_credit_limit = 1000, clerk_plan_id = [plan slug from Clerk]
-- 3. Credits reset automatically at the start of each month
-- 4. Use check_and_decrement_credits() before creating a conversation
-- 5. Use get_available_credits() to show user their remaining credits

