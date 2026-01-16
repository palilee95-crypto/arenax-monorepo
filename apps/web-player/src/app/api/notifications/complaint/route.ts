import { NextResponse } from 'next/server';
import { supabase } from '@arenax/database';
import { sendPushNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const { userId, type, description, matchId } = await request.json();

        if (!userId || !type || !description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Fetch user details (who filed the complaint)
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            console.error('Error fetching user:', userError);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 2. Fetch all admins to notify
        const { data: admins, error: adminsError } = await supabase
            .from('profiles')
            .select('id, fcm_token')
            .eq('role', 'admin');

        if (adminsError) {
            console.error('Error fetching admins:', adminsError);
            return NextResponse.json({ error: 'Error fetching admins' }, { status: 500 });
        }

        // 3. Send notification to each admin who has an FCM token
        const notificationPromises = admins
            .filter(admin => admin.fcm_token)
            .map(admin =>
                sendPushNotification(
                    admin.fcm_token!,
                    'New Complaint/Dispute Filed',
                    `${user.first_name} ${user.last_name} filed a ${type}: ${description.substring(0, 50)}...`,
                    {
                        type: 'complaint_dispute',
                        userId,
                        matchId: matchId || '',
                        link: `/${admin.id}/complaints`
                    }
                ).catch(err => console.error(`Error notifying admin ${admin.id}:`, err))
            );

        await Promise.all(notificationPromises);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in complaint notification API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
