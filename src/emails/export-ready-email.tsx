import * as React from 'react';

import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
} from '@react-email/components';

interface ExportReadyEmailProps {
    userName?: string;
    userEmail: string;
    selectionName: string;
    downloadUrl: string;
    expiresAt: string;
}

export const ExportReadyEmail = ({
    userName,
    userEmail,
    selectionName,
    downloadUrl,
    expiresAt,
}: ExportReadyEmailProps) => {
    const displayName = userName || userEmail.split('@')[0];
    const expirationDate = new Date(expiresAt).toLocaleDateString();

    return (
        <Html>
            <Head />
            <Preview>Your CSV export for &quot;{selectionName}&quot; is ready to download!</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>Your Export is Ready! 📊</Heading>

                    <Text style={text}>
                        Hi {displayName},
                    </Text>

                    <Text style={text}>
                        Great news! Your CSV export for <strong>&quot;{selectionName}&quot;</strong> has been generated and is ready to download.
                    </Text>

                    <Section style={infoBox}>
                        <Text style={info}>
                            ⏰ This download link will expire on <strong>{expirationDate}</strong>
                        </Text>
                    </Section>

                    <Section style={buttonContainer}>
                        <table cellPadding="0" cellSpacing="0" border={0}>
                            <tr>
                                <td style={button}>
                                    <a href={downloadUrl} style={buttonLink}>
                                        Download CSV
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </Section>

                    <Text style={text}>
                        If the button above doesn&apos;t work, copy and paste this link into your browser:
                    </Text>

                    <Text style={linkText}>
                        {downloadUrl}
                    </Text>

                    <Text style={text}>
                        If you have any issues downloading your file, please contact our support team.
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

export default ExportReadyEmail;

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

const infoBox = {
    backgroundColor: '#fff3cd',
    borderLeft: '4px solid #ffc107',
    borderRadius: '4px',
    padding: '16px',
    margin: '24px',
};

const info = {
    color: '#856404',
    fontSize: '14px',
    lineHeight: '24px',
    margin: '0',
};

const buttonContainer = {
    textAlign: 'center' as const,
    margin: '32px 0',
};

const button = {
    backgroundColor: '#28a745',
    borderRadius: '5px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
    cursor: 'pointer',
    border: 'none',
};

const buttonLink = {
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 'bold',
    display: 'block',
};

const linkText = {
    color: '#0066cc',
    fontSize: '12px',
    wordBreak: 'break-all' as const,
    margin: '16px 24px',
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontFamily: 'monospace',
};

const footer = {
    color: '#8898aa',
    fontSize: '14px',
    lineHeight: '24px',
    margin: '24px',
};
