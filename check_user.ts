const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from apps/web-auth/.env.local
dotenv.config({ path: path.resolve(__dirname, 'apps/web-auth/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser(email: any) {
    console.log(`Checking for user: ${email}`);
    try {
        // 1. Check Auth Users (requires Service Role Key for admin API)
        // If we only have Anon key, we can't list users, but we can check profiles.

        // 2. Check Profiles (Public table)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (profile) {
            console.log('✅ Found in Public Profiles:');
            console.log(JSON.stringify(profile, null, 2));
        } else {
            console.log('❌ Not found in Public Profiles.');
            if (profileError) console.log('Error:', profileError.message);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

const emailToCheck = 'palilee95@gmail.com';
checkUser(emailToCheck).catch(err => console.error('Top level error:', err));
