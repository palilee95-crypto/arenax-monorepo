import { createClient } from '@supabase/supabase-js';

// Direct initialization - simpler and more reliable
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

const isBrowser = typeof window !== 'undefined';
const hostname = isBrowser ? window.location.hostname : '';
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
const domain = (isBrowser && !isLocalhost && hostname.includes('.'))
    ? `.${hostname.split('.').slice(-2).join('.')}`
    : undefined;

console.log('[database] Initializing Supabase - URL:', supabaseUrl?.substring(0, 40) + '...');
if (isBrowser) {
    console.log('[database] Browser detected, domain for cookies:', domain || 'default');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'arenax-auth-token',
        // @ts-ignore
        cookieOptions: {
            domain: domain,
            path: '/',
            sameSite: 'lax',
            secure: isBrowser ? window.location.protocol === 'https:' : true,
        }
    }
});

export type Profile = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    password?: string;
    role: 'player' | 'venue-owner' | 'admin';
    nationality: string;
    state?: string;
    district?: string;
    phone_number?: string;
    date_of_birth?: string;
    preferred_foot?: string;
    position?: string;
    skill_level?: string;
    avatar_url?: string;
    hero_url?: string;
    status: 'pending' | 'verified' | 'rejected';
    created_at: string;
};

export type Venue = {
    id: string;
    owner_id: string;
    name: string;
    address: string;
    contact_number: string;
    total_courts: number;
    facilities: string[];
    created_at: string;
};

export type Match = {
    id: string;
    creator_id: string;
    venue_id: string;
    venue_name?: string; // Joined for convenience
    sport: 'Futsal' | 'Football';
    date: string;
    start_time: string;
    end_time: string;
    price_per_player: number;
    max_players: number;
    current_players: number;
    status: 'open' | 'full' | 'completed' | 'cancelled';
    match_type?: string;
    match_format?: string;
    team_name?: string;
    created_at: string;
};

export type TeamRequest = {
    id: string;
    team_id: string;
    user_id: string;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
};
