import { z } from 'zod';

const clientSchema = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export const env = {
    ...clientSchema.parse({
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }),
    ...serverSchema.parse({
        NODE_ENV: process.env.NODE_ENV,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    }),
};
