-- Final Fix for Teams RLS
-- Ensure teams are viewable by everyone to avoid catch-22 in team_members insert

-- 1. Enable RLS on teams (just in case)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing select policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams" ON public.teams;

-- 3. Create a clean public select policy
CREATE POLICY "Teams are viewable by everyone" 
ON public.teams FOR SELECT 
USING (true);

-- 4. Ensure insert policy is correct
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
CREATE POLICY "Authenticated users can create teams" 
ON public.teams FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 5. Ensure update policy is correct
DROP POLICY IF EXISTS "Captains can update their own teams" ON public.teams;
CREATE POLICY "Captains can update their own teams" 
ON public.teams FOR UPDATE 
USING (auth.uid() = creator_id);

-- 6. Ensure delete policy is correct
DROP POLICY IF EXISTS "Captains can delete their teams" ON public.teams;
CREATE POLICY "Captains can delete their teams" 
ON public.teams FOR DELETE 
USING (auth.uid() = creator_id);

-- 7. Re-verify team_members select policy
DROP POLICY IF EXISTS "Team members are viewable by everyone" ON public.team_members;
CREATE POLICY "Team members are viewable by everyone" 
ON public.team_members FOR SELECT 
USING (true);
