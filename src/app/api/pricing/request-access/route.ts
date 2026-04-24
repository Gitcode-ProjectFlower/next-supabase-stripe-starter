import { NextRequest, NextResponse } from 'next/server';

import { FROM_EMAIL, resendClient } from '@/libs/resend/resend-client';

const HELP_EMAIL = process.env.HELP_EMAIL || 'info@insidefirms.com';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const message: string = body.message?.trim() ?? '';

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const subject = `Pay-as-you-go request — ${email}`;
    const html = `
      <h2>New Pay-as-you-go Request</h2>
      <p><strong>From:</strong> ${escapeHtml(email)}</p>
      <p><strong>Source:</strong> pay_as_you_go</p>
      ${
        message
          ? `<p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`
          : '<p><em>No message provided.</em></p>'
      }
      <hr>
      <p><small>Timestamp: ${new Date().toISOString()}</small></p>
    `;

    const { data, error } = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: HELP_EMAIL,
      replyTo: email,
      subject,
      html,
    });

    if (error) {
      console.error('[pricing/request-access] Error sending email:', error);
      return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
    }

    console.log('[pricing/request-access] Request sent successfully:', data?.id);
    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error: any) {
    console.error('[pricing/request-access] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
