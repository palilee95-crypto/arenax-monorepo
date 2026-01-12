
import { supabase } from './packages/database/src/index.ts';

async function checkSchema() {
    console.log("Checking schema for 'profiles' table...");
    try {
        const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'profiles' });

        if (error) {
            // If RPC doesn't exist, try a direct query to information_schema (might be blocked by RLS)
            console.log("RPC failed, trying direct query to information_schema...");
            const { data: columns, error: colError } = await supabase
                .from('information_schema.columns')
                .select('column_name, data_type')
                .eq('table_name', 'profiles')
                .eq('table_schema', 'public');

            if (colError) {
                console.error("Error fetching columns from information_schema:", colError);
                return;
            }
            console.log("Columns found via information_schema:", columns);
        } else {
            console.log("Columns found via RPC:", data);
        }
    } catch (err) {
        console.error("Unexpected error:", err);
    }
}

checkSchema();
