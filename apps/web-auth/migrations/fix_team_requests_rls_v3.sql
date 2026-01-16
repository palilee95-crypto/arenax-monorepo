-- Fix RLS policy for team_requests to ensure users can join teams
ALTER TABLE public.team_requests ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Users can create join requests" ON public.team_requests;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.team_requests;

-- Create a robust INSERT policy
CREATE POLICY "Users can create join requests" 
ON public.team_requests FOR INSERT 
WITH CHECK (
    -- Allow if the user is authenticated AND they are requesting for themselves
    auth.role() = 'authenticated' AND 
    auth.uid() = user_id
);

-- Ensure SELECT policy allows users to see their own requests (and captains to see requests for their team)
DROP POLICY IF EXISTS "Users and Captains can view requests" ON public.team_requests;
CREATE POLICY "Users and Captains can view requests" 
ON public.team_requests FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.teams 
        WHERE teams.id = team_requests.team_id 
        AND teams.creator_id = auth.uid()
    )
);
