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

interface PlanChangeEmailProps {
    userName?: string;
    newPlanName: string;
    nextBillingDate: string;
    amount: number;
    currency: string;
}

export const PlanChangeEmail = ({
    userName = 'Valued Customer',
    newPlanName = 'Medium',
    nextBillingDate = '2025-01-01',
    amount = 9900,
    currency = 'usd',
}: PlanChangeEmailProps) => {
    const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount / 100);

    return (
        <Html>
            <Head />
            <Preview>Your subscription plan has been updated</Preview>
            <Tailwind>
                <Body className="bg-white font-sans">
                    <Container className="mx-auto py-10 px-5 max-w-xl">
                        <Heading className="text-2xl font-bold text-gray-900 mb-4">
                            Plan Updated Successfully
                        </Heading>

                        <Text className="text-gray-700 mb-4">
                            Hi {userName},
                        </Text>

                        <Text className="text-gray-700 mb-6">
                            Your subscription has been successfully updated to the <strong>{newPlanName}</strong> plan.
                            You now have access to all the features included in your new plan.
                        </Text>

                        <Section className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-100">
                            <Text className="text-gray-900 font-semibold mb-2 uppercase text-xs tracking-wider">
                                New Plan Details
                            </Text>
                            <Text className="text-2xl font-bold text-blue-600 mb-1">
                                {newPlanName} Plan
                            </Text>
                            <Text className="text-gray-600 text-sm">
                                {formattedAmount} / month
                            </Text>
                            <Hr className="my-4 border-gray-200" />
                            <Text className="text-gray-600 text-sm">
                                Your next billing date is {new Date(nextBillingDate).toLocaleDateString()}.
                            </Text>
                        </Section>

                        <Button
                            className="bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold text-center block w-full"
                            href={`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`}
                        >
                            Go to Dashboard
                        </Button>

                        <Hr className="my-8 border-gray-200" />

                        <Text className="text-gray-500 text-xs text-center">
                            If you didn&apos;t request this change, please contact our support team immediately.
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default PlanChangeEmail;
