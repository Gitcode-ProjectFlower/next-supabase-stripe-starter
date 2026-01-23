import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components';

interface SubscriptionConfirmationEmailProps {
  userName?: string;
  userEmail: string;
  planName: string;
  amount: number;
  currency: string;
  interval: string;
  nextBillingDate: string;
}

export const SubscriptionConfirmationEmail = ({
  userName,
  userEmail,
  planName,
  amount,
  currency,
  interval,
  nextBillingDate,
}: SubscriptionConfirmationEmailProps) => {
  const displayName = userName || userEmail.split('@')[0];
  const formattedAmount = (amount / 100).toFixed(2);
  const currencySymbol = currency.toUpperCase() === 'USD' ? '$' : currency;

  return (
    <Html>
      <Head />
      <Preview>Your subscription to {planName} is now active!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Subscription Confirmed! 🎉</Heading>

          <Text style={text}>Hi {displayName},</Text>

          <Text style={text}>
            Thank you for subscribing! Your payment was successful and your subscription is now active.
          </Text>

          <Section style={detailsBox}>
            <Heading style={h2}>Subscription Details</Heading>
            <Text style={detail}>
              <strong>Plan:</strong> {planName}
            </Text>
            <Text style={detail}>
              <strong>Amount:</strong> {currencySymbol}
              {formattedAmount} / {interval}
            </Text>
            <Text style={detail}>
              <strong>Next Billing Date:</strong> {new Date(nextBillingDate).toLocaleDateString()}
            </Text>
          </Section>

          <Text style={text}>You now have access to all premium features included in your plan.</Text>

          <Section style={buttonContainer}>
            <Button style={button} href={`${process.env.NEXT_PUBLIC_SITE_URL}/account`}>
              Manage Subscription
            </Button>
          </Section>

          <Text style={text}>
            If you didn&apos;t subscribe to this plan, please contact our support team immediately. don&apos;t hesitate
            to contact our support team.
          </Text>

          <Text style={footer}>
            Best regards,
            <br />
            The Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default SubscriptionConfirmationEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 24px',
};

const detailsBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px',
};

const detail = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '24px',
};
