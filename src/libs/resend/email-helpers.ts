import ExportReadyEmail from '@/emails/export-ready-email';
import SubscriptionConfirmationEmail from '@/emails/subscription-confirmation-email';
import WelcomeEmail from '@/emails/welcome-email';
import { render } from '@react-email/render';

import { FROM_EMAIL, resendClient } from './resend-client';

interface SendWelcomeEmailParams {
    userEmail: string;
    userName?: string;
}

export async function sendWelcomeEmail({ userEmail, userName }: SendWelcomeEmailParams) {
    try {
        const emailHtml = await render(
            WelcomeEmail({
                userEmail,
                userName,
            })
        );

        const { data, error } = await resendClient.emails.send({
            from: FROM_EMAIL,
            to: userEmail,
            subject: 'Welcome to Our Platform!',
            html: emailHtml,
        });

        if (error) {
            console.error('[sendWelcomeEmail] Error:', error);
            return { success: false, error };
        }

        console.log('[sendWelcomeEmail] Email sent successfully:', data?.id);
        return { success: true, data };
    } catch (error) {
        console.error('[sendWelcomeEmail] Exception:', error);
        return { success: false, error };
    }
}

interface SendSubscriptionConfirmationParams {
    userEmail: string;
    userName?: string;
    planName: string;
    amount: number;
    currency: string;
    interval: string;
    nextBillingDate: string;
}

export async function sendSubscriptionConfirmation(params: SendSubscriptionConfirmationParams) {
    try {
        const emailHtml = await render(SubscriptionConfirmationEmail(params));

        const { data, error } = await resendClient.emails.send({
            from: FROM_EMAIL,
            to: params.userEmail,
            subject: `Subscription Confirmed - ${params.planName}`,
            html: emailHtml,
        });

        if (error) {
            console.error('[sendSubscriptionConfirmation] Error:', error);
            return { success: false, error };
        }

        console.log('[sendSubscriptionConfirmation] Email sent successfully:', data?.id);
        return { success: true, data };
    } catch (error) {
        console.error('[sendSubscriptionConfirmation] Exception:', error);
        return { success: false, error };
    }
}

interface SendExportReadyEmailParams {
    userEmail: string;
    userName?: string;
    selectionName: string;
    downloadUrl: string;
    expiresAt: string;
}

export async function sendExportReadyEmail({
    userEmail,
    userName,
    downloadLink,
    selectionName,
    fileSize,
    expiresIn,
}: {
    userEmail: string;
    userName?: string;
    downloadLink: string;
    selectionName: string;
    fileSize: string;
    expiresIn: string;
}) {
    try {
        const { data, error } = await resendClient.emails.send({
            from: FROM_EMAIL,
            to: userEmail, // Changed from hardcoded 'olehkhomynn@gmail.com' to userEmail
            subject: 'Your export is ready to download',
            react: ExportReadyEmail({
                userName,
                userEmail, // Added missing required prop
                downloadUrl: downloadLink, // Mapped downloadLink to downloadUrl
                selectionName,
                expiresAt: expiresIn, // Mapped expiresIn to expiresAt
            }),
        });

        if (error) {
            console.error('Error sending export ready email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending export ready email:', error);
        return { success: false, error };
    }
}

import PlanChangeEmail from '@/emails/plan-change-email'; // Changed to default import
import SubscriptionCancellationEmail from '@/emails/subscription-cancellation-email'; // Changed to default import

export async function sendPlanChangeEmail({
    userEmail,
    userName,
    newPlanName,
    nextBillingDate,
    amount,
    currency,
}: {
    userEmail: string;
    userName?: string;
    newPlanName: string;
    nextBillingDate: string;
    amount: number;
    currency: string;
}) {
    try {
        const { data, error } = await resendClient.emails.send({ // Changed resend to resendClient
            from: FROM_EMAIL, // Changed from process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev' to FROM_EMAIL
            to: userEmail, // Changed from hardcoded 'olehkhomynn@gmail.com' to userEmail
            subject: 'Your subscription plan has been updated',
            react: PlanChangeEmail({
                userName,
                newPlanName,
                nextBillingDate,
                amount,
                currency,
            }),
        });

        if (error) {
            console.error('Error sending plan change email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending plan change email:', error);
        return { success: false, error };
    }
}

export async function sendSubscriptionCancellationEmail({
    userEmail,
    userName,
    endDate,
}: {
    userEmail: string;
    userName?: string;
    endDate: string;
}) {
    try {
        const { data, error } = await resendClient.emails.send({ // Changed resend to resendClient
            from: FROM_EMAIL, // Changed from process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev' to FROM_EMAIL
            to: userEmail, // Changed from hardcoded 'olehkhomynn@gmail.com' to userEmail
            subject: 'Subscription cancellation confirmation',
            react: SubscriptionCancellationEmail({
                userName,
                endDate,
            }),
        });

        if (error) {
            console.error('Error sending cancellation email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending cancellation email:', error);
        return { success: false, error };
    }
}
