
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Hardcoded keys
const SUPABASE_URL = 'https://jrbwlxblkpqmzeqorvno.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Wb7kDRQn2pKOTXrLcGQCtQ_hl10z6II';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TARGET_USER_ID = '4033a353-77f5-44f0-8936-b004bc733666';
const IMAGE_PATH = 'C:/Users/User/.gemini/antigravity/brain/09b3a47b-01be-4bf4-a81b-1514fc290ef6/uploaded_image_1768575735930.png';

async function uploadHero() {
    console.log(`Reading image from: ${IMAGE_PATH}`);

    try {
        const imageBuffer = fs.readFileSync(IMAGE_PATH);
        const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

        console.log(`Image read successfully. Size: ${imageBuffer.length} bytes.`);
        console.log(`Updating profile for user: ${TARGET_USER_ID}...`);

        const { data, error } = await supabase
            .from('profiles')
            .update({ hero_url: base64Image })
            .eq('id', TARGET_USER_ID)
            .select();

        if (error) {
            console.error("Error updating profile:", error);
        } else {
            console.log("Profile updated successfully!");
            // Log a snippet to confirm
            if (data && data.length > 0) {
                const updatedUrl = data[0].hero_url;
                console.log(`New hero_url starts with: ${updatedUrl.substring(0, 50)}...`);
            }
        }

    } catch (err) {
        console.error("Error reading file or processing:", err);
    }
}

uploadHero();
