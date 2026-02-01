-- Migration: Add user_id column to conversation_personas to support human users
-- This allows conversations to include both AI personas (from persona table) and human users (from users table)

BEGIN;

-- Step 1: Make persona_id nullable (since human users won't have a persona_id)
ALTER TABLE public.conversation_personas
ALTER COLUMN persona_id DROP NOT NULL;

-- Step 2: Add user_id column (nullable, references users.id)
ALTER TABLE public.conversation_personas
ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE;

-- Step 3: Drop the old unique constraint
ALTER TABLE public.conversation_personas
DROP CONSTRAINT IF EXISTS conversation_personas_conversation_id_persona_id_key;

-- Step 4: Add a new unique constraint using a partial index approach
-- This ensures we don't have duplicate entries for the same conversation + persona combination
-- and same conversation + user combination, but allows multiple different personas/users per conversation
CREATE UNIQUE INDEX IF NOT EXISTS conversation_personas_unique_persona
ON public.conversation_personas (conversation_id, persona_id)
WHERE persona_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversation_personas_unique_user
ON public.conversation_personas (conversation_id, user_id)
WHERE user_id IS NOT NULL;

-- Step 5: Add a check constraint to ensure either persona_id OR user_id is set (but not both)
ALTER TABLE public.conversation_personas
ADD CONSTRAINT conversation_personas_persona_or_user_check
CHECK (
  (persona_id IS NOT NULL AND user_id IS NULL) OR
  (persona_id IS NULL AND user_id IS NOT NULL)
);

-- Step 6: Add index for user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_conversation_personas_user_id ON public.conversation_personas(user_id);

COMMIT;

-- Note: The RLS policies for conversation_personas should already work since they check
-- conversation ownership through the conversations table, not directly on persona_id or user_id.
