import * as React from 'react';

import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
} from '@react-email/components';

interface WelcomeEmailProps {
    userName?: string;
    userEmail: string;
}

export const WelcomeEmail = ({ userName, userEmail }: WelcomeEmailProps) => {
    const displayName = userName || userEmail.split('@')[0];

    return (
        <Html>
            <Head />
            <Preview>Welcome to {process.env.NEXT_PUBLIC_APP_NAME || 'Our Platform'}! We&apos;re glad to have you.</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>Welcome to Our Platform! 👋</Heading>

                    <Text style={text}>
                        Hi {displayName},
                    </Text>

                    <Text style={text}>
                        Thank you for signing up! We&apos;re excited to have you on board.
                    </Text>

                    <Text style={text}>
                        Your account has been successfully created and you can now start exploring our features:
                    </Text>

                    <Section style={features}>
                        <Text style={feature}>✨ Create and manage selections</Text>
                        <Text style={feature}>🔍 Perform advanced searches</Text>
                        <Text style={feature}>💬 Get AI-powered Q&A insights</Text>
                        <Text style={feature}>📊 Export your data to CSV</Text>
                    </Section>

                    <Section style={buttonContainer}>
                        <Button style={button} href={`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`}>
                            Go to Dashboard
                        </Button>
                    </Section>

                    <Text style={text}>
                        If you have any questions, feel free to reach out to our support team.
                    </Text>

                    <Text style={footer}>
                        Best regards,<br />
                        The Team
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default WelcomeEmail;

const main = {
    backgroundColor: '#f6f9fc',
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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

const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '26px',
    margin: '16px 24px',
};

const features = {
    margin: '24px 24px',
};

const feature = {
    color: '#555',
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
