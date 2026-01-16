import { adminDb } from './firebase-admin';

export async function sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>
) {
    try {
        const message = {
            notification: {
                title,
                body,
            },
            data: data || {},
            token,
        };

        const response = await adminDb.send(message);
        console.log('Successfully sent message:', response);
        return response;
    } catch (error) {
        console.error('Error sending push notification:', error);
        throw error;
    }
}
