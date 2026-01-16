import { createClient } from '@supabase/supabase-js';

// Direct initialization - simpler and more reliable
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

const isBrowser = typeof window !== 'undefined';
const hostname = isBrowser ? window.location.hostname : '';
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
    console.log('[database] Initializing Supabase');
    console.log('[database] URL:', supabaseUrl?.substring(0, 40) + '...');
}

// Improved domain calculation for cross-subdomain auth
let domain: string | undefined = undefined;
if (isBrowser && !isLocalhost) {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
        domain = `.${parts.slice(-2).join('.')}`;
    }
}

// Custom storage for cross-subdomain auth
const cookieStorage = {
    getItem: (key: string) => {
        if (!isBrowser) return null;
        const cookie = document.cookie.split('; ').find((row) => row.trim().startsWith(`${key}=`));
        if (!cookie) return null;
        const value = decodeURIComponent(cookie.split('=')[1]);
        if (isDev) console.log(`[database] CookieStorage: getItem(${key}) -> FOUND`);
        return value;
    },
    setItem: (key: string, value: string) => {
        if (!isBrowser) return;
        const domainAttr = domain ? `; domain=${domain}` : '';
        const secureAttr = window.location.protocol === 'https:' ? '; Secure' : '';
        const cookieString = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000${domainAttr}; SameSite=Lax${secureAttr}`;
        if (isDev) console.log(`[database] CookieStorage: setItem(${key}) on domain: ${domain || 'default'}`);
        document.cookie = cookieString;
    },
    removeItem: (key: string) => {
        if (!isBrowser) return;
        const domainAttr = domain ? `; domain=${domain}` : '';
        if (isDev) console.log(`[database] CookieStorage: removeItem(${key})`);
        document.cookie = `${key}=; path=/; max-age=0${domainAttr}; SameSite=Lax`;
    }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'arenax-auth-token',
        storage: cookieStorage
    }
});

export * from './types';
