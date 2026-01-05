import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/settings/notifications
 * Fetch user's email notification preferences from Supabase users table
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user preferences from users table
    const { data: userData, error } = await supabase
      .from('users')
      .select('email_notifications_enabled')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('[Notifications API] Error fetching preferences:', error);
      // If user record doesn't exist, default to false
      return NextResponse.json({ enabled: false });
    }

    // Return the preference (default to false if not set)
    // @ts-ignore - Supabase type inference issue with select queries
    const enabled = userData?.email_notifications_enabled ?? false;

    return NextResponse.json({ enabled });
  } catch (error) {
    console.error('[Notifications API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/notifications
 * Update user's email notification preferences in Supabase users table
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { enabled } = body;

    // Validate request body
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request: enabled must be a boolean' }, { status: 400 });
    }

    // Update user preferences in users table
    const { error: updateError } = await supabase
      .from('users')
      // @ts-ignore - Supabase browser client has TypeScript inference issue with update queries
      .update({ email_notifications_enabled: enabled })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Notifications API] Error updating preferences:', updateError);
      return NextResponse.json(
        { error: 'Failed to update preferences', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ enabled, success: true });
  } catch (error) {
    console.error('[Notifications API] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
