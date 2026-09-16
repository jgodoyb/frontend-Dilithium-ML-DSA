-- Add first_name and last_name to profiles
ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN last_name TEXT;

-- Update the handle_new_user function to extract and save first/last names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, first_name, last_name, specialty, organization)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'specialty', ''),
    COALESCE(NEW.raw_user_meta_data->>'organization', '')
  );
  RETURN NEW;
END;
$$;
