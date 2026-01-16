import { messaging } from './firebase-admin';
import { supabase } from '@arenax/database';

export async function sendPushNotification(userId: string, title: string, body: string, data?: any) {
    try {
        // 1. Get the user's FCM token from the database
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('fcm_token')
            .eq('id', userId)
            .single();

        if (error || !profile?.fcm_token) {
            console.log(`[notifications] No FCM token found for user ${userId}`);
            return null;
        }

        // 2. Construct the message
        const message = {
            notification: {
                title,
                body,
            },
            token: profile.fcm_token,
            data: data || {},
        };

        // 3. Send the notification
        const response = await messaging.send(message);
        console.log(`[notifications] Successfully sent message to user ${userId}:`, response);
        return response;

    } catch (error) {
        console.error(`[notifications] Error sending message to user ${userId}:`, error);
        return null;
    }
}
