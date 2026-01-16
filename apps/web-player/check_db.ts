
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking profiles...");
    const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, role, hero_url')
        .eq('role', 'player');

    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

check();
