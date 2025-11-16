-- Create billing_history table to track all transactions
CREATE TABLE IF NOT EXISTS public.billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Stripe data
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,
  
  -- Transaction details
  amount DECIMAL(10, 2) NOT NULL,
  credits_added INTEGER NOT NULL,
  plan_name TEXT NOT NULL, -- 'free', 'monthly', 'yearly'
  status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'refunded'
  
  -- Metadata
  description TEXT,
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on billing_history
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own billing history
CREATE POLICY "Users can view own billing history"
  ON public.billing_history FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert/update billing history (for webhooks)
CREATE POLICY "Service role can manage billing history"
  ON public.billing_history FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add credits column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'users' 
                 AND column_name = 'credits') THEN
    ALTER TABLE public.users ADD COLUMN credits INTEGER DEFAULT 10;
  END IF;
END $$;

-- Add subscription fields to users table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'users' 
                 AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE public.users ADD COLUMN stripe_customer_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'users' 
                 AND column_name = 'stripe_subscription_id') THEN
    ALTER TABLE public.users ADD COLUMN stripe_subscription_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'users' 
                 AND column_name = 'subscription_plan') THEN
    ALTER TABLE public.users ADD COLUMN subscription_plan TEXT DEFAULT 'free';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'users' 
                 AND column_name = 'subscription_status') THEN
    ALTER TABLE public.users ADD COLUMN subscription_status TEXT DEFAULT 'active';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_billing_user_id ON public.billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_stripe_subscription ON public.billing_history(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_created_at ON public.billing_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users(stripe_customer_id);

-- Auto-update updated_at for billing_history
CREATE OR REPLACE FUNCTION public.handle_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_billing_updated
  BEFORE UPDATE ON public.billing_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_billing_updated_at();

-- Grant free credits to existing users who have 0 credits
UPDATE public.users SET credits = 10 WHERE credits = 0 OR credits IS NULL;
