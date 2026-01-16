import { NextResponse } from 'next/server';
import { supabase } from '@arenax/database';
import { sendPushNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const { matchId, joinerId } = await request.json();

        if (!matchId || !joinerId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // 1. Get match details and creator profile
        const { data: match, error: matchError } = await supabase
            .from('matches')
            .select('creator_id, venues(name)')
            .eq('id', matchId)
            .single();

        if (matchError || !match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        // 2. Get joiner profile
        const { data: joiner, error: joinerError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', joinerId)
            .single();

        if (joinerError || !joiner) {
            return NextResponse.json({ error: 'Joiner not found' }, { status: 404 });
        }

        // 3. Send notification to creator
        const venueData = match.venues as any;
        const venueName = Array.isArray(venueData) ? venueData[0]?.name : venueData?.name;
        const title = 'New Player Joined!';
        const body = `${joiner.first_name} ${joiner.last_name} has joined your match at ${venueName || 'your venue'}.`;

        await sendPushNotification(match.creator_id, title, body, {
            matchId: matchId,
            type: 'match_join'
        });

        return NextResponse.json({ message: 'Notification sent' });

    } catch (error: any) {
        console.error('Match Join Notification Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
