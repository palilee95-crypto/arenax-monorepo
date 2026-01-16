import { NextResponse } from 'next/server';
import { supabase } from '@arenax/database';
import { sendPushNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const { userId, venueId, matchId, date, startTime, endTime } = await request.json();

        if (!userId || !venueId || !matchId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Fetch user details
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            console.error('Error fetching user:', userError);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 2. Fetch venue owner details and FCM token
        const { data: venue, error: venueError } = await supabase
            .from('venues')
            .select('name, owner_id, profiles:owner_id(fcm_token)')
            .eq('id', venueId)
            .single();

        if (venueError || !venue) {
            console.error('Error fetching venue:', venueError);
            return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
        }

        const owner = venue.profiles as any;
        if (owner && owner.fcm_token) {
            await sendPushNotification(
                owner.fcm_token,
                'New Booking Received',
                `${user.first_name} ${user.last_name} booked a court at ${venue.name} for ${date} at ${startTime}.`,
                {
                    type: 'new_booking',
                    matchId,
                    venueId,
                    link: `/${venue.owner_id}/bookings`
                }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in new-booking notification API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
