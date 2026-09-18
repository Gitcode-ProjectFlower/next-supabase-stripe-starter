import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { checkRateLimit, getClientIp } from '@/libs/ratelimit';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const loginLimit = await checkRateLimit(`login:${getClientIp(request)}`, 'auth');
    if (!loginLimit.allowed) {
      return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 });
    }

    const validation = loginSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }
    const { email, password } = validation.data;

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
