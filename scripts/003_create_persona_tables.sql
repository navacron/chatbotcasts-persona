-- Create persona table
CREATE TABLE IF NOT EXISTS public.persona (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    prompt TEXT,
    document_link TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false
);

-- Create junction table for many-to-many relationship between conversations and personas
CREATE TABLE IF NOT EXISTS public.conversation_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    persona_id UUID REFERENCES public.persona(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(conversation_id, persona_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_persona_user_id ON public.persona(user_id);
CREATE INDEX IF NOT EXISTS idx_persona_is_public ON public.persona(is_public);
CREATE INDEX IF NOT EXISTS idx_conversation_personas_conversation_id ON public.conversation_personas(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_personas_persona_id ON public.conversation_personas(persona_id);

-- Enable Row Level Security
ALTER TABLE public.persona ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_personas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for persona table

-- Allow users to view their own personas
CREATE POLICY persona_select_own ON public.persona
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to view public personas
CREATE POLICY persona_select_public ON public.persona
    FOR SELECT
    USING (is_public = true);

-- Allow users to insert their own personas
CREATE POLICY persona_insert_own ON public.persona
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own personas
CREATE POLICY persona_update_own ON public.persona
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own personas
CREATE POLICY persona_delete_own ON public.persona
    FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for conversation_personas junction table

-- Allow users to view personas in their own conversations
CREATE POLICY conversation_personas_select_own ON public.conversation_personas
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = conversation_personas.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Allow users to view personas in public conversations
CREATE POLICY conversation_personas_select_public ON public.conversation_personas
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = conversation_personas.conversation_id
            AND conversations.is_public = true
        )
    );

-- Allow users to add personas to their own conversations
CREATE POLICY conversation_personas_insert_own ON public.conversation_personas
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = conversation_personas.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Allow users to remove personas from their own conversations
CREATE POLICY conversation_personas_delete_own ON public.conversation_personas
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = conversation_personas.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update updated_at on persona table
CREATE TRIGGER update_persona_updated_at
    BEFORE UPDATE ON public.persona
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
