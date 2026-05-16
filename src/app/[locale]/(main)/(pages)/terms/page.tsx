import { Metadata } from 'next';

import { LegalPageLayout, LegalSection } from '@/components/legal-page-layout';

export const metadata: Metadata = {
  title: 'Terms of Service | InsideFirms',
  description: 'The terms governing access to and use of the InsideFirms platform.',
};

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout title='Terms of Service' lastUpdated='May 2026'>
      <LegalSection heading='Introduction'>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the InsideFirms platform and
          related services (&ldquo;InsideFirms&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;).
        </p>
        <p>By accessing or using the platform, you agree to these Terms.</p>
        <p>If you do not agree to these Terms, you may not use the platform.</p>
      </LegalSection>

      <LegalSection heading='Use of the Platform'>
        <p>
          InsideFirms provides commercial intelligence and company analysis tools based on company data and public
          information.
        </p>
        <p>You may use the platform only for lawful business and commercial purposes.</p>
        <p>You agree not to:</p>
        <ul className='ml-5 list-disc space-y-1'>
          <li>Use the platform in violation of applicable laws or regulations</li>
          <li>Attempt to gain unauthorized access to the platform or related systems</li>
          <li>Interfere with platform security, stability, or availability</li>
          <li>Resell or redistribute substantial portions of platform outputs without authorization</li>
          <li>Use automated methods to abuse or overload the platform</li>
        </ul>
        <p>
          We reserve the right to suspend or restrict access in cases of misuse, abuse, or violations of these Terms.
        </p>
      </LegalSection>

      <LegalSection heading='Accounts'>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for activities
          occurring under your account.
        </p>
        <p>You must provide accurate account information and keep it reasonably up to date.</p>
        <p>
          InsideFirms may suspend or terminate accounts that violate these Terms or create security or operational
          risks.
        </p>
      </LegalSection>

      <LegalSection heading='Subscriptions and Billing'>
        <p>Certain features of the platform require a paid subscription.</p>
        <p>
          Subscriptions may include usage limits, such as limits on searches, analyses, exports, or generated results.
        </p>
        <p>Payments are processed through third-party payment providers such as Stripe.</p>
        <p>Unless otherwise stated, subscriptions renew automatically until cancelled.</p>
        <p>
          Users may manage or cancel subscriptions through the billing portal or account settings. Unless required by
          applicable law, payments already made are non-refundable.
        </p>
      </LegalSection>

      <LegalSection heading='Platform Outputs'>
        <p>
          InsideFirms generates analyses, classifications, summaries, and related commercial insights based on
          available data sources and automated processing.
        </p>
        <p>
          While we aim to provide useful and reliable outputs, InsideFirms does not guarantee the completeness,
          accuracy, or suitability of generated results for specific business decisions.
        </p>
        <p>
          Generated outputs may depend on data availability, public information quality, and automated processing
          methods.
        </p>
        <p>Users remain responsible for evaluating and validating outputs before relying on them commercially.</p>
      </LegalSection>

      <LegalSection heading='Public Information and Data Sources'>
        <p>
          InsideFirms uses company data and public information from various sources, including publicly accessible
          company websites and business-related sources.
        </p>
        <p>Data availability, completeness, and quality may vary between companies and regions.</p>
      </LegalSection>

      <LegalSection heading='Availability and Changes'>
        <p>We may modify, update, suspend, or discontinue parts of the platform at any time.</p>
        <p>We do not guarantee uninterrupted availability of the service.</p>
        <p>Maintenance, technical issues, or third-party provider failures may temporarily affect access.</p>
      </LegalSection>

      <LegalSection heading='Intellectual Property'>
        <p>
          The InsideFirms platform, including its software, branding, interface, and related materials, remains the
          property of InsideFirms or its licensors.
        </p>
        <p>
          Users may not copy, reproduce, reverse engineer, or distribute platform components except as permitted by law
          or explicitly authorized.
        </p>
      </LegalSection>

      <LegalSection heading='Limitation of Liability'>
        <p>
          To the maximum extent permitted by law, InsideFirms shall not be liable for indirect, incidental,
          consequential, or business-related damages arising from the use of the platform.
        </p>
        <p>
          The platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of
          any kind.
        </p>
      </LegalSection>

      <LegalSection heading='Termination'>
        <p>We may suspend or terminate access to the platform if users violate these Terms or misuse the service.</p>
        <p>
          Users may cancel their subscription at any time. Unless required by applicable law, payments already made are
          non-refundable.
        </p>
      </LegalSection>

      <LegalSection heading='Governing Law'>
        <p>
          These Terms shall be governed by and interpreted in accordance with the laws applicable in the jurisdiction
          in which InsideFirms operates, without regard to conflict of law principles.
        </p>
      </LegalSection>

      <LegalSection heading='Changes to These Terms'>
        <p>We may update these Terms from time to time.</p>
        <p>
          Updated versions will be published on this page with a revised &ldquo;Last updated&rdquo; date.
        </p>
        <p>Continued use of the platform after updates constitutes acceptance of the revised Terms.</p>
      </LegalSection>

      <LegalSection heading='Contact'>
        <p>
          If you have questions about these Terms, you can contact us through the Help page or via the support contact
          listed on the platform.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
