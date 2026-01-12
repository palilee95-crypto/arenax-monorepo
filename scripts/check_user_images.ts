
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Manually load env from .env.local since it's gitignored
const envPath = path.resolve(process.cwd(), 'apps/web-auth/.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY; // Use service role to bypass RLS

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser(email: string) {
    console.log(`Checking profile for: ${email}`);
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    if (data) {
        console.log("✅ Profile found:");
        console.log("ID:", data.id);
        console.log("First Name:", data.first_name);
        console.log("Last Name:", data.last_name);
        console.log("Avatar URL length:", data.avatar_url ? data.avatar_url.length : 0);
        console.log("Hero URL length:", data.hero_url ? data.hero_url.length : 0);

        if (data.avatar_url) {
            console.log("Avatar starts with:", data.avatar_url.substring(0, 50));
        }
        if (data.hero_url) {
            console.log("Hero starts with:", data.hero_url.substring(0, 50));
        }
    } else {
        console.log("❌ Profile not found.");
    }
}

const email = 'palilee95@gmail.com';
checkUser(email);
