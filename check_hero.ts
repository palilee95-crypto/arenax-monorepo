
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We need to read these from the environment or hardcode them for this check
const SUPABASE_URL = 'https://jrbwlxblkpqmzeqorvno.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Wb7kDRQn2pKOTXrLcGQCtQ_hl10z6II';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkPlayers() {
    console.log("Checking player profiles...");
    const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, hero_url')
        .eq('role', 'player')
        .limit(5);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Found players:", data);
}

checkPlayers();
