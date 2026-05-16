'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { getLocalePath } from '@/utils/get-locale-path';

type FooterLink = { label: string; href: string };

const productLinks: FooterLink[] = [
  { label: 'Product', href: '/product' },
  { label: 'Use cases', href: '/use-cases' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Data & Security', href: '/data-security' },
];

const companyLinks: FooterLink[] = [
  { label: 'About', href: '/about' },
  { label: 'Help', href: '/help' },
];

const legalLinks: FooterLink[] = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

export function LargeFooter() {
  const params = useParams();
  const locale = (params?.locale as string) || 'uk';
  const localize = (href: string) => getLocalePath(locale, href);

  return (
    <footer className='border-t border-slate-200 bg-white/90 backdrop-blur-sm'>
      <div className='mx-auto max-w-7xl px-6 lg:px-8'>
        <div className='grid grid-cols-1 gap-y-10 py-12 md:grid-cols-12 md:gap-x-10'>
          <div className='md:col-span-6 md:pr-8'>
            <div className='text-xl font-semibold tracking-tight text-slate-950'>InsideFirms</div>

            <h2 className='mt-6 max-w-xl text-2xl font-semibold leading-tight tracking-tight text-slate-950'>
              Ask one commercial question across hundreds of companies.
            </h2>

            <p className='mt-4 max-w-lg text-[16px] leading-7 text-slate-600'>
              Structured, evidence-based answers for account prioritization, segmentation, and outreach preparation.
            </p>

            <Link
              href={localize('/')}
              className='mt-5 inline-flex items-center text-[15px] font-semibold text-[#6366f1] transition hover:translate-x-0.5 hover:text-[#5558e8]'
            >
              Start exploring companies →
            </Link>

            <p className='mt-5 text-xs leading-6 text-slate-400'>
              Evidence-based output · Scalable company analysis · Built for B2B teams
            </p>
          </div>

          <FooterColumn title='Product' links={productLinks} localize={localize} />
          <FooterColumn title='Company' links={companyLinks} localize={localize} />
          <FooterColumn title='Legal' links={legalLinks} localize={localize} />
        </div>

        <div className='flex flex-col gap-5 border-t border-slate-200 py-5 md:flex-row md:items-center md:justify-between'>
          <p className='text-sm text-slate-500'>© {new Date().getFullYear()} InsideFirms. All rights reserved.</p>
          <p className='text-xs font-medium tracking-wide text-slate-500'>
            Start with the right accounts before finding the right people.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
  localize,
}: {
  title: string;
  links: FooterLink[];
  localize: (href: string) => string;
}) {
  return (
    <div className='md:col-span-2'>
      <h3 className='text-[11px] font-bold uppercase tracking-[0.28em] text-[#6366f1]/80'>{title}</h3>
      <ul className='mt-5 space-y-3'>
        {links.map((item) => (
          <li key={item.label}>
            <Link
              href={localize(item.href)}
              className='text-[15px] font-medium text-slate-700 transition hover:text-slate-950'
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
