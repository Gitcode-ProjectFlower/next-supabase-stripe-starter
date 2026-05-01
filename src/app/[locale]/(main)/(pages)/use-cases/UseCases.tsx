'use client';

import { ArrowRight, Building2, ClipboardList, FileText, Linkedin, MessageSquare, Search, Sparkles, Target } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';

function CaseSectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className='mb-2 flex items-center gap-2'>
      <span className='flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[#6366f1]'>{icon}</span>
      <h4 className='text-[14px] font-semibold text-[#0f172a]'>{children}</h4>
    </div>
  );
}

function CaseBody({ children }: { children: ReactNode }) {
  return <div className='text-[14px] leading-[1.6] text-[#475569]'>{children}</div>;
}

function CaseLabel({ children }: { children: ReactNode }) {
  return (
    <div className='mb-2 text-center text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6366f1]'>
      {children}
    </div>
  );
}

function CaseTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className='mx-auto mb-2 max-w-[760px] text-center text-[28px] font-bold leading-[1.2] text-[#0f172a]'>
      {children}
    </h2>
  );
}

function CaseSubline({ children }: { children: ReactNode }) {
  return (
    <p className='mx-auto mb-10 max-w-[720px] text-center text-[15px] italic leading-[1.5] text-[#475569]'>
      {children}
    </p>
  );
}

function CaseGrid({ children }: { children: ReactNode }) {
  return <div className='grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3'>{children}</div>;
}

function ResultTableContainer({ children }: { children: ReactNode }) {
  return (
    <div className='mt-8 overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#f8fafc]'>
      <div className='overflow-x-auto'>{children}</div>
    </div>
  );
}

function ExampleOutputLabel() {
  return <div className='mb-2 text-center text-[13px] font-medium text-[#64748b]'>Example output</div>;
}

function FitBadge({ tone, children }: { tone: 'high' | 'medium' | 'low'; children: ReactNode }) {
  const styles = {
    high: 'bg-[#dcfce7] text-[#166534]',
    medium: 'bg-[#fef9c3] text-[#854d0e]',
    low: 'bg-[#fee2e2] text-[#991b1b]',
  } as const;
  return (
    <span className={`inline-block rounded-full px-2 py-1 text-[12px] font-medium ${styles[tone]}`}>
      {children}
    </span>
  );
}

function ScoreBox({ value }: { value: number }) {
  return (
    <span className='inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#e2e8f0] text-[13px] font-semibold text-[#0f172a]'>
      {value}
    </span>
  );
}

function PromptBlock({ children }: { children: ReactNode }) {
  return (
    <div className='rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 text-[13px] leading-[1.6] text-[#475569]'>
      {children}
    </div>
  );
}

function CaseSection({
  id,
  tinted = false,
  children,
}: {
  id?: string;
  tinted?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`relative left-1/2 right-1/2 -mx-[50vw] w-screen scroll-mt-24 ${tinted ? 'bg-[#f8fafc]' : 'bg-white'}`}
    >
      <div className='mx-auto w-full max-w-[1000px] px-6 py-20'>{children}</div>
    </section>
  );
}

