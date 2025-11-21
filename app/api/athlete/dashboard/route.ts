import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAthleteDashboardData } from '@/lib/queries/athlete-dashboard';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createServerClient();

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get dashboard data
        const dashboardData = await getAthleteDashboardData(user.id);

        return NextResponse.json({ success: true, data: dashboardData });
    } catch (error) {
        console.error('[Dashboard API] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}
