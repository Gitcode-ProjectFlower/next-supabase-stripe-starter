'use client';

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  Globe,
  HelpCircle,
  MessageSquare,
  Scale,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React from 'react';

import { getLocalePath } from '@/utils/get-locale-path';

type Tone = 'green' | 'yellow' | 'red';

const salesPriorityExamples: { company: string; score: string; scoreTone: Tone; fit: string; rationale: string }[] = [
  {
    company: 'HSM Global',
    score: '4/5',
    scoreTone: 'green',
    fit: 'Good fit',
    rationale: 'clear ICP signals, global logistics solutions and operational complexity',
  },
  {
    company: 'C.K. Cargo',
    score: '3/5',
    scoreTone: 'yellow',
    fit: 'Moderate fit',
    rationale: 'some freight-service signals, but limited enterprise evidence',
  },
  {
    company: 'A&M Distributions',
    score: '2/5',
    scoreTone: 'red',
    fit: 'Weak fit',
    rationale: 'limited scale signals and unclear operational complexity',
  },
];

const scoreToneClasses: Record<Tone, string> = {
  green: 'bg-green-50 text-green-700',
  yellow: 'bg-yellow-50 text-yellow-700',
  red: 'bg-red-50 text-red-700',
};

const segmentationExamples = [
  {
    company: 'Assure Housing',
    city: 'Birmingham',
    customerType: 'Business',
    segment: 'Small Businesses',
    scope: 'Local',
    positioning: 'Trust & Reliability',
    evidence: [
      'Company provides property management services for landlords',
      'Specializes in providing high-quality accommodation for people in housing need',
      'Manages a portfolio of properties in the Birmingham area',
    ],
  },
  {
    company: 'Art Cleaning (Midlands)',
    city: 'Birmingham',
    customerType: 'Business',
    segment: 'Enterprise',
    scope: 'Local',
    positioning: 'Quality & Expertise',
    evidence: null,
  },
  {
    company: 'Foreva Young',
    city: 'Birmingham',
    customerType: 'Business',
    segment: 'Small Businesses',
    scope: 'Local',
    positioning: 'Cost Efficiency',
    evidence: null,
  },
];

const outputs = [
  'Sales priority scores',
  'Market segmentation classifications',
  'Account intelligence briefs',
  'Outreach recommendations',
  'Commercial fit assessments',
  'Lookalike company discovery',
  'CRM-ready exports and structured outputs',
];

const workflowRows: { traditional: string; inside: string; leftIcon: typeof Globe; rightIcon: typeof Globe }[] = [
  {
    traditional: 'Review company websites individually',
    inside: 'Ask one question across a company selection',
    leftIcon: Globe,
    rightIcon: HelpCircle,
  },
  {
    traditional: 'Build qualification notes manually',
    inside: 'Receive structured answers and rationale per company',
    leftIcon: FileText,
    rightIcon: ClipboardList,
  },
  {
    traditional: 'Evaluate accounts inconsistently',
    inside: 'Use evidence-based scores and commercial signals',
    leftIcon: Scale,
    rightIcon: BarChart3,
  },
  {
    traditional: 'Prepare outreach workflows manually',
    inside: 'Start with suggested angles and next steps',
    leftIcon: MessageSquare,
    rightIcon: ArrowRight,
  },
];

function FullBleedSection({ tinted = false, children }: { tinted?: boolean; children: React.ReactNode }) {
  return (
    <section
      className={`relative left-1/2 right-1/2 -mx-[50vw] w-screen ${tinted ? 'border-y border-slate-200 bg-slate-50' : 'bg-white'}`}
    >
      {children}
    </section>
  );
}

