-- Create the missing user that owns all legacy conversations
-- This user was referenced in the migration but didn't exist in the users table

DO $$
BEGIN
  RAISE NOTICE 'Creating legacy user account for migrated conversations...';
END $$;

-- Insert the user if it doesn't exist
INSERT INTO public.users (
  id,
  email,
  display_name,
  credits,
  subscription_plan,
  subscription_status,
  created_at,
  updated_at
)
VALUES (
  '4c1c8bd3-465a-46e5-9966-67a99856ee5c',
  'legacy@chatbotcasts.com',
  'ChatBotCasts Admin',
  100,
  'free',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'Legacy user created successfully!';
END $$;

-- Verify the user was created
SELECT 
  id,
  email,
  display_name,
  credits,
  subscription_plan
FROM public.users
WHERE id = '4c1c8bd3-465a-46e5-9966-67a99856ee5c';
