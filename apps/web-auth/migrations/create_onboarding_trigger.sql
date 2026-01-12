-- Function to handle profile and venue creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_first_name TEXT;
    v_last_name TEXT;
    v_nationality TEXT;
    v_state TEXT;
    v_district TEXT;
    v_phone_number TEXT;
    v_date_of_birth TEXT;
    v_preferred_foot TEXT;
    v_position TEXT;
    v_skill_level TEXT;
    v_venue_name TEXT;
    v_venue_address TEXT;
    v_venue_contact TEXT;
    v_total_courts INTEGER;
    v_facilities TEXT[];
BEGIN
    -- Extract metadata from raw_user_meta_data
    v_role := NEW.raw_user_meta_data->>'role';
    v_first_name := NEW.raw_user_meta_data->>'first_name';
    v_last_name := NEW.raw_user_meta_data->>'last_name';
    v_nationality := NEW.raw_user_meta_data->>'nationality';
    v_state := NEW.raw_user_meta_data->>'state';
    v_district := NEW.raw_user_meta_data->>'district';
    v_phone_number := NEW.raw_user_meta_data->>'phone_number';
    v_date_of_birth := NEW.raw_user_meta_data->>'date_of_birth';
    v_preferred_foot := NEW.raw_user_meta_data->>'preferred_foot';
    v_position := NEW.raw_user_meta_data->>'position';
    v_skill_level := NEW.raw_user_meta_data->>'skill_level';
    
    -- Venue specific metadata
    v_venue_name := NEW.raw_user_meta_data->>'venue_name';
    v_venue_address := NEW.raw_user_meta_data->>'venue_address';
    v_venue_contact := NEW.raw_user_meta_data->>'venue_contact';
    v_total_courts := (NEW.raw_user_meta_data->>'total_courts')::INTEGER;
    -- Facilities might be passed as a JSON array string
    v_facilities := ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'facilities', '[]'::jsonb)));

    -- 1. Create Profile
    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        email,
        role,
        nationality,
        state,
        district,
        phone_number,
        date_of_birth,
        preferred_foot,
        position,
        skill_level,
        status
    ) VALUES (
        NEW.id,
        v_first_name,
        v_last_name,
        NEW.email,
        COALESCE(v_role, 'player'),
        v_nationality,
        v_state,
        v_district,
        v_phone_number,
        v_date_of_birth,
        v_preferred_foot,
        v_position,
        v_skill_level,
        'pending'
    )
    ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        nationality = EXCLUDED.nationality,
        state = EXCLUDED.state,
        district = EXCLUDED.district,
        phone_number = EXCLUDED.phone_number,
        date_of_birth = EXCLUDED.date_of_birth,
        preferred_foot = EXCLUDED.preferred_foot,
        position = EXCLUDED.position,
        skill_level = EXCLUDED.skill_level;

    -- 2. Create Venue if role is venue-owner
    IF v_role = 'venue-owner' AND v_venue_name IS NOT NULL THEN
        INSERT INTO public.venues (
            owner_id,
            name,
            address,
            contact_number,
            total_courts,
            facilities
        ) VALUES (
            NEW.id,
            v_venue_name,
            v_venue_address,
            v_venue_contact,
            v_total_courts,
            v_facilities
        )
        ON CONFLICT (owner_id) DO UPDATE SET
            name = EXCLUDED.name,
            address = EXCLUDED.address,
            contact_number = EXCLUDED.contact_number,
            total_courts = EXCLUDED.total_courts,
            facilities = EXCLUDED.facilities;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created_onboarding ON auth.users;
CREATE TRIGGER on_auth_user_created_onboarding
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_onboarding();
