-- Create Team Requests Table
CREATE TABLE IF NOT EXISTS team_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_requests_team_id ON team_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_team_requests_user_id ON team_requests(user_id);

-- Enable RLS
ALTER TABLE team_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own requests
CREATE POLICY "Users can view their own requests"
ON team_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can create their own requests
CREATE POLICY "Users can create their own requests"
ON team_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Captains can view requests for their teams
CREATE POLICY "Captains can view requests for their teams"
ON team_requests
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = team_requests.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'captain'
    )
);

-- Policy: Captains can update requests for their teams
CREATE POLICY "Captains can update requests for their teams"
ON team_requests
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = team_requests.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'captain'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = team_requests.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'captain'
    )
);

-- Add helpful comments
COMMENT ON TABLE team_requests IS 'Stores requests from players to join teams';
