import { NextRequest, NextResponse } from 'next/server';

import { sendWelcomeEmail } from '@/libs/resend/email-helpers';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user details
        const { data: userData } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', user.id)
            .single();

        // Send welcome email
        const result = await sendWelcomeEmail({
            userEmail: user.email!,
            userName: userData?.full_name || undefined,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: 'Failed to send email', details: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, emailId: result.data?.id });
    } catch (error) {
        console.error('[send-welcome-email] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
