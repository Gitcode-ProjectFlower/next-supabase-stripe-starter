import * as React from 'react';

import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Preview,
    Section,
    Tailwind,
    Text,
} from '@react-email/components';

interface SubscriptionCancellationEmailProps {
    userName?: string;
    endDate: string;
}

export const SubscriptionCancellationEmail = ({
    userName = 'Valued Customer',
    endDate = '2025-01-01',
}: SubscriptionCancellationEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Subscription cancellation confirmation</Preview>
            <Tailwind>
                <Body className="bg-white font-sans">
                    <Container className="mx-auto py-10 px-5 max-w-xl">
                        <Heading className="text-2xl font-bold text-gray-900 mb-4">
                            Subscription Cancelled
                        </Heading>

                        <Text className="text-gray-700 mb-4">
                            Hi {userName},
                        </Text>

                        <Text className="text-gray-700 mb-6">
                            We&apos;ve received your request to cancel your subscription. We&apos;re sorry to see you go.
                        </Text>

                        <Section className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-100">
                            <Text className="text-gray-900 font-semibold mb-2">
                                Access until end of billing period
                            </Text>
                            <Text className="text-gray-600">
                                You will continue to have access to your plan features until <strong>{new Date(endDate).toLocaleDateString()}</strong>.
                                After this date, your account will be downgraded to the free plan.
                            </Text>
                        </Section>

                        <Text className="text-gray-700 mb-6">
                            If you change your mind, you can reactivate your subscription at any time before the end date.
                        </Text>

                        <Button
                            className="bg-gray-900 text-white rounded-lg px-6 py-3 font-semibold text-center block w-full"
                            href={`${process.env.NEXT_PUBLIC_SITE_URL}/pricing`}
                        >
                            Reactivate Subscription
                        </Button>

                        <Hr className="my-8 border-gray-200" />

                        <Text className="text-gray-500 text-xs text-center">
                            We hope to see you again soon!
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default SubscriptionCancellationEmail;