export function UseCases() {
  return (
    <div className='w-full'>
      {/* Hero */}
      <section className='relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-white'>
        <div className='mx-auto w-full max-w-[1000px] px-6 pb-20 pt-16 text-center'>
          <h1 className='mx-auto mb-5 max-w-[760px] text-[48px] font-bold leading-[1.1] tracking-tight text-[#0f172a]'>
            Ask one question across hundreds of companies
          </h1>
          <p className='mx-auto mb-14 max-w-[640px] text-[18px] leading-[1.55] text-[#475569]'>
            Get structured answers for each company — without manual research.
          </p>

          <h2 className='mb-3 text-[20px] font-semibold text-[#0f172a]'>Works with your existing sales tools</h2>
          <p className='mx-auto mb-12 max-w-[680px] text-[15px] leading-[1.6] text-[#475569]'>
            First decide which companies matter. Then find the right people. InsideFirms helps you prioritize accounts —
            before you start outreach.
          </p>

          {/* Visual */}
          <div className='mx-auto mb-10 flex max-w-[760px] flex-wrap items-stretch justify-center gap-6'>
            <div className='flex flex-1 flex-col items-center gap-3'>
              <div className='flex h-[120px] w-full items-center justify-center rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-8 shadow-sm'>
                <Image
                  src='/insidefirms_logo.png'
                  alt='InsideFirms'
                  width={220}
                  height={56}
                  className='h-12 w-auto'
                  priority
                />
              </div>
              <span className='text-[14px] font-semibold text-[#0f172a]'>Prioritize accounts</span>
              <span className='text-[12px] text-[#64748b]'>Understand &amp; segment companies</span>
            </div>
            <div className='flex shrink-0 items-center'>
              <ArrowRight className='h-7 w-7 text-[#94a3b8]' />
            </div>
            <div className='flex flex-1 flex-col items-center gap-3'>
              <div className='flex h-[120px] w-full items-center justify-center gap-3 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-8 shadow-sm'>
                <Linkedin className='h-12 w-12 fill-[#0a66c2] text-[#0a66c2]' />
                <span className='text-left text-[20px] font-semibold leading-tight text-[#0f172a]'>
                  LinkedIn
                  <br />
                  <span className='text-[13px] font-normal text-[#475569]'>Sales Navigator</span>
                </span>
              </div>
              <span className='text-[14px] font-semibold text-[#0f172a]'>Find the right people</span>
              <span className='text-[12px] text-[#64748b]'>Reach decision-makers in those accounts</span>
            </div>
          </div>

          <p className='mx-auto mt-12 max-w-[680px] text-[14px] text-[#64748b]'>
            Explore how teams use InsideFirms to prioritize accounts, segment markets, and prepare outreach.
          </p>
        </div>
      </section>

      {/* Case 1 — Prioritize accounts (tinted) */}
      <CaseSection id='prioritize' tinted>
        <CaseLabel>Use case 1</CaseLabel>
        <CaseTitle>Prioritize the right accounts first</CaseTitle>
        <CaseSubline>Focus on the companies most likely to convert — based on real signals, not guesswork.</CaseSubline>

        <CaseGrid>
          <div>
            <CaseSectionTitle icon={<Target className='h-[18px] w-[18px]' />}>The challenge</CaseSectionTitle>
            <CaseBody>
              Companies don&apos;t say they need your product. Sales teams end up scanning websites and guessing who to
              target.
            </CaseBody>
          </div>
          <div>
            <CaseSectionTitle icon={<ClipboardList className='h-[18px] w-[18px]' />}>
              Select &ldquo;Sales Priority Score&rdquo;
            </CaseSectionTitle>
            <CaseBody>Define what you&apos;re selling and what you&apos;re looking for.</CaseBody>
          </div>
          <div>
            <CaseSectionTitle icon={<Sparkles className='h-[18px] w-[18px]' />}>Result</CaseSectionTitle>
            <CaseBody>A prioritized list of companies — with a clear score and reasoning for each.</CaseBody>
          </div>
        </CaseGrid>

        <div className='mt-10'>
          <ExampleOutputLabel />
          <ResultTableContainer>
            <table className='w-full border-collapse text-left'>
              <thead>
                <tr className='bg-[#f1f5f9]'>
                  <th className='px-3 py-2.5 text-[13px] font-medium text-[#64748b]'>Company</th>
                  <th className='px-3 py-2.5 text-[13px] font-medium text-[#64748b]'>Score</th>
                  <th className='px-3 py-2.5 text-[13px] font-medium text-[#64748b]'>Summary + evidence</th>
                </tr>
              </thead>
              <tbody className='text-[14px] text-[#0f172a]'>
                <tr className='border-t border-[#e2e8f0]'>
                  <td className='px-3 py-3 align-top'>Company A</td>
                  <td className='px-3 py-3 align-top'>
                    <ScoreBox value={4} />
                  </td>
                  <td className='px-3 py-3 align-top'>
                    Strong fit — multi-site logistics with efficiency focus.
                    <ul className='mt-1 list-disc pl-4 text-[13px] text-[#475569]'>
                      <li>&ldquo;Multiple warehouse locations listed&rdquo;</li>
                      <li>&ldquo;Focus on route optimization&rdquo;</li>
                    </ul>
                  </td>
                </tr>
                <tr className='border-t border-[#e2e8f0]'>
                  <td className='px-3 py-3 align-top'>Company B</td>
                  <td className='px-3 py-3 align-top'>
                    <ScoreBox value={2} />
                  </td>
                  <td className='px-3 py-3 align-top'>
                    Low priority — small, local operator.
                    <ul className='mt-1 list-disc pl-4 text-[13px] text-[#475569]'>
                      <li>&ldquo;Single location listed&rdquo;</li>
                      <li>&ldquo;Local delivery focus&rdquo;</li>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </ResultTableContainer>
        </div>
      </CaseSection>

      {/* Case 2 — Best-fit companies (white) */}
      <CaseSection id='best-fit'>
        <CaseLabel>Use case 2</CaseLabel>
        <CaseTitle>Find your best-fit companies</CaseTitle>
        <CaseSubline>Example: selling logistics optimization software — the same approach works for any product.</CaseSubline>

        <CaseGrid>
          <div>
            <CaseSectionTitle icon={<Target className='h-[18px] w-[18px]' />}>The challenge</CaseSectionTitle>
            <CaseBody>
              <p className='mb-2'>
                Companies don&apos;t say they need your product. You need to identify signals on their website that
                indicate a real need.
              </p>
              <p className='mb-1 font-medium text-[#0f172a]'>Look for signals like</p>
              <ul className='ml-4 list-disc space-y-1.5'>
                <li>Multiple locations or international operations</li>
                <li>Warehousing, fulfilment, or distribution</li>
                <li>Delivery or transport operations</li>
                <li>Ecommerce, wholesale, or manufacturing models</li>
                <li>Large or complex product offerings</li>
              </ul>
            </CaseBody>
          </div>
          <div>
            <CaseSectionTitle icon={<MessageSquare className='h-[18px] w-[18px]' />}>Ask</CaseSectionTitle>
            <CaseBody>
              <p className='mb-2'>Example question — use the entire block as a single prompt.</p>
              <PromptBlock>
                <p className='mb-3'>
                  Does this company operate logistics or fulfilment processes that are likely to be complex or critical
                  to its operations?
                </p>
                <p className='mb-1 font-medium text-[#0f172a]'>Look for signals such as:</p>
                <ul className='mb-3 ml-4 list-disc space-y-1'>
                  <li>Multiple locations or international operations</li>
                  <li>Warehousing, fulfilment, or distribution activities</li>
                  <li>Delivery or transport operations</li>
                  <li>Ecommerce, wholesale, or manufacturing models</li>
                  <li>Large or complex product offerings</li>
                </ul>
                <p className='mb-1 font-medium text-[#0f172a]'>Return:</p>
                <ul className='ml-4 list-disc space-y-1'>
                  <li>Fit: High / Medium / Low</li>
                  <li>Short reasoning (1–2 sentences)</li>
                </ul>
              </PromptBlock>
            </CaseBody>
          </div>
          <div>
            <CaseSectionTitle icon={<Sparkles className='h-[18px] w-[18px]' />}>Result</CaseSectionTitle>
            <CaseBody>
              A fit assessment for each company — with a short reasoning for each.
            </CaseBody>
          </div>
        </CaseGrid>

        <div className='mt-10'>
          <ExampleOutputLabel />
          <ResultTableContainer>
            <table className='w-full border-collapse text-left'>
              <thead>
                <tr className='bg-[#f1f5f9]'>
                  <th className='px-3 py-2.5 text-[13px] font-medium text-[#64748b]'>Company</th>
                  <th className='px-3 py-2.5 text-[13px] font-medium text-[#64748b]'>Fit &amp; reasoning</th>
                </tr>
              </thead>
              <tbody className='text-[14px] text-[#0f172a]'>
                <tr className='border-t border-[#e2e8f0]'>
                  <td className='px-3 py-3 align-top'>Company A</td>
                  <td className='px-3 py-3 align-top'>
                    <FitBadge tone='high'>High fit</FitBadge>{' '}
                    <span className='ml-2'>— Operates across multiple locations with active delivery operations.</span>
                  </td>
                </tr>
                <tr className='border-t border-[#e2e8f0]'>
                  <td className='px-3 py-3 align-top'>Company B</td>
                  <td className='px-3 py-3 align-top'>
                    <FitBadge tone='medium'>Medium fit</FitBadge>{' '}
                    <span className='ml-2'>— Relies on ecommerce fulfilment but shows limited scale.</span>
                  </td>
                </tr>
                <tr className='border-t border-[#e2e8f0]'>
                  <td className='px-3 py-3 align-top'>Company C</td>
                  <td className='px-3 py-3 align-top'>
                    <FitBadge tone='low'>Low fit</FitBadge>{' '}
                    <span className='ml-2'>— No clear signs of logistics complexity.</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </ResultTableContainer>
        </div>
      </CaseSection>

      {/* Case 3 — Segmentation (tinted) */}
      <CaseSection id='segmentation' tinted>
        <CaseLabel>Use case 3</CaseLabel>
        <CaseTitle>Segment your market</CaseTitle>
        <CaseSubline>Group companies based on how they operate — not just industry labels.</CaseSubline>

        <CaseGrid>
          <div>
            <CaseSectionTitle icon={<Target className='h-[18px] w-[18px]' />}>The challenge</CaseSectionTitle>
            <CaseBody>
              Companies in the same sector can be fundamentally different. It&apos;s hard to segment a market in a way
              that reflects real differences in customers, size, and positioning.
            </CaseBody>
          </div>
          <div>
            <CaseSectionTitle icon={<ClipboardList className='h-[18px] w-[18px]' />}>
              Select &ldquo;Market Segmentation&rdquo;
            </CaseSectionTitle>
            <CaseBody>Choose the dimensions that matter to structure your market.</CaseBody>
          </div>
          <div>
            <CaseSectionTitle icon={<Sparkles className='h-[18px] w-[18px]' />}>Result</CaseSectionTitle>
            <CaseBody>
              A structured view of your market — classifying each company across key dimensions.
            </CaseBody>
          </div>
        </CaseGrid>

        <div className='mt-10'>
          <ExampleOutputLabel />
          <ResultTableContainer>
            <table className='w-full border-collapse text-left'>
              <thead>
                <tr className='bg-[#f1f5f9]'>
                  <th className='px-3 py-2.5 text-[13px] font-medium text-[#64748b]'>Company</th>
                  <th className='px-3 py-2.5 text-[13px] font-medium text-[#64748b]'>Customer Type</th>
                  <th className='px-3 py-2.5 text-[13px] font-medium text-[#64748b]'>Customer Segment</th>
                  <th className='px-3 py-2.5 text-[13px] font-medium text-[#64748b]'>Geographic Scope</th>
                  <th className='px-3 py-2.5 text-[13px] font-medium text-[#64748b]'>Market Positioning</th>
                </tr>
              </thead>
              <tbody className='text-[14px] text-[#0f172a]'>
                <tr className='border-t border-[#e2e8f0]'>
                  <td className='px-3 py-3'>Company A</td>
                  <td className='px-3 py-3'>Business</td>
                  <td className='px-3 py-3'>Enterprise</td>
                  <td className='px-3 py-3'>International</td>
                  <td className='px-3 py-3'>Innovation</td>
                </tr>
                <tr className='border-t border-[#e2e8f0]'>
                  <td className='px-3 py-3'>Company B</td>
                  <td className='px-3 py-3'>Business</td>
                  <td className='px-3 py-3'>Small Businesses</td>
                  <td className='px-3 py-3'>National</td>
                  <td className='px-3 py-3'>Cost Efficiency</td>
                </tr>
                <tr className='border-t border-[#e2e8f0]'>
                  <td className='px-3 py-3'>Company C</td>
                  <td className='px-3 py-3'>Consumer</td>
                  <td className='px-3 py-3'>Consumer</td>
                  <td className='px-3 py-3'>Local</td>
                  <td className='px-3 py-3'>Trust &amp; Reliability</td>
                </tr>
              </tbody>
            </table>
          </ResultTableContainer>
        </div>
      </CaseSection>

      {/* Case 4 — Understand each account (white) */}
      <CaseSection id='understand'>
        <CaseLabel>Use case 4</CaseLabel>
        <CaseTitle>Understand each account at a glance</CaseTitle>
        <CaseSubline>Quickly grasp what a company does, who they serve, and how to approach them.</CaseSubline>

        <CaseGrid>
          <div>
            <CaseSectionTitle icon={<Target className='h-[18px] w-[18px]' />}>The challenge</CaseSectionTitle>
            <CaseBody>
              Understanding a company takes time. Teams often need to scan company websites to understand what a company
              does and how it operates.
            </CaseBody>
          </div>
          <div>
            <CaseSectionTitle icon={<FileText className='h-[18px] w-[18px]' />}>
              Select &ldquo;Account Intelligence Brief&rdquo;
            </CaseSectionTitle>
            <CaseBody>Describe what you offer to generate a tailored brief for each company.</CaseBody>
          </div>
          <div>
            <CaseSectionTitle icon={<Sparkles className='h-[18px] w-[18px]' />}>Result</CaseSectionTitle>
            <CaseBody>
              A structured account brief for each company — combining company overview, positioning, key signals, and a
              suggested conversation angle.
            </CaseBody>
          </div>
        </CaseGrid>

        <div className='mt-10'>
          <ExampleOutputLabel />
          <div className='space-y-5 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-6 text-[14px] leading-[1.6] text-[#475569]'>
            <div>
              <p className='mb-1 font-semibold text-[#0f172a]'>Company Snapshot</p>
              <p>Cloud-based logistics software provider focused on route optimization and operational efficiency.</p>
            </div>
            <div>
              <p className='mb-1 font-semibold text-[#0f172a]'>Target Customers &amp; Markets</p>
              <ul className='ml-4 list-disc space-y-1'>
                <li>Mid-sized logistics companies</li>
                <li>Europe and North America</li>
              </ul>
            </div>
            <div>
              <p className='mb-1 font-semibold text-[#0f172a]'>Commercial Entry Points</p>
              <ul className='ml-4 list-disc space-y-1'>
                <li>Multi-system integrations highlighted</li>
                <li>Focus on performance monitoring and operational analytics</li>
              </ul>
            </div>
            <div>
              <p className='mb-1 font-semibold text-[#0f172a]'>Suggested Conversation Angle</p>
              <p className='italic'>
                &ldquo;Based on your focus on real-time visibility and operational efficiency, I&apos;d be interested in
                how you currently approach performance monitoring and system integration.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </CaseSection>

      {/* Case 5 — Find similar (tinted) */}
      <CaseSection id='similar' tinted>
        <CaseLabel>Use case 5</CaseLabel>
        <CaseTitle>Find companies like your best customers</CaseTitle>
        <CaseSubline>Find companies that look alike — and operate alike.</CaseSubline>

        <CaseGrid>
          <div>
            <CaseSectionTitle icon={<Target className='h-[18px] w-[18px]' />}>The challenge</CaseSectionTitle>
            <CaseBody>
              You have a few strong customers. But finding similar companies is harder than it seems. Traditional
              filters — like industry, size, or location — return broad or irrelevant matches. They don&apos;t capture
              how companies actually operate, who they serve, or what they offer.
            </CaseBody>
          </div>
          <div>
            <CaseSectionTitle icon={<Search className='h-[18px] w-[18px]' />}>How it works</CaseSectionTitle>
            <CaseBody>
              <p className='mb-2'>Start with a company.</p>
              <ul className='ml-4 list-disc space-y-1.5'>
                <li>Generate a list of similar companies</li>
                <li>Analyze what they do, who they serve, and how they operate</li>
                <li>Refine results by sector, region, and size</li>
              </ul>
            </CaseBody>
          </div>
          <div>
            <CaseSectionTitle icon={<Sparkles className='h-[18px] w-[18px]' />}>Result</CaseSectionTitle>
            <CaseBody>
              <p className='mb-2'>
                Instead of generic matches, you get companies that actually operate in similar ways — ranked by
                similarity.
              </p>
              <ul className='ml-4 list-disc space-y-1.5'>
                <li>A prioritized list of lookalike companies</li>
                <li>A clear similarity score and reasoning per company</li>
                <li>Better alignment with your offering</li>
                <li>Higher-quality outreach and segmentation</li>
              </ul>
            </CaseBody>
          </div>
        </CaseGrid>
      </CaseSection>

      {/* Case 6 — Outreach (white) */}
      <CaseSection id='outreach'>
        <CaseLabel>Use case 6</CaseLabel>
        <CaseTitle>Find the right outreach angle</CaseTitle>
        <CaseSubline>Identify how to approach each company — based on what matters to them.</CaseSubline>

        <CaseGrid>
          <div>
            <CaseSectionTitle icon={<Target className='h-[18px] w-[18px]' />}>The challenge</CaseSectionTitle>
            <CaseBody>
              Generic outreach gets ignored. It&apos;s hard to tailor your message to each company without spending time
              researching what matters to them.
            </CaseBody>
          </div>
          <div>
            <CaseSectionTitle icon={<MessageSquare className='h-[18px] w-[18px]' />}>
              Select &ldquo;Personalized Outreach Message&rdquo;
            </CaseSectionTitle>
            <CaseBody>
              Define what you offer to generate a tailored message based on each company&apos;s priorities.
            </CaseBody>
          </div>
          <div>
            <CaseSectionTitle icon={<Sparkles className='h-[18px] w-[18px]' />}>Result</CaseSectionTitle>
            <CaseBody>
              A tailored outreach angle for each company — aligned with their priorities and positioning. Use this to
              tailor outreach and messaging per company.
            </CaseBody>
          </div>
        </CaseGrid>

        <div className='mt-10'>
          <ExampleOutputLabel />
          <ResultTableContainer>
            <table className='w-full border-collapse text-left'>
              <thead>
                <tr className='bg-[#f1f5f9]'>
                  <th className='px-3 py-2.5 text-[13px] font-medium text-[#64748b]'>Company</th>
                  <th className='px-3 py-2.5 text-[13px] font-medium text-[#64748b]'>Outreach angle</th>
                </tr>
              </thead>
              <tbody className='text-[14px] text-[#0f172a]'>
                <tr className='border-t border-[#e2e8f0]'>
                  <td className='px-3 py-3 align-top'>Company A</td>
                  <td className='px-3 py-3 align-top'>
                    Focus on improving efficiency across distributed operations and reducing logistics complexity.
                  </td>
                </tr>
                <tr className='border-t border-[#e2e8f0]'>
                  <td className='px-3 py-3 align-top'>Company B</td>
                  <td className='px-3 py-3 align-top'>
                    Emphasize scaling fulfilment and handling growing order volumes.
                  </td>
                </tr>
                <tr className='border-t border-[#e2e8f0]'>
                  <td className='px-3 py-3 align-top'>Company C</td>
                  <td className='px-3 py-3 align-top'>
                    Position simplicity and cost-effectiveness for smaller, local operations.
                  </td>
                </tr>
              </tbody>
            </table>
          </ResultTableContainer>
        </div>
      </CaseSection>

      {/* Case 7 — Start with the right accounts (tinted) */}
      <CaseSection id='accounts-first' tinted>
        <CaseLabel>Use case 7</CaseLabel>
        <CaseTitle>Start with the right accounts — before finding the right people</CaseTitle>
        <CaseSubline>Use InsideFirms alongside LinkedIn Sales Navigator.</CaseSubline>

        <CaseGrid>
          <div>
            <CaseSectionTitle icon={<Target className='h-[18px] w-[18px]' />}>The challenge</CaseSectionTitle>
            <CaseBody>
              <p className='mb-2'>
                Sales teams rely on tools like LinkedIn to find people. But before reaching out, one key question
                remains: which companies are actually worth targeting?
              </p>
              <p className='mb-1 font-medium text-[#0f172a]'>Without that clarity</p>
              <ul className='ml-4 list-disc space-y-1'>
                <li>outreach starts too early</li>
                <li>messaging is generic</li>
                <li>time is wasted on low-value accounts</li>
              </ul>
              <p className='mt-2 italic'>You find the right people — in the wrong companies.</p>
            </CaseBody>
          </div>
          <div>
            <CaseSectionTitle icon={<Building2 className='h-[18px] w-[18px]' />}>How it works</CaseSectionTitle>
            <CaseBody>
              <p className='mb-1 font-medium text-[#0f172a]'>Use InsideFirms before (or alongside) LinkedIn</p>
              <ul className='mb-3 ml-4 list-disc space-y-1'>
                <li>Analyze companies based on their data and online presence</li>
                <li>Identify which accounts are worth targeting</li>
                <li>Understand the best angle for each company</li>
              </ul>
              <p className='mb-1 font-medium text-[#0f172a]'>Then use LinkedIn Sales Navigator</p>
              <ul className='ml-4 list-disc space-y-1'>
                <li>Find the right people within those accounts</li>
                <li>Reach out with context and relevance</li>
              </ul>
            </CaseBody>
          </div>
          <div>
            <CaseSectionTitle icon={<Sparkles className='h-[18px] w-[18px]' />}>Result</CaseSectionTitle>
            <CaseBody>
              <p className='mb-2'>Start with the right companies — not just the right people.</p>
              <ul className='ml-4 list-disc space-y-1.5'>
                <li>Focus on high-priority accounts</li>
                <li>Use a clear, relevant angle from the start</li>
                <li>Avoid wasting time on poor-fit companies</li>
              </ul>
              <p className='mt-3 font-medium italic text-[#0f172a]'>Better outreach starts with the right accounts.</p>
            </CaseBody>
          </div>
        </CaseGrid>
      </CaseSection>
    </div>
  );
}
