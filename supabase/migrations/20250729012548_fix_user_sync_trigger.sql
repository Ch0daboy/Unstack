-- Fix user sync trigger to handle OAuth signup properly

-- Update the sync function with better error handling
CREATE OR REPLACE FUNCTION sync_user_to_public()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if email is available (some OAuth providers might not provide email immediately)
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email;
  ELSE
    -- Insert with a placeholder email that can be updated later
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, COALESCE(NEW.email, 'user@' || NEW.id::text || '.placeholder'))
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, users.email);
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to sync user to public.users for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;