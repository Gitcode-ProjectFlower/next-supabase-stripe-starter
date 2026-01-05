import { NextRequest, NextResponse } from 'next/server';

import { sendWelcomeEmail } from '@/libs/resend/email-helpers';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Input validation
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Create user account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user) {
      const { data: userData } = await supabase.from('users').select('full_name').eq('id', data.user.id).single();

      await sendWelcomeEmail({
        userEmail: email,
        // @ts-ignore - Supabase type inference issue with select queries
        userName: userData?.full_name || undefined,
      });
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error: any) {
    console.error('[Signup] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
