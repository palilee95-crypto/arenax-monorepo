import { NextResponse } from 'next/server';
import { supabase } from '@arenax/database';

export async function POST(request: Request) {
    try {
        const { userId, token } = await request.json();

        if (!userId || !token) {
            return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
        }

        // Update the user's profile with the FCM token
        const { error } = await supabase
            .from('profiles')
            .update({ fcm_token: token })
            .eq('id', userId);

        if (error) {
            console.error('Error saving FCM token:', error);
            return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Token saved successfully' });

    } catch (error: any) {
        console.error('Notification Token API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
