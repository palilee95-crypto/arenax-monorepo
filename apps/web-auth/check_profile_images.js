const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from apps/web-auth/.env.local
const envPath = path.resolve(__dirname, '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfile(email) {
    console.log(`Checking profile for: ${email}`);
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url, hero_url')
            .eq('email', email)
            .single();

        if (error) {
            console.error('Error fetching profile:', error.message);
            return;
        }

        if (data) {
            console.log('✅ Profile found:');
            console.log(`ID: ${data.id}`);
            console.log(`Name: ${data.first_name} ${data.last_name}`);
            console.log(`Avatar URL length: ${data.avatar_url ? data.avatar_url.length : 0}`);
            console.log(`Hero URL length: ${data.hero_url ? data.hero_url.length : 0}`);

            if (data.avatar_url) {
                console.log(`Avatar starts with: ${data.avatar_url.substring(0, 50)}...`);
            }
            if (data.hero_url) {
                console.log(`Hero starts with: ${data.hero_url.substring(0, 50)}...`);
            }
        } else {
            console.log('❌ Profile not found.');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

const emailToCheck = 'palilee95@gmail.com';
checkProfile(emailToCheck);
