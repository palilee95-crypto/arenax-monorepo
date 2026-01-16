"use client";

import { useNotifications } from "../hooks/useNotifications";

export function NotificationHandler({ userId }: { userId: string }) {
    const { notification } = useNotifications(userId);

    // This component doesn't render anything, it just runs the hook
    return null;
}
