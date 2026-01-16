-- Add fcm_token to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Add index for faster lookups if needed (e.g. for sending notifications by token)
CREATE INDEX IF NOT EXISTS idx_profiles_fcm_token ON profiles(fcm_token);
