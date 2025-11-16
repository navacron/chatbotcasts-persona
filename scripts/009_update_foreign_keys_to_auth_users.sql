-- Migration: Update foreign keys to reference auth.users directly
-- This removes the intermediate public.users table dependency

-- First, drop existing foreign key constraints
ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;

ALTER TABLE public.persona 
DROP CONSTRAINT IF EXISTS persona_user_id_fkey;

-- Update the foreign keys to reference auth.users directly
ALTER TABLE public.conversations
ADD CONSTRAINT conversations_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.persona
ADD CONSTRAINT persona_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Note: The public.users table can remain as an extended profile table
-- but conversations and personas now reference auth.users directly
-- This ensures data integrity even if the users table has issues
