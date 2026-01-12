-- Fix Nested Deletion Constraints: Ensure matches and courts are deleted when a venue is deleted

-- 1. Update Matches Table (venue_id)
ALTER TABLE public.matches 
DROP CONSTRAINT IF EXISTS matches_venue_id_fkey,
ADD CONSTRAINT matches_venue_id_fkey 
    FOREIGN KEY (venue_id) 
    REFERENCES public.venues(id) 
    ON DELETE CASCADE;

-- 2. Update Courts Table (venue_id)
-- Note: This might already exist, but we ensure it's ON DELETE CASCADE
ALTER TABLE public.courts 
DROP CONSTRAINT IF EXISTS courts_venue_id_fkey,
ADD CONSTRAINT courts_venue_id_fkey 
    FOREIGN KEY (venue_id) 
    REFERENCES public.venues(id) 
    ON DELETE CASCADE;

-- 3. Update Bookings Table (venue_id)
-- Ensure bookings are also cleared when a venue is deleted
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_venue_id_fkey,
ADD CONSTRAINT bookings_venue_id_fkey 
    FOREIGN KEY (venue_id) 
    REFERENCES public.venues(id) 
    ON DELETE CASCADE;
