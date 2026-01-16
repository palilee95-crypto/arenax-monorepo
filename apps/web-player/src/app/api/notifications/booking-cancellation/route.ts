import { NextResponse } from 'next/server';
import { supabase } from '@arenax/database';
import { sendPushNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const { bookingId, userId, reason } = await request.json();

        if (!bookingId || !userId) {
            return NextResponse.json({ error: 'Missing bookingId or userId' }, { status: 400 });
        }

        // 1. Fetch booking and venue details
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('*, venues(name, owner_id, profiles:owner_id(fcm_token))')
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            console.error('Error fetching booking:', bookingError);
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // 2. Fetch user details (who cancelled)
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            console.error('Error fetching user:', userError);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const venue = booking.venues as any;
        const owner = venue.profiles as any;

        if (owner && owner.fcm_token) {
            await sendPushNotification(
                owner.fcm_token,
                'Booking Cancelled',
                `${user.first_name} ${user.last_name} cancelled their booking at ${venue.name} for ${booking.date}. Reason: ${reason || 'Not specified'}`,
                {
                    type: 'booking_cancellation',
                    bookingId,
                    link: `/${venue.owner_id}/bookings`
                }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in booking-cancellation notification API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
