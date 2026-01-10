
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("Checking matches...");
    const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('*');

    if (matchesError) {
        console.error("Error fetching matches:", matchesError);
    } else {
        console.log(`Found ${matches?.length} matches:`, matches);
    }

    console.log("Checking bookings...");
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*');

    if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
    } else {
        console.log(`Found ${bookings?.length} bookings:`, bookings);
    }
}

checkData();
