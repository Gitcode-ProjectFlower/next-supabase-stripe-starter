import { NextRequest, NextResponse } from 'next/server';

import { resendClient } from '@/libs/resend/resend-client';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

// Email address stored server-side only (not exposed to frontend)
const HELP_EMAIL = process.env.HELP_EMAIL || 'info@insidefirms.com';

export async function POST(request: NextRequest) {
  try {
    const { question, userId, userEmail } = await request.json();

    // Validate input
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Get user details if logged in
    let userName: string | null = null;
    if (userId) {
      const { data: userData } = await supabase.from('users').select('full_name').eq('id', userId).single();

      // @ts-expect-error - Supabase type inference issue with select queries
      if (userData?.full_name) {
        // @ts-expect-error - Supabase type inference issue with select queries
        userName = userData.full_name;
      }
    }

    // Helper function to escape HTML
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    // Prepare email content
    const emailSubject = `Help Request${userName ? ` from ${escapeHtml(userName)}` : ''}`;
    const escapedQuestion = escapeHtml(question).replace(/\n/g, '<br>');
    const emailBody = `
      <h2>New Help Request</h2>
      <p><strong>Question:</strong></p>
      <p>${escapedQuestion}</p>
      <hr>
      <p><strong>User Information:</strong></p>
      <ul>
        ${userName ? `<li><strong>Name:</strong> ${escapeHtml(userName)}</li>` : ''}
        ${userEmail ? `<li><strong>Email:</strong> ${escapeHtml(userEmail)}</li>` : ''}
        ${userId ? `<li><strong>User ID:</strong> ${escapeHtml(userId)}</li>` : ''}
        <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
      </ul>
    `;

    // Send email using Resend
    const { data, error } = await resendClient.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: HELP_EMAIL,
      subject: emailSubject,
      html: emailBody,
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
