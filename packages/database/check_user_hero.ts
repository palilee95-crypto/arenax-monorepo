
import { createClient } from '@supabase/supabase-js';

// Hardcoded keys from check_hero.ts
const SUPABASE_URL = 'https://jrbwlxblkpqmzeqorvno.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Wb7kDRQn2pKOTXrLcGQCtQ_hl10z6II';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TARGET_USER_ID = '4033a353-77f5-44f0-8936-b004bc733666';

async function checkUser() {
    console.log(`Checking profile for user: ${TARGET_USER_ID}`);
    const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, hero_url, role')
        .eq('id', TARGET_USER_ID)
        .single();

    if (error) {
        console.error("Error fetching profile:", error);
    } else {
        console.log("Profile Data:", JSON.stringify(data, null, 2));
    }

    console.log("Checking storage buckets...");
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
        console.error("Error fetching buckets:", bucketError);
    } else {
        console.log("Buckets:", JSON.stringify(buckets, null, 2));
    }
}

checkUser();
