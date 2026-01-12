
import { supabase } from './packages/database/src/index.ts';

async function debug() {
    console.log("Starting debug...");
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .limit(1);

        if (error) {
            console.error("Error fetching profile:", error);
            return;
        }

        if (data && data.length > 0) {
            console.log("✅ Successfully fetched a profile.");
            console.log("Columns found:", Object.keys(data[0]));
            console.log("Sample profile ID:", data[0].id);
            console.log("Avatar URL length:", data[0].avatar_url ? data[0].avatar_url.length : "null/empty");
            console.log("Hero URL length:", data[0].hero_url ? data[0].hero_url.length : "null/empty");
        } else {
            console.log("❌ No profiles found.");
        }
    } catch (err) {
        console.error("Unexpected error:", err);
    }
}

debug();