export function Product() {
  const params = useParams();
  const locale = (params?.locale as string) || 'uk';
  const searchHref = getLocalePath(locale, '/');

  return (
    <main className='w-full text-slate-950'>
      <FullBleedSection>
        <section className='mx-auto grid max-w-7xl grid-cols-1 gap-12 px-8 py-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center'>
          <div>
            <p className='mb-6 text-sm font-semibold uppercase tracking-[0.35em] text-[#6366f1]'>Product</p>
            <h1 className='max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] lg:text-5xl'>
              Ask one commercial question across hundreds of companies
            </h1>
            <p className='mt-8 max-w-2xl text-lg leading-8 text-slate-600'>
              InsideFirms helps sales and marketing teams turn public company information into structured answers,
              scores, evidence and outreach-ready inputs.
            </p>

            <div className='mt-8 grid max-w-2xl gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm lg:grid-cols-2'>
              <div>
                <p className='mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>
                  Traditional tools
                </p>
                <p className='font-medium text-slate-600'>Filters, lists and raw company data</p>
              </div>
              <div>
                <p className='mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#6366f1]'>InsideFirms</p>
                <p className='font-semibold text-slate-950'>Commercial questions and structured answers</p>
              </div>
            </div>

            <p className='mt-6 max-w-2xl text-base leading-8 text-slate-500'>
              Built using structured company data and publicly available business information from multiple sources.
            </p>
            <div className='mt-10 flex flex-wrap gap-4'>
              <Link
                href={searchHref}
                className='rounded-full bg-blue-600 px-7 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700'
              >
                Start exploring
              </Link>
            </div>
          </div>

          <div className='rounded-[2rem] border border-slate-200 bg-slate-50 p-4 shadow-sm'>
            <div className='rounded-[1.5rem] border border-slate-200 bg-white'>
              <div className='flex items-center justify-between border-b border-slate-100 px-6 py-5'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Example question</p>
                  <p className='mt-2 text-lg font-semibold'>Sales Priority Score</p>
                </div>
                <Sparkles className='h-5 w-5 text-blue-600' />
              </div>
              <div className='overflow-hidden'>
                <div className='border-b border-slate-100 bg-blue-50/40 px-6 py-4 text-sm text-slate-700'>
                  <span className='font-semibold'>Evidence-based analysis:</span> signals are extracted from public
                  company information including website content, positioning, operational references and business
                  context.
                </div>
                <div className='overflow-x-auto'>
                  <table className='w-full text-left text-sm'>
                    <thead className='bg-slate-50 text-xs uppercase tracking-wider text-slate-500'>
                      <tr>
                        <th className='px-6 py-4'>Company</th>
                        <th className='px-6 py-4'>Score</th>
                        <th className='px-6 py-4'>Rationale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesPriorityExamples.map((row) => (
                        <tr key={row.company} className='border-t border-slate-100'>
                          <td className='px-6 py-5 font-semibold'>{row.company}</td>
                          <td className='px-6 py-5'>
                            <span
                              className={`rounded-full px-3 py-1 font-semibold ${scoreToneClasses[row.scoreTone]}`}
                            >
                              {row.score}
                            </span>
                          </td>
                          <td className='px-6 py-5 text-slate-600'>
                            {row.fit} — {row.rationale}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FullBleedSection>

      <FullBleedSection tinted>
        <section className='mx-auto grid max-w-7xl grid-cols-1 gap-14 px-8 py-16 lg:grid-cols-[.85fr_1.15fr]'>
          <div>
            <p className='mb-5 text-sm font-semibold uppercase tracking-[0.35em] text-[#6366f1]'>How it works</p>
            <h2 className='text-4xl font-semibold leading-tight tracking-[-0.045em]'>
              A simple workflow from selection to decision
            </h2>
          </div>
          <div className='grid gap-5'>
            {[
              ['1', 'Select companies', 'Use filters such as sector, region, company size or use the advanced look-alike-model.'],
              ['2', 'Ask a commercial question', 'Run a predefined analysis or ask a custom question across the selection.'],
              ['3', 'Receive structured output', 'Get scores, rationale, evidence signals and recommended next steps per company.'],
            ].map(([num, title, text]) => (
              <div key={num} className='flex gap-6 rounded-2xl border border-slate-200 bg-white p-6'>
                <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-300 text-lg font-semibold'>
                  {num}
                </div>
                <div>
                  <h3 className='text-[1.15rem] font-semibold'>{title}</h3>
                  <p className='mt-2 text-lg leading-8 text-slate-600'>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </FullBleedSection>

      <section className='mx-auto max-w-7xl px-8 py-16'>
        <div className='mb-12 max-w-3xl'>
          <p className='mb-5 text-sm font-semibold uppercase tracking-[0.35em] text-[#6366f1]'>
            Structured commercial outputs
          </p>
          <h2 className='text-4xl font-semibold leading-tight tracking-[-0.045em]'>
            See which companies matter, why they matter, and how to approach them
          </h2>
        </div>

        <p className='mb-8 max-w-3xl text-lg leading-8 text-slate-600'>
          Analyze hundreds or thousands of companies simultaneously and turn large company selections into structured,
          comparable outputs.
        </p>

        <div className='grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_.65fr]'>
          <div className='overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm'>
            <div className='flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-600'>
              <span className='rounded-full bg-indigo-50 px-3 py-1 font-semibold text-[#6366f1]'>
                Market segmentation
              </span>
              <span>Structured classifications across selected companies</span>
            </div>

            <div className='overflow-x-auto'>
              <table className='w-full table-fixed text-left text-sm'>
                <thead className='border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500'>
                  <tr>
                    <th className='w-[22%] px-3 py-3'>Company</th>
                    <th className='w-[13%] px-3 py-3'>City</th>
                    <th className='w-[15%] px-3 py-3'>Customer</th>
                    <th className='w-[18%] px-3 py-3'>Segment</th>
                    <th className='w-[12%] px-3 py-3'>Scope</th>
                    <th className='w-[20%] px-3 py-3'>Positioning</th>
                  </tr>
                </thead>
                <tbody>
                  {segmentationExamples.map((row, index) => (
                    <React.Fragment key={row.company}>
                      <tr className='border-b border-slate-100 align-top'>
                        <td className='px-3 py-4 font-semibold text-slate-950'>{row.company}</td>
                        <td className='px-3 py-4 text-slate-600'>{row.city}</td>
                        <td className='px-3 py-4 text-slate-600'>{row.customerType}</td>
                        <td className='px-3 py-4 text-slate-600'>{row.segment}</td>
                        <td className='px-3 py-4 text-slate-600'>{row.scope}</td>
                        <td className='px-3 py-4 text-slate-600'>{row.positioning}</td>
                      </tr>

                      {index === 0 && row.evidence && (
                        <tr className='border-b border-slate-100 bg-slate-50/50'>
                          <td colSpan={6} className='px-3 py-4'>
                            <p className='mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500'>
                              Evidence
                            </p>
                            <ul className='space-y-1 text-sm leading-6 text-slate-700'>
                              {row.evidence.map((item) => (
                                <li key={item} className='flex gap-3'>
                                  <span className='mt-[9px] h-1.5 w-1.5 rounded-full bg-slate-400'></span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className='grid gap-3'>
            {outputs.map((item) => (
              <div
                key={item}
                className='flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3'
              >
                <CheckCircle2 className='h-4 w-4 shrink-0 text-[#6366f1]' />
                <span className='text-sm font-semibold leading-5'>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FullBleedSection tinted>
        <section className='mx-auto max-w-7xl px-8 py-14'>
          <div className='mb-14 text-center'>
            <p className='mb-5 text-sm font-semibold uppercase tracking-[0.35em] text-[#6366f1]'>Before vs after</p>
            <h2 className='mx-auto max-w-5xl text-4xl font-semibold leading-tight tracking-[-0.045em] lg:text-[3.2rem]'>
              Move from manual company research to structured commercial decisions
            </h2>
            <p className='mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600'>
              Replace fragmented research workflows with repeatable, evidence-based commercial analysis across large
              company selections.
            </p>
          </div>
          <div className='overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.07)]'>
            <div className='grid grid-cols-2 border-b border-slate-200 bg-slate-50/70'>
              <div className='flex items-center gap-4 border-r border-slate-200 px-8 py-5'>
                <Search className='text-slate-500' size={22} strokeWidth={2} />
                <p className='text-xs font-bold uppercase tracking-[0.34em] text-slate-500'>Traditional workflow</p>
              </div>

              <div className='flex items-center gap-4 px-8 py-5'>
                <Sparkles className='text-[#6366f1]' size={22} strokeWidth={2.2} />
                <p className='text-xs font-bold uppercase tracking-[0.34em] text-[#6366f1]'>With InsideFirms</p>
              </div>
            </div>

            <div className='grid grid-cols-2'>
              <div className='border-r border-slate-200 px-8 py-8'>
                <div className='space-y-7'>
                  {workflowRows.map((row) => {
                    const LeftIcon = row.leftIcon;
                    return (
                      <div key={row.traditional} className='flex min-h-[48px] items-start gap-4'>
                        <div className='mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500'>
                          <LeftIcon size={18} strokeWidth={2} />
                        </div>
                        <p className='pt-0.5 text-[1.2rem] font-normal leading-snug text-slate-700'>
                          {row.traditional}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className='bg-gradient-to-r from-white to-indigo-50/40 px-8 py-8'>
                <div className='space-y-7'>
                  {workflowRows.map((row) => {
                    const RightIcon = row.rightIcon;
                    return (
                      <div key={row.inside} className='flex min-h-[48px] items-start gap-4'>
                        <div className='mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#6366f1]'>
                          <RightIcon size={18} strokeWidth={2.2} />
                        </div>
                        <p className='pt-0.5 text-[1.2rem] font-semibold leading-snug text-slate-950'>{row.inside}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </FullBleedSection>

      <section className='mx-auto max-w-7xl px-8 py-16'>
        <div className='text-center'>
          <p className='mb-5 text-sm font-semibold uppercase tracking-[0.35em] text-[#6366f1]'>
            Works alongside existing sales tools
          </p>
          <h2 className='mx-auto max-w-4xl text-4xl font-semibold leading-tight tracking-[-0.045em]'>
            Use InsideFirms before contact discovery and outreach
          </h2>
          <p className='mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600'>
            First decide which companies deserve attention. Then use LinkedIn, your CRM or outbound tools to find
            contacts and start outreach.
          </p>
        </div>

        <div className='mt-14 grid grid-cols-1 items-center gap-5 lg:grid-cols-[0.92fr_auto_0.92fr_auto_0.92fr]'>
          <ToolCard icon={<Database />} title='InsideFirms' text='Decide which companies deserve attention' />
          <div className='hidden h-full items-center lg:flex'>
            <ArrowRight className='h-7 w-7 text-slate-400' />
          </div>
          <ToolCard icon={<Users />} title='LinkedIn / CRM' text='Identify the right contacts' />
          <div className='hidden h-full items-center lg:flex'>
            <ArrowRight className='h-7 w-7 text-slate-400' />
          </div>
          <ToolCard icon={<FileText />} title='Outbound workflow' text='Start with a relevant angle' />
        </div>

        <div className='mt-8 text-center'>
          <p className='text-xl font-semibold text-slate-800'>
            Start with the right accounts before finding the right people.
          </p>

          <div className='mt-8'>
            <Link
              href={searchHref}
              className='inline-flex rounded-full bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700'
            >
              Start exploring
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function ToolCard({ icon, title, text }: { icon: React.ReactElement; title: string; text: string }) {
  return (
    <div className='flex h-full min-h-[165px] flex-col justify-center rounded-[1.5rem] border border-slate-200 bg-white px-7 py-6 text-center shadow-sm'>
      <div className='mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-[#6366f1]'>
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-6 w-6' })}
      </div>
      <h3 className='text-xl font-semibold'>{title}</h3>
      <p className='mt-2 text-base leading-6 text-slate-600'>{text}</p>
    </div>
  );
}
