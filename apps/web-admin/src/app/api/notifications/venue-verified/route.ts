import { NextResponse } from 'next/server';
import { supabase } from '@arenax/database';
import { sendPushNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // 1. Fetch user details and FCM token
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('first_name, last_name, fcm_token')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            console.error('Error fetching user:', userError);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.fcm_token) {
            await sendPushNotification(
                user.fcm_token,
                'Account Verified!',
                `Congratulations ${user.first_name}! Your venue owner account has been verified. You can now start receiving bookings.`,
                {
                    type: 'venue_verified',
                    userId,
                    link: `/${userId}`
                }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in venue-verified notification API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
