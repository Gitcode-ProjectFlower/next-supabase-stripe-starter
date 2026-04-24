import { NextRequest, NextResponse } from 'next/server';

import { FROM_EMAIL, resendClient } from '@/libs/resend/resend-client';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

const HELP_EMAIL = process.env.HELP_EMAIL || 'info@insidefirms.com';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ContactSource = 'help_form' | 'pay_as_you_go';

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email: string = body.email?.trim() ?? '';
    const question: string = body.question?.trim() ?? '';
    const userId: string | null = body.userId ?? null;
    const source: ContactSource = body.source === 'pay_as_you_go' ? 'pay_as_you_go' : 'help_form';

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    if (!question) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let userName: string | null = null;
    if (userId) {
      const supabase = await createSupabaseServerClient();
      const { data: userData } = await supabase.from('users').select('full_name').eq('id', userId).single();
      // @ts-ignore - Supabase type inference issue with select queries
      if (userData?.full_name) userName = userData.full_name as string;
    }

    const subject = `Help Request — ${email}`;
    const html = `
      <h2>New Help Request</h2>
      <p><strong>From:</strong> ${escapeHtml(email)}${userName ? ` (${escapeHtml(userName)})` : ''}</p>
      <p><strong>Source:</strong> ${escapeHtml(source)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(question).replace(/\n/g, '<br>')}</p>
      <hr>
      <p><small>
        ${userId ? `User ID: ${escapeHtml(userId)}<br>` : ''}
        Timestamp: ${new Date().toISOString()}
      </small></p>
    `;

    const { data, error } = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: HELP_EMAIL,
      replyTo: email,
      subject,
      html,
    });

    if (error) {
      console.error('[help/send] Error sending email:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    console.log('[help/send] Help message sent successfully:', data?.id);
    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error: any) {
    console.error('[help/send] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
