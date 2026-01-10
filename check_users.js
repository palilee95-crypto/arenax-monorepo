const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role');

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log('Users in database:');
    console.table(data);
}

checkUsers();
