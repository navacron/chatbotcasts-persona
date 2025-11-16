-- Create a function to safely increment user credits
CREATE OR REPLACE FUNCTION increment_credits(user_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET credits = COALESCE(credits, 0) + amount
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
