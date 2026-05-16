import { Metadata } from 'next';

import { LegalPageLayout, LegalSection, LegalSubheading } from '@/components/legal-page-layout';

export const metadata: Metadata = {
  title: 'Privacy Policy | InsideFirms',
  description: 'How InsideFirms collects, uses, and protects user information.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title='Privacy Policy' lastUpdated='May 2026'>
      <LegalSection heading='Introduction'>
        <p>
          InsideFirms (&ldquo;InsideFirms&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) provides
          commercial intelligence and company analysis tools based on publicly available company information.
        </p>
        <p>
          This Privacy Policy explains what information we collect, how we use it, and how we protect it when you use
          the InsideFirms platform and related services.
        </p>
        <p>By using InsideFirms, you agree to the practices described in this policy.</p>
      </LegalSection>

      <LegalSection heading='Information We Collect'>
        <LegalSubheading>Account Information</LegalSubheading>
        <p>When you create an account, we may collect:</p>
        <ul className='ml-5 list-disc space-y-1'>
          <li>Name</li>
          <li>Email address</li>
          <li>Authentication details provided through login providers</li>
          <li>Billing-related information</li>
        </ul>

        <LegalSubheading>Usage Information</LegalSubheading>
        <p>We collect information related to how the platform is used, including:</p>
        <ul className='ml-5 list-disc space-y-1'>
          <li>Searches and filters</li>
          <li>Selected companies</li>
          <li>Generated analyses and reports</li>
          <li>Platform interactions and feature usage</li>
          <li>Device and browser information</li>
          <li>Approximate geographic information based on IP address</li>
        </ul>

        <LegalSubheading>Payment Information</LegalSubheading>
        <p>
          Payments are processed securely through third-party payment providers such as Stripe. InsideFirms does not
          store full payment card details on its own servers.
        </p>

        <LegalSubheading>Public Company Information</LegalSubheading>
        <p>
          InsideFirms analyzes publicly available company information, including information published on company
          websites and publicly accessible business sources.
        </p>
        <p>
          This information is used to generate commercial insights, classifications, summaries, and related analysis
          outputs.
        </p>
      </LegalSection>

      <LegalSection heading='How We Use Information'>
        <p>We use collected information to:</p>
        <ul className='ml-5 list-disc space-y-1'>
          <li>Provide and improve the platform</li>
          <li>Generate analyses and insights</li>
          <li>Save user selections and reports</li>
          <li>Process subscriptions and payments</li>
          <li>Monitor platform performance and security</li>
          <li>Prevent abuse and unauthorized access</li>
          <li>Communicate product updates and support responses</li>
        </ul>
        <p>Your searches, selections, and generated outputs are not shared with other users or sold to third parties.</p>
      </LegalSection>

      <LegalSection heading='Data Privacy'>
        <p>InsideFirms is designed for commercial company research and analysis.</p>
        <p>
          User searches, inputs, and generated outputs remain private to the account owner, except where disclosure is
          required by law or necessary to operate the service through trusted infrastructure providers.
        </p>
        <p>We do not sell personal user data to advertisers or data brokers.</p>
      </LegalSection>

      <LegalSection heading='Data Retention'>
        <p>
          We retain account and platform usage data for as long as necessary to provide the service, comply with legal
          obligations, resolve disputes, and maintain platform security.
        </p>
        <p>
          Users may request deletion of their account and associated personal data by contacting support.
        </p>
      </LegalSection>

      <LegalSection heading='Security'>
        <p>
          We take reasonable technical and organizational measures to protect user information against unauthorized
          access, loss, misuse, or disclosure.
        </p>
        <p>
          Access to platform data is limited to authorized systems and service providers necessary to operate the
          platform.
        </p>
        <p>However, no online platform can guarantee absolute security.</p>
      </LegalSection>

      <LegalSection heading='Third-Party Services'>
        <p>
          InsideFirms may rely on third-party providers for infrastructure and platform operations, including services
          related to:
        </p>
        <ul className='ml-5 list-disc space-y-1'>
          <li>Authentication</li>
          <li>Payments</li>
          <li>Hosting</li>
          <li>Analytics</li>
          <li>Error monitoring</li>
          <li>Customer support</li>
        </ul>
        <p>These providers may process data on our behalf under their own privacy and security practices.</p>
      </LegalSection>

      <LegalSection heading='Cookies and Analytics'>
        <p>InsideFirms may use cookies and similar technologies to:</p>
        <ul className='ml-5 list-disc space-y-1'>
          <li>Maintain user sessions</li>
          <li>Improve platform functionality</li>
          <li>Analyze usage and performance</li>
          <li>Remember preferences</li>
        </ul>
        <p>Users may manage cookie settings through their browser.</p>
      </LegalSection>

      <LegalSection heading='International Data Transfers'>
        <p>
          Depending on your location and the infrastructure providers used, information may be processed in countries
          outside your own jurisdiction.
        </p>
        <p>We take reasonable measures to ensure appropriate safeguards are in place for such transfers.</p>
      </LegalSection>

      <LegalSection heading='Your Rights'>
        <p>Depending on applicable laws and your location, you may have rights to:</p>
        <ul className='ml-5 list-disc space-y-1'>
          <li>Access your personal data</li>
          <li>Correct inaccurate information</li>
          <li>Request deletion of your data</li>
          <li>Object to certain processing activities</li>
          <li>Request a copy of your data</li>
        </ul>
        <p>Requests can be submitted through our support contact.</p>
      </LegalSection>

      <LegalSection heading='Changes to This Policy'>
        <p>
          We may update this Privacy Policy from time to time to reflect platform, legal, or operational changes.
        </p>
        <p>
          Updated versions will be published on this page with a revised &ldquo;Last updated&rdquo; date.
        </p>
      </LegalSection>

      <LegalSection heading='Contact'>
        <p>
          If you have questions about this Privacy Policy or how InsideFirms handles data, you can contact us through
          the Help page or via the support contact listed on the platform.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
