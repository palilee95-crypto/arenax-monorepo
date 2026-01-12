-- Secure Social & Team Tables with RLS Policies

-- 1. Friends Table
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- View: Users can view their own friendships
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friends;
CREATE POLICY "Users can view their own friendships" 
ON public.friends FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create: Authenticated users can send friend requests
DROP POLICY IF EXISTS "Users can create friend requests" ON public.friends;
CREATE POLICY "Users can create friend requests" 
ON public.friends FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update: Users involved can update status (e.g. accept)
DROP POLICY IF EXISTS "Users can update their friendships" ON public.friends;
CREATE POLICY "Users can update their friendships" 
ON public.friends FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Delete: Users involved can remove friend
DROP POLICY IF EXISTS "Users can delete their friendships" ON public.friends;
CREATE POLICY "Users can delete their friendships" 
ON public.friends FOR DELETE 
USING (auth.uid() = user_id OR auth.uid() = friend_id);


-- 2. Teams Table (RLS already enabled, adding DELETE policy)

-- Delete: Only Creator (Captain) can delete the team
DROP POLICY IF EXISTS "Captains can delete their teams" ON public.teams;
CREATE POLICY "Captains can delete their teams" 
ON public.teams FOR DELETE 
USING (auth.uid() = creator_id);


-- 3. Team Members Table
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- View: Public (to see team rosters)
DROP POLICY IF EXISTS "Team members are viewable by everyone" ON public.team_members;
CREATE POLICY "Team members are viewable by everyone" 
ON public.team_members FOR SELECT 
USING (true);

-- Create: Captains can add members (or handled via request acceptance logic)
-- Note: This policy assumes the user adding the member is the creator of the team
DROP POLICY IF EXISTS "Captains can add team members" ON public.team_members;
CREATE POLICY "Captains can add team members" 
ON public.team_members FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.teams 
        WHERE teams.id = team_members.team_id 
        AND teams.creator_id = auth.uid()
    )
);

-- Update: Captains can update roles
DROP POLICY IF EXISTS "Captains can update team members" ON public.team_members;
CREATE POLICY "Captains can update team members" 
ON public.team_members FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.teams 
        WHERE teams.id = team_members.team_id 
        AND teams.creator_id = auth.uid()
    )
);

-- Delete: Captains can remove members OR Members can leave
DROP POLICY IF EXISTS "Captains can remove members or members can leave" ON public.team_members;
CREATE POLICY "Captains can remove members or members can leave" 
ON public.team_members FOR DELETE 
USING (
    auth.uid() = user_id OR -- Member leaving
    EXISTS (
        SELECT 1 FROM public.teams 
        WHERE teams.id = team_members.team_id 
        AND teams.creator_id = auth.uid() -- Captain removing
    )
);


-- 4. Team Requests Table
ALTER TABLE public.team_requests ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.team_requests;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.team_requests;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.team_requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.team_requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON public.team_requests;
DROP POLICY IF EXISTS "Captains can view requests for their teams" ON public.team_requests;
DROP POLICY IF EXISTS "Captains can update requests for their teams" ON public.team_requests;


-- View: The user who requested OR the team captain
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

-- Create: Authenticated users (requesting to join)
CREATE POLICY "Users can create join requests" 
ON public.team_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update: Team Captain (to accept/reject)
CREATE POLICY "Captains can update requests" 
ON public.team_requests FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.teams 
        WHERE teams.id = team_requests.team_id 
        AND teams.creator_id = auth.uid()
    )
);

-- Delete: The user (cancel) OR Team Captain
CREATE POLICY "Users and Captains can delete requests" 
ON public.team_requests FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.teams 
        WHERE teams.id = team_requests.team_id 
        AND teams.creator_id = auth.uid()
    )
);
