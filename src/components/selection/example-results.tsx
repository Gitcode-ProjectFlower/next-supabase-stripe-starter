'use client';

import { Box, ChevronDown, ChevronRight, FileText, User } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/cn';

const DESIGN_WIDTH = 860;

export function ScaledExample({
  variant,
  maxWidth,
  maxHeight,
}: {
  variant: 'sps' | 'segmentation' | 'brief' | 'outreach';
  maxWidth: number;
  maxHeight: number;
}) {
  const [zoom, setZoom] = useState(1);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const naturalH = el.scrollHeight;
    if (!naturalH) return;
    const next = Math.min(1, maxWidth / DESIGN_WIDTH, maxHeight / naturalH);
    setZoom((z) => (Math.abs(next - z) > 0.005 ? next : z));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxWidth, maxHeight]);

  return (
    <div style={{ width: Math.floor(DESIGN_WIDTH * zoom), overflow: 'hidden' }}>
      <div ref={innerRef} style={{ zoom, width: DESIGN_WIDTH }}>
        {variant === 'sps' ? (
          <SpsExampleTable compact />
        ) : variant === 'segmentation' ? (
          <SegmentationExampleTable compact />
        ) : variant === 'brief' ? (
          <BriefExampleDocument compact />
        ) : (
          <OutreachExampleDocument compact />
        )}
      </div>
    </div>
  );
}

function SpsScoreBadge({ value }: { value: number }) {
  const tone =
    value >= 4
      ? 'bg-[#dcfce7] text-[#15803d]'
      : value === 3
      ? 'bg-[#fef9c3] text-[#a16207]'
      : 'bg-[#fee2e2] text-[#dc2626]';
  return <span className={`inline-block rounded-lg px-2.5 py-1 text-[14px] font-bold ${tone}`}>{value}/5</span>;
}

function ExampleExpandIcon({ expanded }: { expanded?: boolean }) {
  return expanded ? (
    <ChevronDown className='h-5 w-5 text-[#0f172a]' />
  ) : (
    <ChevronRight className='h-5 w-5 text-[#0f172a]' />
  );
}

const SPS_EXAMPLE_ROWS = [
  {
    name: 'CHARIS SERVICES',
    city: 'GRAYS',
    score: 2,
    rationale:
      'Charis Services provides community mental health support, counseling, and group therapy. Its stated ...',
  },
  {
    name: 'EDGEBITS',
    city: 'WICKFORD',
    score: 3,
    rationale:
      'EDGEBITS is a healthcare and public-sector IT consultancy with project-based delivery, creating a pl...',
  },
  {
    name: 'STUART WELLS',
    city: 'SHROPHAM',
    score: 4,
    rationale:
      'Stuart Wells is a clearly relevant prospect for asset finance and business loans because its demater...',
  },
  {
    name: 'C. JACKSON AND SONS (DEMOLITION)',
    city: 'BEDFORDSHIRE',
    score: 5,
    rationale:
      'Strong fit: the company’s demolition operations depend materially on owned heavy equipment, haulage ...',
  },
];

