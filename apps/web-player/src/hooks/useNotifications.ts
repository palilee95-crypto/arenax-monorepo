import { useEffect, useState } from 'react';
import { requestForToken, onMessageListener } from '../lib/firebase';

export const useNotifications = (userId: string | undefined) => {
    const [notification, setNotification] = useState<any>(null);

    useEffect(() => {
        if (!userId) return;

        const setupNotifications = async () => {
            // Request permission and get token
            const token = await requestForToken();

            if (token) {
                // Save token to database
                try {
                    await fetch('/api/notifications/token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            userId: userId,
                            token: token,
                        }),
                    });
                } catch (error) {
                    console.error('Error saving notification token:', error);
                }
            }
        };

        setupNotifications();

        // Listen for foreground messages
        onMessageListener()
            .then((payload) => {
                setNotification(payload);
                console.log('Received foreground message:', payload);
            })
            .catch((err) => console.log('failed: ', err));
    }, [userId]);

    return { notification };
};
