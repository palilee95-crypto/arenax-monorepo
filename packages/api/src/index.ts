import { supabase } from '@arenax/database';
import { env } from '@arenax/env';

/**
 * Centered API interface for all monorepo applications.
 * This ensures consistent error handling and type safety.
 */

export const apiClient = {
    auth: {
        getUser: () => supabase.auth.getUser(),
        signOut: () => supabase.auth.signOut(),
    },
    profile: {
        get: (id: string) => supabase.from('profiles').select('*').eq('id', id).single(),
    },
    // Higher-level match discovery API (example)
    matches: {
        listOpen: () => supabase.from('matches').select('*, venues(*)').eq('status', 'open'),
    }
};
