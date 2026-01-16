import { NextResponse } from 'next/server';
import { supabase } from '@arenax/database';
import { sendPushNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const { userId, amount, referenceId } = await request.json();

        if (!userId || !amount) {
            return NextResponse.json({ error: 'Missing userId or amount' }, { status: 400 });
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
                'Payout Successful',
                `Your payout of RM ${amount} has been successfully processed. Reference: ${referenceId || 'N/A'}`,
                {
                    type: 'payout_success',
                    userId,
                    amount: amount.toString(),
                    link: `/${userId}/wallet`
                }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in payout-success notification API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
