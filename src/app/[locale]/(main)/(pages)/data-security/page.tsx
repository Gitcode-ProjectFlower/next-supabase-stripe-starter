import { Metadata } from 'next';

import { LegalPageLayout, LegalSection } from '@/components/legal-page-layout';

export const metadata: Metadata = {
  title: 'Data & Security | InsideFirms',
  description: 'How data is handled within InsideFirms and the measures taken to protect user information.',
};

export default function DataSecurityPage() {
  return (
    <LegalPageLayout title='Data & Security' lastUpdated='May 2026'>
      <LegalSection heading='Overview'>
        <p>
          InsideFirms is designed to help teams analyze and prioritize companies using company data and public
          information.
        </p>
        <p>
          We aim to provide a platform that is reliable, secure, and designed for professional commercial use.
        </p>
        <p>
          This page provides an overview of how data is handled within the platform and the measures taken to protect
          user information.
        </p>
      </LegalSection>

      <LegalSection heading='Data Sources'>
        <p>
          InsideFirms combines structured company data with publicly available information from business-related
          sources, including publicly accessible company websites.
        </p>
        <p>
          InsideFirms continuously processes and refreshes company information from multiple sources to improve data
          coverage and analysis quality over time.
        </p>
        <p>The platform uses this information to generate:</p>
        <ul className='ml-5 list-disc space-y-1'>
          <li>Commercial insights</li>
          <li>Company classifications</li>
          <li>Segmentation outputs</li>
          <li>Account summaries</li>
          <li>Outreach recommendations</li>
        </ul>
        <p>Data availability and completeness may vary between companies and regions.</p>
      </LegalSection>

      <LegalSection heading='User Data and Privacy'>
        <p>
          User searches, selections, generated outputs, and account-related activity remain private to the account
          owner, except where disclosure is required by law or necessary to operate the platform through trusted
          service providers.
        </p>
        <p>InsideFirms does not sell personal user data to advertisers or data brokers.</p>
        <p>
          InsideFirms is designed to support compliance with applicable data protection and privacy regulations,
          including GDPR where applicable.
        </p>
        <p>For additional information, please refer to the Privacy Policy.</p>
      </LegalSection>

      <LegalSection heading='Platform Security'>
        <p>
          We take reasonable technical and organizational measures to help protect platform data and user information.
        </p>
        <p>These measures may include:</p>
        <ul className='ml-5 list-disc space-y-1'>
          <li>Access controls and authentication protections</li>
          <li>Infrastructure and hosting security measures</li>
          <li>Monitoring for abuse and unauthorized activity</li>
          <li>Restricted access to operational systems</li>
          <li>Use of trusted third-party infrastructure providers</li>
        </ul>
        <p>
          While no online platform can guarantee absolute security, we work to maintain platform reliability and
          security.
        </p>
      </LegalSection>

      <LegalSection heading='Payments and Billing'>
        <p>
          Payments and subscription management are handled through trusted third-party payment providers such as
          Stripe.
        </p>
        <p>InsideFirms does not store full payment card details on its own servers.</p>
      </LegalSection>

      <LegalSection heading='Third-Party Services'>
        <p>InsideFirms may use third-party providers to support platform operations, including services related to:</p>
        <ul className='ml-5 list-disc space-y-1'>
          <li>Authentication</li>
          <li>Hosting and infrastructure</li>
          <li>Analytics</li>
          <li>Error monitoring</li>
          <li>Payment processing</li>
          <li>Customer support</li>
        </ul>
        <p>These providers may process limited data as necessary to operate the platform and deliver related services.</p>
      </LegalSection>

      <LegalSection heading='Data Retention'>
        <p>
          We retain account and platform-related information for as long as necessary to provide the service, maintain
          platform security, comply with legal obligations, and resolve operational issues.
        </p>
        <p>Users may request deletion of their account and associated personal data by contacting support.</p>
      </LegalSection>

      <LegalSection heading='Responsible Use'>
        <p>InsideFirms is intended for lawful commercial and business use.</p>
        <p>
          Users remain responsible for evaluating generated outputs and determining how they are used within commercial
          workflows and decision-making processes.
        </p>
      </LegalSection>

      <LegalSection heading='Contact'>
        <p>
          If you have questions about data handling, privacy, or platform security, you can contact us through the Help
          page or via the support contact listed on the platform.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
