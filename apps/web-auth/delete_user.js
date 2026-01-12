const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '.env.local');
console.log(`Loading env from: ${envPath}`);
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing Supabase credentials.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

function log(message) {
    console.log(message);
    fs.appendFileSync('delete_log.txt', message + '\n');
}

async function deleteUser(email) {
    log(`Attempting to delete user: ${email}`);

    try {
        // 1. Find the user ID
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            throw new Error(`Failed to list users: ${listError.message}`);
        }

        const user = users.find((u) => u.email === email);

        if (!user) {
            log(`❌ User ${email} not found in auth.users.`);
            return;
        }

        log(`Found user ID: ${user.id}`);

        // 2. Delete the user
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

        if (deleteError) {
            throw new Error(`Failed to delete user: ${deleteError.message}`);
        }

        log(`✅ Successfully deleted user: ${email} (${user.id})`);
        log('You can now sign up again.');

    } catch (err) {
        log(`Unexpected error: ${err.message}`);
    }
}

const emailToDelete = 'palilee95@gmail.com';
deleteUser(emailToDelete);
