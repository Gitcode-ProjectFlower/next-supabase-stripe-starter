import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/settings/notifications
 * Fetch user's email notification preferences
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
      .select('id, email_notifications_enabled')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('[Notifications API] Error fetching preferences:', error);
      // If user record doesn't exist, default to false
      return NextResponse.json({ enabled: false });
    }

    // Return the preference (default to false if not set)
    const enabled = (userData as any)?.email_notifications_enabled as boolean ?? false;

    return NextResponse.json({ enabled });
  } catch (error) {
    console.error('[Notifications API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/notifications
 * Update user's email notification preferences
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

    const { enabled } = await request.json();

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request: enabled must be a boolean' }, { status: 400 });
    }

    // Update user preferences in users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ email_notifications_enabled: enabled } as any)
      .eq('id', user.id);

    if (updateError) {
      console.error('[Notifications API] Error updating preferences:', updateError);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({ enabled, success: true });
  } catch (error) {
    console.error('[Notifications API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
