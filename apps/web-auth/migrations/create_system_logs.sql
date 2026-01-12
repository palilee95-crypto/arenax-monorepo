-- Create system_logs table
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'success')),
    message TEXT NOT NULL,
    source TEXT NOT NULL,
    details JSONB
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to read logs
DROP POLICY IF EXISTS "Admins can read system logs" ON public.system_logs;
CREATE POLICY "Admins can read system logs" 
ON public.system_logs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Allow anyone to insert logs (for frontend error reporting)
DROP POLICY IF EXISTS "Anyone can insert system logs" ON public.system_logs;
CREATE POLICY "Anyone can insert system logs"
ON public.system_logs
FOR INSERT
WITH CHECK (true);

-- Insert mock data
INSERT INTO public.system_logs (level, message, source, details) VALUES
('info', 'System startup completed successfully.', 'System', '{"version": "1.0.0"}'),
('warning', 'High memory usage detected on web-player-node-1.', 'Monitor', '{"usage": "85%"}'),
('error', 'Failed to process payment for user_id: 12345.', 'PaymentGateway', '{"error": "Timeout", "provider": "Xendit"}'),
('success', 'Database backup completed.', 'BackupService', '{"size": "2.4GB"}'),
('info', 'New user registered: fahri@gmail.com', 'AuthService', '{"role": "player"}'),
('error', 'API Rate limit exceeded for IP: 192.168.1.1', 'RateLimiter', '{"limit": 1000, "actual": 1001}'),
('warning', 'Slow query detected: SELECT * FROM matches...', 'Database', '{"duration": "2.5s"}'),
('success', 'Email verification sent to arfa@gmail.com', 'EmailService', '{"template": "verify_email"}');
