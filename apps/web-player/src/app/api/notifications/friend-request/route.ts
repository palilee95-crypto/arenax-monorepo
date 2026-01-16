import { NextResponse } from 'next/server';
import { supabase } from '@arenax/database';
import { sendPushNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const { senderId, receiverId } = await request.json();

        if (!senderId || !receiverId) {
            return NextResponse.json({ error: 'Missing senderId or receiverId' }, { status: 400 });
        }

        // 1. Fetch sender details
        const { data: sender, error: senderError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', senderId)
            .single();

        if (senderError || !sender) {
            console.error('Error fetching sender:', senderError);
            return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
        }

        // 2. Fetch receiver's FCM token
        const { data: receiver, error: receiverError } = await supabase
            .from('profiles')
            .select('fcm_token')
            .eq('id', receiverId)
            .single();

        if (receiverError || !receiver) {
            console.error('Error fetching receiver:', receiverError);
            return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
        }

        if (receiver.fcm_token) {
            await sendPushNotification(
                receiver.fcm_token,
                'New Friend Request',
                `${sender.first_name} ${sender.last_name} sent you a friend request!`,
                {
                    type: 'friend_request',
                    senderId,
                    link: `/${receiverId}/friends`
                }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in friend-request notification API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
