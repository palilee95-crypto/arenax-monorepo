-- Drop old policies first
DROP POLICY IF EXISTS "Users can view their own requests" ON team_requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON team_requests;
DROP POLICY IF EXISTS "Captains can view requests for their teams" ON team_requests;
DROP POLICY IF EXISTS "Captains can update requests for their teams" ON team_requests;

-- New Policies (Permissive for custom auth flow)

-- Policy: Allow anyone to view requests (or you can restrict to authenticated if using Supabase Auth)
CREATE POLICY "Enable read access for all users"
ON team_requests
FOR SELECT
USING (true);

-- Policy: Allow anyone to insert requests
-- In a production app with Supabase Auth, we would use auth.uid() = user_id
CREATE POLICY "Enable insert access for all users"
ON team_requests
FOR INSERT
WITH CHECK (true);

-- Policy: Allow anyone to update requests
-- Captains check will be handled in the application logic for now
CREATE POLICY "Enable update access for all users"
ON team_requests
FOR UPDATE
USING (true)
WITH CHECK (true);
