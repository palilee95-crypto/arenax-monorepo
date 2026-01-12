-- Secure Core Tables with RLS Policies

-- 1. Venues Table
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- View: Public
DROP POLICY IF EXISTS "Venues are viewable by everyone" ON public.venues;
CREATE POLICY "Venues are viewable by everyone" 
ON public.venues FOR SELECT 
USING (true);

-- Create: Venue Owners only
DROP POLICY IF EXISTS "Venue owners can create venues" ON public.venues;
CREATE POLICY "Venue owners can create venues" 
ON public.venues FOR INSERT 
WITH CHECK (
    auth.uid() = owner_id 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'venue-owner'
    )
);

-- Update: Owner only
DROP POLICY IF EXISTS "Owners can update their venues" ON public.venues;
CREATE POLICY "Owners can update their venues" 
ON public.venues FOR UPDATE 
USING (auth.uid() = owner_id);

-- Delete: Owner only
DROP POLICY IF EXISTS "Owners can delete their venues" ON public.venues;
CREATE POLICY "Owners can delete their venues" 
ON public.venues FOR DELETE 
USING (auth.uid() = owner_id);


-- 2. Courts Table
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

-- View: Public
DROP POLICY IF EXISTS "Courts are viewable by everyone" ON public.courts;
CREATE POLICY "Courts are viewable by everyone" 
ON public.courts FOR SELECT 
USING (true);

-- Create/Update/Delete: Venue Owner (via venue_id)
DROP POLICY IF EXISTS "Venue owners can manage courts" ON public.courts;
CREATE POLICY "Venue owners can manage courts" 
ON public.courts FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.venues 
        WHERE venues.id = courts.venue_id 
        AND venues.owner_id = auth.uid()
    )
);


-- 3. Matches Table
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- View: Public
DROP POLICY IF EXISTS "Matches are viewable by everyone" ON public.matches;
CREATE POLICY "Matches are viewable by everyone" 
ON public.matches FOR SELECT 
USING (true);

-- Create: Authenticated Users
DROP POLICY IF EXISTS "Authenticated users can create matches" ON public.matches;
CREATE POLICY "Authenticated users can create matches" 
ON public.matches FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

-- Update: Creator only
DROP POLICY IF EXISTS "Creators can update their matches" ON public.matches;
CREATE POLICY "Creators can update their matches" 
ON public.matches FOR UPDATE 
USING (auth.uid() = creator_id);

-- Delete: Creator only
DROP POLICY IF EXISTS "Creators can delete their matches" ON public.matches;
CREATE POLICY "Creators can delete their matches" 
ON public.matches FOR DELETE 
USING (auth.uid() = creator_id);


-- 4. Bookings Table
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- View: Public (needed to check availability)
DROP POLICY IF EXISTS "Bookings are viewable by everyone" ON public.bookings;
CREATE POLICY "Bookings are viewable by everyone" 
ON public.bookings FOR SELECT 
USING (true);

-- Create: Authenticated Users
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
CREATE POLICY "Authenticated users can create bookings" 
ON public.bookings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update: User who booked OR Venue Owner
DROP POLICY IF EXISTS "Users and Venue Owners can update bookings" ON public.bookings;
CREATE POLICY "Users and Venue Owners can update bookings" 
ON public.bookings FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.venues 
        WHERE venues.id = bookings.venue_id 
        AND venues.owner_id = auth.uid()
    )
);

-- Delete: User who booked OR Venue Owner
DROP POLICY IF EXISTS "Users and Venue Owners can delete bookings" ON public.bookings;
CREATE POLICY "Users and Venue Owners can delete bookings" 
ON public.bookings FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.venues 
        WHERE venues.id = bookings.venue_id 
        AND venues.owner_id = auth.uid()
    )
);
