-- Allow users to insert their own profile and venue
-- This is required for the "Profile Completion" flow where a user is already authenticated
-- but does not have a profile yet (e.g. legacy users or failed initial setup).

-- 1. Profiles Table
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 2. Venues Table
DROP POLICY IF EXISTS "Venue owners can insert own venue" ON public.venues;
CREATE POLICY "Venue owners can insert own venue" 
ON public.venues 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);
