import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { checkRateLimit, getClientIp } from '@/libs/ratelimit';
import { sendWelcomeEmail } from '@/libs/resend/email-helpers';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

const signupSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const signupLimit = await checkRateLimit(`signup:${getClientIp(request)}`, 'auth');
    if (!signupLimit.allowed) {
      return NextResponse.json({ error: 'Too many signup attempts. Please try again later.' }, { status: 429 });
    }

    const validation = signupSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }
    const { email, password } = validation.data;

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
