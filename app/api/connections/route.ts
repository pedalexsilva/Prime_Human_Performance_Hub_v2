import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function DELETE(request: Request) {
    try {
        const supabase = await createServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { platform } = body;

        if (!platform) {
            return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
        }

        // Delete the connection
        const { error: deleteError } = await supabase
            .from('device_connections')
            .delete()
            .eq('user_id', user.id)
            .eq('platform', platform);

        if (deleteError) {
            console.error('[Connections API] Error deleting connection:', deleteError);
            return NextResponse.json({ error: 'Failed to disconnect service' }, { status: 500 });
        }

        // If platform is Whoop, also delete the tokens
        if (platform === 'whoop') {
            const { error: tokenError } = await supabase
                .from('whoop_tokens')
                .delete()
                .eq('user_id', user.id);

            if (tokenError) {
                console.error('[Connections API] Error deleting Whoop tokens:', tokenError);
                // We don't return an error here because the primary connection is already deleted
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Connections API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
