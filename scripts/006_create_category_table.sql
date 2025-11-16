-- Create category table
CREATE TABLE IF NOT EXISTS category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_category_slug ON category(slug);

-- Enable RLS
ALTER TABLE category ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read categories
CREATE POLICY category_select_all ON category
  FOR SELECT
  USING (true);

-- Only allow system/admin to insert/update/delete categories (no user access)
CREATE POLICY category_modify_admin ON category
  FOR ALL
  USING (false);

-- Seed categories
INSERT INTO category (name, slug, description) VALUES
  ('Travel', 'travel', 'Conversations about travel destinations, itineraries, and adventures'),
  ('Arts & Culture', 'arts-culture', 'Discussions on art, music, literature, and cultural topics'),
  ('Sports', 'sports', 'Athletic events, fitness, and sports-related conversations'),
  ('Finance', 'finance', 'Financial planning, investing, and economic discussions'),
  ('Entertainment', 'entertainment', 'Movies, TV shows, gaming, and entertainment news'),
  ('Buying Guide', 'buying-guide', 'Product recommendations and purchasing advice'),
  ('Technology', 'technology', 'Tech innovations, gadgets, and digital trends'),
  ('Other', 'other', 'Miscellaneous conversations that don''t fit other categories')
ON CONFLICT (slug) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_category_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER category_updated_at_trigger
  BEFORE UPDATE ON category
  FOR EACH ROW
  EXECUTE FUNCTION update_category_updated_at();