export function SpsExampleTable({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <h3 className={cn('font-bold text-[#0f172a]', compact ? 'mb-3 text-lg' : 'mb-4 text-[22px]')}>
        Example Results: Sales Priority Score
      </h3>
      <div className='hidden overflow-hidden rounded-xl border border-[#e2e8f0] bg-white min-[700px]:block'>
        <div className='overflow-x-auto'>
          <table className='w-full border-collapse text-left'>
            <thead>
              <tr className='border-b border-[#e2e8f0]'>
                <th className='w-10 px-4 py-3' />
                <th className={cn('px-4 font-bold text-[#0f172a]', compact ? 'py-2 text-sm' : 'py-3 text-[15px]')}>
                  Name
                </th>
                <th className={cn('px-4 font-bold text-[#0f172a]', compact ? 'py-2 text-sm' : 'py-3 text-[15px]')}>
                  City
                </th>
                <th className={cn('px-4 font-bold text-[#0f172a]', compact ? 'py-2 text-sm' : 'py-3 text-[15px]')}>
                  Score
                </th>
                <th className={cn('px-4 font-bold text-[#0f172a]', compact ? 'py-2 text-sm' : 'py-3 text-[15px]')}>
                  Rationale
                </th>
              </tr>
            </thead>
            <tbody className='text-[14px] text-[#0f172a]'>
              {SPS_EXAMPLE_ROWS.map((row, i) => {
                const expanded = i === SPS_EXAMPLE_ROWS.length - 1;
                return (
                  <Fragment key={row.name}>
                    <tr className='border-t border-[#e2e8f0] first:border-t-0'>
                      <td className={cn('px-4 align-top', compact ? 'py-2.5' : 'py-4')}>
                        <ExampleExpandIcon expanded={expanded} />
                      </td>
                      <td className={cn('px-4 align-top font-bold', compact ? 'py-2.5' : 'py-4')}>{row.name}</td>
                      <td className={cn('px-4 align-top uppercase', compact ? 'py-2.5' : 'py-4')}>{row.city}</td>
                      <td className={cn('px-4 align-top', compact ? 'py-2.5' : 'py-4')}>
                        <SpsScoreBadge value={row.score} />
                      </td>
                      <td className={cn('px-4 align-top text-[#334155]', compact ? 'py-2.5' : 'py-4')}>
                        {row.rationale}
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td />
                        <td colSpan={4} className={cn('px-4 pt-0', compact ? 'pb-4' : 'pb-6')}>
                          <p className='mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]'>
                            Rationale
                          </p>
                          <p
                            className={cn('max-w-[720px] text-[#0f172a]', compact ? 'leading-[1.6]' : 'leading-[1.7]')}
                          >
                            Strong fit: the company’s demolition operations depend materially on owned heavy equipment,
                            haulage assets, and recurring project work, creating substantial structural relevance for
                            asset finance and potentially business loans.
                          </p>
                          <p className={cn('text-[#0f172a]', compact ? 'mt-3 leading-[1.6]' : 'mt-4 leading-[1.7]')}>
                            <span className='font-bold'>Evidence:</span> Owns excavators from 3 to 53 tonnes with
                            specialist attachments <span className='mx-1 text-[#94a3b8]'>•</span> Operates two concrete
                            crushers and a fleet of Roll On/Roll Off skip lorries{' '}
                            <span className='mx-1 text-[#94a3b8]'>•</span> Undertakes demolition, asbestos removal, and
                            reclamation projects
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className='space-y-3 min-[700px]:hidden'>
        {SPS_EXAMPLE_ROWS.map((row) => {
          const expanded = row.name === 'C. JACKSON AND SONS (DEMOLITION)';
          return (
            <div key={row.name} className='rounded-xl border border-[#e2e8f0] bg-white p-4'>
              <div className='flex items-center justify-between gap-3'>
                <p className='text-[15px] font-bold text-[#0f172a]'>{row.name}</p>
                <SpsScoreBadge value={row.score} />
              </div>
              <p className='mt-1 text-xs uppercase tracking-wide text-[#64748b]'>{row.city}</p>
              <p className='mt-2 text-sm leading-[1.6] text-[#334155]'>{row.rationale}</p>
              {expanded && (
                <div className='mt-3 border-t border-[#e2e8f0] pt-3'>
                  <p className='mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]'>Rationale</p>
                  <p className='text-sm leading-[1.6] text-[#0f172a]'>
                    Strong fit: the company’s demolition operations depend materially on owned heavy equipment, haulage
                    assets, and recurring project work, creating substantial structural relevance for asset finance and
                    potentially business loans.
                  </p>
                  <p className='mt-2 text-sm leading-[1.6] text-[#0f172a]'>
                    <span className='font-bold'>Evidence:</span> Owns excavators from 3 to 53 tonnes with specialist
                    attachments • Operates two concrete crushers and a fleet of Roll On/Roll Off skip lorries •
                    Undertakes demolition, asbestos removal, and reclamation projects
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <h3 className={cn('font-bold text-[#0f172a]', compact ? 'mb-3 mt-4 text-lg' : 'mb-4 mt-6 text-[22px]')}>
        Example input
      </h3>
      <div
        className={cn(
          'grid grid-cols-1 gap-6 rounded-xl border border-[#e2e8f0] bg-white md:grid-cols-2',
          compact ? 'p-4' : 'p-6'
        )}
      >
        <div className='flex gap-4'>
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full bg-[#eef2ff]',
              compact ? 'h-10 w-10' : 'h-14 w-14'
            )}
          >
            <Box className={cn('text-[#0f172a]', compact ? 'h-5 w-5' : 'h-7 w-7')} />
          </span>
          <div>
            <p className='font-bold text-[#0f172a]'>Product / Service Description</p>
            <p className='mt-1 leading-[1.6] text-[#0f172a]'>
              We provide asset finance, asset refinancing and business loans to help companies fund business assets and
              investment.
            </p>
          </div>
        </div>
        <div className='flex gap-4 md:border-l md:border-dashed md:border-[#e2e8f0] md:pl-6'>
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full bg-[#eef2ff]',
              compact ? 'h-10 w-10' : 'h-14 w-14'
            )}
          >
            <User className={cn('text-[#0f172a]', compact ? 'h-5 w-5' : 'h-7 w-7')} />
          </span>
          <div>
            <p className='font-bold text-[#0f172a]'>Ideal Customer Profile (ICP)</p>
            <p className='mt-1 leading-[1.6] text-[#0f172a]'>companies with asset intensity, or project-based work.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const SEGMENTATION_EXAMPLE_ROWS = [
  {
    name: 'ABBA CARS',
    scope: 'Local',
    positioning: 'Trust & Reliability',
    customerType: 'Mixed',
    segment: 'Mixed',
  },
  {
    name: 'BALECOM',
    scope: 'International',
    positioning: 'Cost Efficiency',
    customerType: 'Business',
    segment: 'Mixed',
  },
  {
    name: 'ECO FIT SERVICES',
    scope: 'National',
    positioning: 'Hybrid',
    customerType: 'Consumer',
    segment: 'Consumer',
  },
  {
    name: 'G H SMITH',
    scope: 'National',
    positioning: 'Quality & Expertise',
    customerType: 'Business',
    segment: 'Small Businesses',
  },
];

const BRIEF_MIDDLE_FIELDS: { label: string; items: string[] }[] = [
  {
    label: 'Target Customers & Markets',
    items: [
      'Mid-sized logistics and transportation companies',
      'Primarily serving customers in Europe and North America',
    ],
  },
  {
    label: 'Organizational Buying Context',
    items: [
      'Operational leadership owns routing and fleet performance',
      'Technology teams evaluate integrations and data visibility',
    ],
  },
  {
    label: 'Strategic Focus Indicators',
    items: ['Operational efficiency and cost optimization', 'Reliability and real-time visibility'],
  },
  {
    label: 'Positioning & Differentiation Signals',
    items: [
      'End-to-end logistics platform combining planning, execution, and monitoring',
      'Strong emphasis on real-time data and automation',
    ],
  },
  {
    label: 'Commercial Entry Points',
    items: [
      'The website highlights multi-system integrations and data visibility across operations',
      'Frequent emphasis on performance monitoring and operational analytics',
    ],
  },
  {
    label: 'Key Website Evidence',
    items: [
      '“Real-time shipment tracking across the entire supply chain”',
      '“Integrated platform connecting planning and execution”',
      '“Designed for mid-sized logistics providers”',
    ],
  },
];

export function BriefExampleDocument({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <h3 className={cn('font-bold text-[#0f172a]', compact ? 'mb-3 text-lg' : 'mb-4 text-[22px]')}>
        Example Results: Account Intelligence Brief
      </h3>
      <div className='overflow-hidden rounded-xl border border-[#e2e8f0] bg-white'>
        <div className={cn('px-4', compact ? 'py-3' : 'px-6 py-4')}>
          <p className='mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]'>Company Snapshot</p>
          <p className='text-[14px] leading-[1.6] text-[#0f172a]'>
            The company provides cloud-based logistics software for mid-sized transportation and distribution
            businesses. Its platform focuses on route optimization, shipment visibility, and operational efficiency
            across supply chain operations.
          </p>
        </div>
        <div className='grid grid-cols-1 gap-px border-t border-[#e2e8f0] bg-[#e2e8f0] md:grid-cols-2'>
          {BRIEF_MIDDLE_FIELDS.map((field) => (
            <div key={field.label} className={cn('bg-white px-4', compact ? 'py-3' : 'px-6 py-4')}>
              <p className='mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]'>{field.label}</p>
              <ul className='ml-4 list-disc space-y-1 text-[14px] leading-[1.6] text-[#0f172a]'>
                {field.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={cn('border-t border-[#e2e8f0] bg-[#eff6ff] px-4', compact ? 'py-3' : 'px-6 py-4')}>
          <p className='mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#2563eb]'>
            Suggested Conversation Angle
          </p>
          <p className='text-[14px] leading-[1.6] text-[#1e3a8a]'>
            “Based on your website, you place strong emphasis on real-time visibility and operational efficiency across
            logistics operations. I&apos;d be interested in learning how you currently approach performance monitoring
            and system integration in that context.”
          </p>
        </div>
      </div>
      <h3 className={cn('font-bold text-[#0f172a]', compact ? 'mb-3 mt-4 text-lg' : 'mb-4 mt-6 text-[22px]')}>
        Example input
      </h3>
      <div className={cn('rounded-xl border border-[#e2e8f0] bg-white', compact ? 'p-4' : 'p-6')}>
        <div className='flex gap-4'>
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full bg-[#eef2ff]',
              compact ? 'h-10 w-10' : 'h-14 w-14'
            )}
          >
            <FileText className={cn('text-[#0f172a]', compact ? 'h-5 w-5' : 'h-7 w-7')} />
          </span>
          <div>
            <p className='font-bold text-[#0f172a]'>Product / Service Context</p>
            <p className='mt-1 leading-[1.6] text-[#0f172a]'>
              We provide IoT fleet sensors and performance analytics that help logistics companies monitor operations
              and integrate telematics data across their systems.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
const OUTREACH_EXAMPLE_INPUTS: { label: string; value: string }[] = [
  { label: 'What you sell', value: 'IoT fleet sensors and performance analytics for logistics operations.' },
  { label: 'Who it is for', value: 'Operations leaders at mid-sized transportation companies.' },
  {
    label: 'Core Outcome',
    value: 'Increases fleet visibility for dispatchers drowning in disconnected telematics data.',
  },
  { label: 'Differentiators', value: 'Live telematics in one view, no hardware rip-and-replace, onboarding in days.' },
  { label: 'Channel & Length', value: 'Email · Short (3–5 sentences)' },
];

export function OutreachExampleDocument({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <h3 className={cn('font-bold text-[#0f172a]', compact ? 'mb-3 text-lg' : 'mb-4 text-[22px]')}>
        Example Results: Personalized Outreach Message
      </h3>
      <div className='overflow-hidden rounded-xl border border-[#e2e8f0] bg-white'>
        <div className={cn('border-b border-[#e2e8f0] bg-[#f8fafc] px-4', compact ? 'py-2.5' : 'px-6 py-3')}>
          <p className='text-[14px] text-[#0f172a]'>
            <span className='font-bold'>Subject:</span> Quick idea for NordTrans&apos;s fleet visibility
          </p>
        </div>
        <div className={cn('space-y-3 px-4 text-[14px] leading-[1.6] text-[#0f172a]', compact ? 'py-3' : 'px-6 py-4')}>
          <p>Hi Anna,</p>
          <p>
            I saw NordTrans&apos;s focus on route optimization and real-time visibility across your European operations.
          </p>
          <p>
            Most mid-sized fleets we work with struggle to connect telematics data across systems — our IoT sensors and
            performance analytics give dispatchers one live view and cut manual reporting.
          </p>
          <p>Would you be open to a 15-minute call next Thursday to explore the fit?</p>
          <p>
            Best regards,
            <br />
            Alex
          </p>
        </div>
      </div>
      <h3 className={cn('font-bold text-[#0f172a]', compact ? 'mb-3 mt-4 text-lg' : 'mb-4 mt-6 text-[22px]')}>
        Example input
      </h3>
      <div
        className={cn(
          'divide-y divide-[#e2e8f0] rounded-xl border border-[#e2e8f0] bg-white',
          compact ? 'px-4' : 'px-6'
        )}
      >
        {OUTREACH_EXAMPLE_INPUTS.map((row) => (
          <div key={row.label} className={cn('gap-1', compact ? 'py-2' : 'py-2.5')}>
            <p className='text-[13px] font-bold text-[#0f172a]'>{row.label}</p>
            <p className='text-[14px] leading-[1.6] text-[#0f172a]'>{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SegmentationExampleTable({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <h3 className={cn('font-bold text-[#0f172a]', compact ? 'mb-3 text-lg' : 'mb-4 text-[22px]')}>
        Example Results: Market Segmentation
      </h3>
      <div className='hidden overflow-hidden rounded-xl border border-[#e2e8f0] bg-white min-[700px]:block'>
        <div className='overflow-x-auto'>
          <table className='w-full border-collapse text-left'>
            <thead>
              <tr className='border-b border-[#e2e8f0]'>
                <th className='w-10 px-4 py-3' />
                <th className={cn('px-4 font-bold text-[#0f172a]', compact ? 'py-2 text-sm' : 'py-3 text-[15px]')}>
                  Name
                </th>
                <th className={cn('px-4 font-bold text-[#0f172a]', compact ? 'py-2 text-sm' : 'py-3 text-[15px]')}>
                  Geographic Scope
                </th>
                <th className={cn('px-4 font-bold text-[#0f172a]', compact ? 'py-2 text-sm' : 'py-3 text-[15px]')}>
                  Market Positioning
                </th>
                <th className={cn('px-4 font-bold text-[#0f172a]', compact ? 'py-2 text-sm' : 'py-3 text-[15px]')}>
                  Primary Customer Type
                </th>
                <th className={cn('px-4 font-bold text-[#0f172a]', compact ? 'py-2 text-sm' : 'py-3 text-[15px]')}>
                  Target Customer Segment
                </th>
              </tr>
            </thead>
            <tbody className='text-[14px] text-[#0f172a]'>
              {SEGMENTATION_EXAMPLE_ROWS.map((row, i) => {
                const expanded = i === SEGMENTATION_EXAMPLE_ROWS.length - 1;
                return (
                  <Fragment key={row.name}>
                    <tr className='border-t border-[#e2e8f0] first:border-t-0'>
                      <td className={cn('px-4 align-top', compact ? 'py-2.5' : 'py-4')}>
                        <ExampleExpandIcon expanded={expanded} />
                      </td>
                      <td className={cn('px-4 align-top font-bold', compact ? 'py-2.5' : 'py-4')}>{row.name}</td>
                      <td className={cn('px-4 align-top', compact ? 'py-2.5' : 'py-4')}>{row.scope}</td>
                      <td className={cn('px-4 align-top', compact ? 'py-2.5' : 'py-4')}>{row.positioning}</td>
                      <td className={cn('px-4 align-top', compact ? 'py-2.5' : 'py-4')}>{row.customerType}</td>
                      <td className={cn('px-4 align-top', compact ? 'py-2.5' : 'py-4')}>{row.segment}</td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td />
                        <td colSpan={5} className={cn('px-4 pt-0', compact ? 'pb-4' : 'pb-6')}>
                          <p className='mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]'>
                            Evidence
                          </p>
                          <ul
                            className={cn(
                              'max-w-[760px] list-disc pl-5 text-[#0f172a]',
                              compact ? 'space-y-1 leading-[1.6]' : 'space-y-1.5 leading-[1.7]'
                            )}
                          >
                            <li>
                              The company describes itself as a commercial printer serving local businesses and
                              organisations, with customers throughout the United Kingdom.
                            </li>
                            <li>
                              It emphasizes over 150 years of printing experience, in-house expertise, quality print,
                              and bespoke services.
                            </li>
                            <li>
                              Its short-run services and focus on local businesses, community groups, restaurants, and
                              other organisations support a small-business target segment.
                            </li>
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className='space-y-3 min-[700px]:hidden'>
        {SEGMENTATION_EXAMPLE_ROWS.map((row) => {
          const expanded = row.name === 'G H SMITH';
          return (
            <div key={row.name} className='rounded-xl border border-[#e2e8f0] bg-white p-4'>
              <p className='text-[15px] font-bold text-[#0f172a]'>{row.name}</p>
              <dl className='mt-2 space-y-1.5 text-sm'>
                <div className='flex justify-between gap-3'>
                  <dt className='text-[#64748b]'>Geographic Scope</dt>
                  <dd className='text-right font-medium text-[#0f172a]'>{row.scope}</dd>
                </div>
                <div className='flex justify-between gap-3'>
                  <dt className='text-[#64748b]'>Market Positioning</dt>
                  <dd className='text-right font-medium text-[#0f172a]'>{row.positioning}</dd>
                </div>
                <div className='flex justify-between gap-3'>
                  <dt className='text-[#64748b]'>Primary Customer Type</dt>
                  <dd className='text-right font-medium text-[#0f172a]'>{row.customerType}</dd>
                </div>
                <div className='flex justify-between gap-3'>
                  <dt className='text-[#64748b]'>Target Customer Segment</dt>
                  <dd className='text-right font-medium text-[#0f172a]'>{row.segment}</dd>
                </div>
              </dl>
              {expanded && (
                <div className='mt-3 border-t border-[#e2e8f0] pt-3'>
                  <p className='mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]'>Evidence</p>
                  <ul className='list-disc space-y-1 pl-5 text-sm leading-[1.6] text-[#0f172a]'>
                    <li>
                      The company describes itself as a commercial printer serving local businesses and organisations,
                      with customers throughout the United Kingdom.
                    </li>
                    <li>
                      It emphasizes over 150 years of printing experience, in-house expertise, quality print, and
                      bespoke services.
                    </li>
                    <li>
                      Its short-run services and focus on local businesses, community groups, restaurants, and other
                      organisations support a small-business target segment.
                    </li>
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
