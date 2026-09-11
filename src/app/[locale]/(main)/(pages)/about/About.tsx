'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { getLocalePath } from '@/utils/get-locale-path';

const principles = [
  'Commercial relevance should be observable.',
  'Research should scale beyond manual review.',
  'Better prioritization should begin before outreach starts.',
];

function FullBleedSection({ tinted = false, children }: { tinted?: boolean; children: ReactNode }) {
  return (
    <section
      className={`relative left-1/2 right-1/2 -mx-[50vw] w-screen ${
        tinted ? 'border-y border-slate-200 bg-slate-50' : 'bg-white'
      }`}
    >
      {children}
    </section>
  );
}

function ContentSection({ eyebrow, title, children }: { eyebrow?: string; title: string; children: ReactNode }) {
  return (
    <section>
      {eyebrow ? (
        <p className='mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#6366f1] sm:text-sm sm:tracking-[0.35em]'>
          {eyebrow}
        </p>
      ) : null}
      <h2 className='text-2xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl'>{title}</h2>
      <div className='mt-6 space-y-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8'>{children}</div>
    </section>
  );
}

function QuoteCard({ children }: { children: ReactNode }) {
  return (
    <div className='border-l-2 border-[#6366f1] py-1 pl-5'>
      <p className='text-[1.2rem] font-semibold leading-snug text-slate-950'>{children}</p>
    </div>
  );
}

export function About() {
  const params = useParams();
  const locale = (params?.locale as string) || 'uk';
  const helpHref = getLocalePath(locale, '/help');

  return (
    <main className='w-full text-slate-950'>
      <FullBleedSection>
        <section className='mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-16'>
          <div className='max-w-4xl'>
            <p className='mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#6366f1] sm:text-sm sm:tracking-[0.35em]'>
              About InsideFirms
            </p>
            <h1 className='text-3xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-4xl lg:text-5xl'>
              Why InsideFirms exists
            </h1>
            <p className='mt-8 max-w-3xl text-xl font-semibold leading-snug tracking-[-0.035em] text-slate-950 sm:text-2xl lg:text-3xl'>
              Better account decisions start with clearer commercial interpretation.
            </p>
          </div>
        </section>
      </FullBleedSection>

      <FullBleedSection tinted>
        <section className='mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start'>
          <div>
            <p className='mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#6366f1] sm:text-sm sm:tracking-[0.35em]'>
              The problem
            </p>
            <h2 className='text-2xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl'>
              Account research is still too manual
            </h2>
          </div>

          <div className='space-y-5 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8'>
            <p>
              Revenue and commercial teams have access to more company data than ever before, but account research
              remains highly manual.
            </p>
            <p>
              Teams review websites, compare businesses one by one, take notes, and try to determine which companies are
              actually worth prioritizing before outreach even begins.
            </p>
            <p>Over time, one pattern became increasingly clear:</p>

            <QuoteCard>
              Commercial teams were often spending more time researching companies than actually speaking with them.
            </QuoteCard>

            <p>
              Most existing platforms improved access to company data, contacts, and search capabilities. But the
              interpretation work — understanding which companies deserved attention and why — remained largely manual.
            </p>
            <p>InsideFirms was created to address that gap.</p>
            <p>
              The goal was not to build another company database, but to create a structured way to move from business
              information to account decisions.
            </p>
          </div>
        </section>
      </FullBleedSection>

      <section className='mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14'>
        <div className='grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start'>
          <ContentSection eyebrow='Our approach' title='From fragmented research to structured account evaluation'>
            <p>
              InsideFirms is designed to help teams move from fragmented company research to structured account
              evaluation.
            </p>
            <p>
              Instead of manually reviewing companies one at a time, the platform analyzes publicly available business
              information to identify commercially relevant patterns and indicators across large groups of accounts.
            </p>
            <p>
              The focus is not on generating generic assumptions, but on helping teams evaluate commercial relevance in
              a more consistent and scalable way.
            </p>
            <p>
              This allows organizations to prioritize accounts earlier, reduce manual interpretation, and make clearer
              commercial decisions before outreach begins.
            </p>
          </ContentSection>

          <ContentSection eyebrow='Beyond company data' title='A commercial interpretation layer'>
            <p>
              InsideFirms combines structured company data with publicly available business information from multiple
              sources.
            </p>
            <p>
              The platform continuously processes and refreshes information to improve analysis quality and coverage
              over time.
            </p>
            <p>
              Rather than functioning solely as a source of company data, InsideFirms acts as a commercial
              interpretation layer designed to support account qualification and prioritization.
            </p>
            <div className='rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5'>
              <p className='text-base font-normal leading-7 text-slate-600'>
                Most company platforms focus on access to information.
              </p>
              <p className='mt-2 text-base font-semibold leading-7 text-slate-950'>
                InsideFirms focuses on interpreting commercial relevance.
              </p>
            </div>
            <p>Data availability and completeness may vary between companies and regions.</p>
          </ContentSection>
        </div>
      </section>

      <FullBleedSection tinted>
        <section className='mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start'>
          <div>
            <p className='mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#6366f1] sm:text-sm sm:tracking-[0.35em]'>
              Principles
            </p>
            <h2 className='text-2xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl'>
              The principles behind InsideFirms
            </h2>
          </div>

          <div>
            <div className='space-y-7'>
              {principles.map((principle, index) => (
                <div key={principle} className='flex items-baseline gap-4'>
                  <span className='min-w-[1.6rem] text-[1.35rem] font-semibold leading-tight tracking-[-0.04em] text-[#6366f1] sm:text-[1.9rem]'>
                    {index + 1}
                  </span>
                  <p className='max-w-2xl text-[1.35rem] font-semibold leading-tight tracking-[-0.04em] text-slate-950 sm:text-[1.9rem]'>
                    {principle}
                  </p>
                </div>
              ))}
            </div>
            <p className='mt-10 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8'>
              InsideFirms was built on the idea that better account decisions start with clearer commercial
              interpretation.
            </p>
          </div>
        </section>
      </FullBleedSection>

      <section className='mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14'>
        <div className='max-w-3xl'>
          <p className='mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#6366f1] sm:text-sm sm:tracking-[0.35em]'>
            Contact
          </p>
          <h2 className='text-2xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl'>
            Questions about the platform, methodology, or commercial approach?
          </h2>
          <p className='mt-6 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8'>
            Please contact us through the Help page or support channel listed on the platform.
          </p>
          <Link
            href={helpHref}
            className='mt-9 inline-flex rounded-full bg-[#6366f1] px-7 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-[#5558e8]'
          >
            Go to Help
          </Link>
        </div>
      </section>
    </main>
  );
}
