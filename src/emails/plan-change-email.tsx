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
        <Body className='bg-white font-sans'>
          <Container className='mx-auto max-w-xl px-5 py-10'>
            <Heading className='mb-4 text-2xl font-bold text-gray-900'>Plan Updated Successfully</Heading>

            <Text className='mb-4 text-gray-700'>Hi {userName},</Text>

            <Text className='mb-6 text-gray-700'>
              Your subscription has been successfully updated to the <strong>{newPlanName}</strong> plan. You now have
              access to all the features included in your new plan.
            </Text>

            <Section className='mb-6 rounded-lg border border-gray-100 bg-gray-50 p-6'>
              <Text className='mb-2 text-xs font-semibold uppercase tracking-wider text-gray-900'>
                New Plan Details
              </Text>
              <Text className='mb-1 text-2xl font-bold text-blue-600'>{newPlanName} Plan</Text>
              <Text className='text-sm text-gray-600'>{formattedAmount} / month</Text>
              <Hr className='my-4 border-gray-200' />
              <Text className='text-sm text-gray-600'>
                Your next billing date is {new Date(nextBillingDate).toLocaleDateString()}.
              </Text>
            </Section>

            <Button
              className='block w-full rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white'
              href={`${process.env.NEXT_PUBLIC_SITE_URL}/`}
            >
              Go to Dashboard
            </Button>

            <Hr className='my-8 border-gray-200' />

            <Text className='text-center text-xs text-gray-500'>
              If you didn&apos;t request this change, please contact our support team immediately.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PlanChangeEmail;
