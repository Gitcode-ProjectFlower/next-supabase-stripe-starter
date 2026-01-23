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
        <Body className='bg-white font-sans'>
          <Container className='mx-auto max-w-xl px-5 py-10'>
            <Heading className='mb-4 text-2xl font-bold text-gray-900'>Subscription Cancelled</Heading>

            <Text className='mb-4 text-gray-700'>Hi {userName},</Text>

            <Text className='mb-6 text-gray-700'>
              We&apos;ve received your request to cancel your subscription. We&apos;re sorry to see you go.
            </Text>

            <Section className='mb-6 rounded-lg border border-gray-100 bg-gray-50 p-6'>
              <Text className='mb-2 font-semibold text-gray-900'>Access until end of billing period</Text>
              <Text className='text-gray-600'>
                You will continue to have access to your plan features until{' '}
                <strong>{new Date(endDate).toLocaleDateString()}</strong>. After this date, your account will be
                downgraded to the free plan.
              </Text>
            </Section>

            <Text className='mb-6 text-gray-700'>
              If you change your mind, you can reactivate your subscription at any time before the end date.
            </Text>

            <Button
              className='block w-full rounded-lg bg-gray-900 px-6 py-3 text-center font-semibold text-white'
              href={`${process.env.NEXT_PUBLIC_SITE_URL}/pricing`}
            >
              Reactivate Subscription
            </Button>

            <Hr className='my-8 border-gray-200' />

            <Text className='text-center text-xs text-gray-500'>We hope to see you again soon!</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default SubscriptionCancellationEmail;
