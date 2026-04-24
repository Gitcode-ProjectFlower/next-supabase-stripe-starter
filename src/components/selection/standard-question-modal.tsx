'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { LimitReachedAlert } from '@/components/limit-reached-alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { STANDARD_QUESTIONS } from './standard-question-tile';

type SQId = '1' | '2' | '3' | '4';

interface StandardQuestionModalProps {
  sqId: SQId | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (sqId: SQId, formInput: Record<string, unknown>) => void;
  isProcessing?: boolean;
  error?: string | null;
}

const ICP_SIGNALS = [
  'B2B-focused',
  'Multi-site / multiple offices',
  'International operations',
  'Enterprise customers',
  '24/7 operations / high uptime needs',
  'Regulated / compliance-heavy sector',
  'Tech / cloud dependent',
];

const COMMERCIAL_SIGNALS = [
  'Multiple locations / sites',
  'International presence',
  'Enterprise or large customers',
  '24/7 service / uptime commitments',
  'Strong growth signals (news, expansion, hiring)',
  'High professionalism (certifications, strong partners, case studies)',
  'Digital dependence (platform, portal, cloud, real-time)',
];

// ---- SQ1 Form ----------------------------------------------------------------
function SQ1Form({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const update = (key: string, val: unknown) => onChange({ ...value, [key]: val });

  const toggleArrayItem = (key: string, item: string) => {
    const arr = (value[key] as string[]) || [];
    const next = arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];
    update(key, next);
  };

  return (
    <div className='space-y-4'>
      <div>
        <Label>Product / Service Name <span className='text-red-500'>*</span></Label>
        <Input
          className='mt-1'
          placeholder='e.g. CRM Pro'
          value={(value.productName as string) || ''}
          onChange={(e) => update('productName', e.target.value)}
        />
      </div>
      <div>
        <Label>Product / Service Description</Label>
        <Textarea
          className='mt-1 min-h-[80px]'
          placeholder='What it is, who it&#39;s for, why it matters (recommended max ~300 chars)'
          value={(value.productDescription as string) || ''}
          onChange={(e) => update('productDescription', e.target.value)}
        />
      </div>
      <div>
        <Label>Ideal Customer Profile Characteristics <span className='text-red-500'>*</span></Label>
        <Textarea
          className='mt-1 min-h-[70px] text-gray-900'
          placeholder='e.g. multi-site, B2B, regulated sector, 24/7 operations, cloud-dependent…'
          value={(value.icpCharacteristics as string) || ''}
          onChange={(e) => update('icpCharacteristics', e.target.value)}
        />
      </div>
      <div>
        <Label className='mb-2 block'>ICP Signals <span className='font-normal text-gray-400'>(optional)</span></Label>
        <div className='flex flex-wrap gap-2'>
          {ICP_SIGNALS.map((signal) => {
            const selected = ((value.icpSignals as string[]) || []).includes(signal);
            return (
              <button
                key={signal}
                type='button'
                onClick={() => toggleArrayItem('icpSignals', signal)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selected
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {signal}
              </button>
            );
          })}
        </div>
        <Input
          className='mt-2'
          placeholder='Other ICP signal…'
          value={(value.icpSignalsOther as string) || ''}
          onChange={(e) => update('icpSignalsOther', e.target.value)}
        />
      </div>
      <div>
        <Label className='mb-2 block'>Commercial Attractiveness Signals <span className='font-normal text-gray-400'>(optional)</span></Label>
        <div className='flex flex-wrap gap-2'>
          {COMMERCIAL_SIGNALS.map((signal) => {
            const selected = ((value.commercialSignals as string[]) || []).includes(signal);
            return (
              <button
                key={signal}
                type='button'
                onClick={() => toggleArrayItem('commercialSignals', signal)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selected
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {signal}
              </button>
            );
          })}
        </div>
        <Input
          className='mt-2'
          placeholder='Other commercial signal…'
          value={(value.commercialSignalsOther as string) || ''}
          onChange={(e) => update('commercialSignalsOther', e.target.value)}
        />
      </div>
      <div>
        <Label>Exclusions / Red Flags <span className='font-normal text-gray-400'>(optional)</span></Label>
        <Input
          className='mt-1'
          placeholder='e.g. very small local firms, pure B2C retail, single-person businesses…'
          value={(value.exclusions as string) || ''}
          onChange={(e) => update('exclusions', e.target.value)}
        />
      </div>
      <div>
        <Label className='mb-2 block'>Scoring Focus</Label>
        <div className='space-y-1.5'>
          {[
            { value: 'Fit Mode', label: 'Fit Mode – prioritize Customer Profile alignment' },
            { value: 'Revenue Mode', label: 'Revenue Mode – prioritize scale and professionalism' },
          ].map((opt) => (
            <label key={opt.value} className='flex cursor-pointer items-center gap-2 text-sm text-gray-700'>
              <input
                type='radio'
                name='scoringFocus'
                value={opt.value}
                checked={(value.scoringFocus as string) === opt.value || (!value.scoringFocus && opt.value === 'Fit Mode')}
                onChange={() => update('scoringFocus', opt.value)}
                className='h-3.5 w-3.5 accent-blue-600'
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

const SQ2_DIMENSIONS = [
  {
    name: 'Primary Customer Type',
    description: 'Classifies whether the company primarily serves businesses or consumers.',
    values: ['Business', 'Consumer', 'Public Sector', 'Mixed', 'Unknown'],
  },
  {
    name: 'Target Customer Segment',
    description: 'Indicates the apparent customer size focus of the company.',
    values: ['Consumer', 'Small Businesses', 'Mid-Market', 'Enterprise', 'Mixed', 'Unknown'],
  },
  {
    name: 'Geographic Scope',
    description: 'Indicates the geographic reach of operations.',
    values: ['Local', 'National', 'International', 'Global', 'Unknown'],
  },
  {
    name: 'Market Positioning',
    description: 'Indicates how the company positions itself in the market.',
    values: ['Cost Efficiency', 'Quality & Expertise', 'Innovation', 'Trust & Reliability', 'Hybrid', 'Unknown'],
  },
];

// ---- SQ2 Form ----------------------------------------------------------------
function SQ2Form({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const update = (key: string, val: unknown) => onChange({ ...value, [key]: val });

  const toggleDimension = (dimName: string) => {
    const arr = (value.dimensions as string[]) ?? SQ2_DIMENSIONS.map((d) => d.name);
    const next = arr.includes(dimName) ? arr.filter((v) => v !== dimName) : [...arr, dimName];
    update('dimensions', next);
  };

  const selectedDimensions = (value.dimensions as string[]) ?? SQ2_DIMENSIONS.map((d) => d.name);

  // Custom dimension values as array of 6 slots
  const customValues = (value.customDimensionValues as string[]) ?? ['', '', '', '', '', ''];

  return (
    <div className='space-y-3'>
      <div>
        <Label className='mb-2 block'>Dimensions to extract</Label>
        <div className='space-y-2'>
          {SQ2_DIMENSIONS.map((dim) => {
            const selected = selectedDimensions.includes(dim.name);
            return (
              <div
                key={dim.name}
                onClick={() => toggleDimension(dim.name)}
                className={`cursor-pointer rounded-lg border px-3 py-2.5 transition-colors ${
                  selected
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-gray-200 bg-white opacity-50'
                }`}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div>
                    <p className={`text-xs font-semibold ${selected ? 'text-purple-800' : 'text-gray-500'}`}>{dim.name}</p>
                    <p className='mt-0.5 text-xs text-gray-500'>{dim.description}</p>
                    <p className='mt-1 text-xs text-gray-500'>{dim.values.join(' · ')}</p>
                  </div>
                  <div className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 ${selected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'}`}>
                    {selected && (
                      <svg viewBox='0 0 12 12' fill='none' className='h-full w-full p-0.5'>
                        <path d='M2 6l3 3 5-5' stroke='white' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <Label>Custom Dimension <span className='font-normal text-gray-400'>(optional)</span></Label>
        <Input
          className='mt-1'
          placeholder='e.g. Digital Maturity Level'
          value={(value.customDimensionName as string) || ''}
          onChange={(e) => update('customDimensionName', e.target.value)}
        />
      </div>
      {!!value.customDimensionName && (
        <div>
          <Label className='mb-1 block'>Classification Values <span className='font-normal text-gray-400'>(2–6 required)</span></Label>
          {Array.from({ length: 6 }).map((_, i) => (
            <Input
              key={i}
              className='mt-1'
              placeholder={`Value ${i + 1}`}
              value={customValues[i] || ''}
              onChange={(e) => {
                const next = [...customValues];
                while (next.length < 6) next.push('');
                next[i] = e.target.value;
                update('customDimensionValues', next);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const SQ3_CONVERSATION_PERSPECTIVES = [
  'Executive leadership',
  'Technology leadership',
  'Operational leadership',
  'Commercial leadership',
  'Procurement / vendor management',
  'Unknown',
];

const SQ3_SALES_OBJECTIVES = [
  'First exploratory conversation',
  'Qualification discussion',
  'Strategic account development',
  'Partnership exploration',
  'Competitive replacement',
  'Re-engagement',
  'Other',
];

const SQ3_FOCUS_PREFERENCES = [
  'Strategic themes',
  'Organizational structure',
  'Market positioning',
  'Commercial entry points',
  'Balanced overview',
];

const SQ3_TONE_PREFERENCES = [
  'Direct & concise',
  'Strategic & consultative',
  'Analytical & structured',
  'Relationship-oriented',
  'Neutral',
];

// ---- SQ3 Form ----------------------------------------------------------------
function SQ3Form({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const advancedRef = useRef<HTMLDivElement>(null);
  const update = (key: string, val: unknown) => onChange({ ...value, [key]: val });

  return (
    <div className='space-y-4'>
      {/* What you'll get */}
      <div className='rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800'>
        <p className='mb-1.5 font-semibold'>What you&apos;ll get</p>
        <ul className='space-y-0.5 list-disc pl-4'>
          <li>A clear summary of what the company does and the markets it serves</li>
          <li>The company&apos;s key themes and priorities</li>
          <li>How the company positions and differentiates itself</li>
          <li>Evidence-based areas where your offering naturally aligns with the company</li>
          <li>An effective, evidence-based opening suggestion for your first sales conversation</li>
        </ul>
        <div className='mt-2 text-right'>
          <button
            type='button'
            className='text-xs text-emerald-600 underline hover:text-emerald-800'
            onClick={() => setShowExample((v) => !v)}
          >
            {showExample ? 'Hide example output' : 'View example output'}
          </button>
        </div>
        {showExample && (
          <div className='mt-3 space-y-3 rounded-md border border-emerald-200 bg-white p-3 text-xs text-gray-700'>
            <div>
              <p className='font-semibold text-gray-900'>Company Snapshot</p>
              <p className='mt-0.5 text-gray-600'>The company provides cloud-based logistics software for mid-sized transportation and distribution businesses. Its platform focuses on route optimization, shipment visibility, and operational efficiency across supply chain operations.</p>
            </div>
            <div>
              <p className='font-semibold text-gray-900'>Target Customers &amp; Markets</p>
              <ul className='mt-0.5 space-y-0.5 list-disc pl-4 text-gray-600'>
                <li>Mid-sized logistics and transportation companies</li>
                <li>Primarily serving customers in Europe and North America</li>
              </ul>
            </div>
            <div>
              <p className='font-semibold text-gray-900'>Strategic Focus Indicators</p>
              <ul className='mt-0.5 space-y-0.5 list-disc pl-4 text-gray-600'>
                <li>Operational efficiency and cost optimization</li>
                <li>Reliability and real-time visibility</li>
              </ul>
            </div>
            <div>
              <p className='font-semibold text-gray-900'>Positioning &amp; Differentiation Signals</p>
              <ul className='mt-0.5 space-y-0.5 list-disc pl-4 text-gray-600'>
                <li>End-to-end logistics platform combining planning, execution, and monitoring</li>
                <li>Strong emphasis on real-time data and automation</li>
              </ul>
            </div>
            <div>
              <p className='font-semibold text-gray-900'>Commercial Entry Points</p>
              <ul className='mt-0.5 space-y-0.5 list-disc pl-4 text-gray-600'>
                <li>The website highlights multi-system integrations and data visibility across operations</li>
                <li>Frequent emphasis on performance monitoring and operational analytics</li>
              </ul>
            </div>
            <div>
              <p className='font-semibold text-gray-900'>Suggested Conversation Angle</p>
              <p className='mt-0.5 text-gray-600 italic'>&ldquo;Based on your website, you place strong emphasis on real-time visibility and operational efficiency across logistics operations. I&apos;d be interested in learning how you currently approach performance monitoring and system integration in that context.&rdquo;</p>
            </div>
            <div>
              <p className='font-semibold text-gray-900'>Key Website Evidence</p>
              <ul className='mt-0.5 space-y-0.5 list-disc pl-4 text-gray-600'>
                <li>&ldquo;Real-time shipment tracking across the entire supply chain&rdquo;</li>
                <li>&ldquo;Integrated platform connecting planning and execution&rdquo;</li>
                <li>&ldquo;Designed for mid-sized logistics providers&rdquo;</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div>
        <Label>Product / Service Context <span className='text-red-500'>*</span></Label>
        <Textarea
          className='mt-1 min-h-[80px]'
          placeholder='Briefly describe what you are offering to this company (recommended max ~300 characters)'
          value={(value.productContext as string) || ''}
          onChange={(e) => update('productContext', e.target.value)}
        />
      </div>

      <div>
        <Label className='mb-2 block'>Intended Conversation Perspective <span className='font-normal text-gray-400'>(optional)</span></Label>
        <div className='space-y-1.5'>
          {SQ3_CONVERSATION_PERSPECTIVES.map((opt) => (
            <label key={opt} className='flex cursor-pointer items-center gap-2 text-sm text-gray-700'>
              <input
                type='radio'
                name='conversationPerspective'
                value={opt}
                checked={(value.conversationPerspective as string) === opt}
                onChange={() => update('conversationPerspective', opt)}
                className='h-3.5 w-3.5 accent-emerald-600'
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className='mb-2 block'>Sales Objective <span className='font-normal text-gray-400'>(optional)</span></Label>
        <div className='space-y-1.5'>
          {SQ3_SALES_OBJECTIVES.map((opt) => (
            <label key={opt} className='flex cursor-pointer items-center gap-2 text-sm text-gray-700'>
              <input
                type='radio'
                name='salesObjective'
                value={opt}
                checked={(value.salesObjective as string) === opt}
                onChange={() => update('salesObjective', opt)}
                className='h-3.5 w-3.5 accent-emerald-600'
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      {/* Advanced collapsible */}
      <div ref={advancedRef}>
        <button
          type='button'
          className='flex w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-800'
          onClick={() => {
            setShowAdvanced((v) => {
              if (!v) setTimeout(() => advancedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
              return !v;
            });
          }}
        >
          <span>Advanced options</span>
          <svg viewBox='0 0 20 20' fill='currentColor' className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
            <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clipRule='evenodd' />
          </svg>
        </button>

        {showAdvanced && (
          <div className='mt-3 space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-3'>
            <div>
              <Label className='mb-2 block'>Primary Focus Preference <span className='font-normal text-gray-400'>(optional)</span></Label>
              <div className='space-y-1.5'>
                {SQ3_FOCUS_PREFERENCES.map((opt) => (
                  <label key={opt} className='flex cursor-pointer items-center gap-2 text-sm text-gray-700'>
                    <input
                      type='radio'
                      name='primaryFocusPreference'
                      value={opt}
                      checked={(value.primaryFocusPreference as string) === opt}
                      onChange={() => update('primaryFocusPreference', opt)}
                      className='h-3.5 w-3.5 accent-emerald-600'
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className='mb-2 block'>Conversation Tone Preference <span className='font-normal text-gray-400'>(optional)</span></Label>
              <div className='space-y-1.5'>
                {SQ3_TONE_PREFERENCES.map((opt) => (
                  <label key={opt} className='flex cursor-pointer items-center gap-2 text-sm text-gray-700'>
                    <input
                      type='radio'
                      name='conversationTonePreference'
                      value={opt}
                      checked={(value.conversationTonePreference as string) === opt}
                      onChange={() => update('conversationTonePreference', opt)}
                      className='h-3.5 w-3.5 accent-emerald-600'
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- SQ4 Form ----------------------------------------------------------------
function SQ4Form({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const update = (key: string, val: unknown) => onChange({ ...value, [key]: val });
  const usps = (value.usps as string[]) || ['', '', '', '', ''];

  return (
    <div className='space-y-4'>
      <div>
        <Label>What do you sell? <span className='text-red-500'>*</span></Label>
        <Textarea
          className='mt-1 min-h-[70px]'
          placeholder='2 clear, functional sentences. No marketing language.'
          value={(value.whatYouSell as string) || ''}
          onChange={(e) => update('whatYouSell', e.target.value)}
        />
      </div>
      <div>
        <Label>Who is it for? <span className='text-red-500'>*</span></Label>
        <Input
          className='mt-1'
          placeholder='e.g. role, industry, company type, size'
          value={(value.whoIsItFor as string) || ''}
          onChange={(e) => update('whoIsItFor', e.target.value)}
        />
      </div>
      <div>
        <Label>Core Outcome <span className='text-red-500'>*</span></Label>
        <Input
          className='mt-1'
          placeholder='e.g. Increases [specific result] for [specific audience]'
          value={(value.coreOutcome as string) || ''}
          onChange={(e) => update('coreOutcome', e.target.value)}
        />
      </div>
      <div>
        <Label>What differentiates your offering? <span className='font-normal text-gray-400'>(optional, up to 5)</span></Label>
        {Array.from({ length: 5 }).map((_, i) => (
          <Input
            key={i}
            className='mt-1'
            placeholder={`USP ${i + 1}`}
            value={usps[i] || ''}
            onChange={(e) => {
              const next = [...usps];
              while (next.length < 5) next.push('');
              next[i] = e.target.value;
              update('usps', next);
            }}
          />
        ))}
      </div>
      <div>
        <Label className='mb-2 block'>Channel</Label>
        <div className='flex gap-4'>
          {['Email', 'LinkedIn'].map((ch) => (
            <label key={ch} className='flex cursor-pointer items-center gap-2 text-sm text-gray-700'>
              <input
                type='radio'
                name='channel'
                value={ch}
                checked={(value.channel as string) === ch || (!value.channel && ch === 'Email')}
                onChange={() => update('channel', ch)}
                className='h-3.5 w-3.5 accent-gray-600'
              />
              {ch}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label className='mb-2 block'>Message Length</Label>
        <div className='flex gap-4'>
          {[
            { value: 'Short (3-5 sentences)', label: 'Short (3–5 sentences)' },
            { value: 'Medium (5-8 sentences)', label: 'Medium (5–8 sentences)' },
          ].map((opt) => (
            <label key={opt.value} className='flex cursor-pointer items-center gap-2 text-sm text-gray-700'>
              <input
                type='radio'
                name='messageLength'
                value={opt.value}
                checked={(value.messageLength as string) === opt.value || (!value.messageLength && opt.value === 'Short (3-5 sentences)')}
                onChange={() => update('messageLength', opt.value)}
                className='h-3.5 w-3.5 accent-gray-600'
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label className='mb-2 block'>Tone Preference <span className='font-normal text-gray-400'>(optional)</span></Label>
        <div className='flex flex-wrap gap-x-4 gap-y-1.5'>
          {['To-the-point', 'Strategic', 'More personal'].map((opt) => (
            <label key={opt} className='flex cursor-pointer items-center gap-2 text-sm text-gray-700'>
              <input
                type='radio'
                name='tonePreference'
                value={opt}
                checked={(value.tonePreference as string) === opt}
                onChange={() => update('tonePreference', opt)}
                className='h-3.5 w-3.5 accent-gray-600'
              />
              {opt}
            </label>
          ))}
        </div>
        <p className='mt-1 text-xs text-gray-400'>If not selected, tone will automatically follow each prospect&apos;s style.</p>
      </div>
    </div>
  );
}

// ---- Main Modal --------------------------------------------------------------
const FORM_COMPONENTS: Record<SQId, typeof SQ1Form> = {
  '1': SQ1Form,
  '2': SQ2Form,
  '3': SQ3Form,
  '4': SQ4Form,
};

export function StandardQuestionModal({
  sqId,
  open,
  onClose,
  onSubmit,
  isProcessing,
  error,
}: StandardQuestionModalProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'uk';
  const isLimitReached = error === 'CAP_REACHED';

  const getDefaultFormValue = (id: string | null): Record<string, unknown> => {
    if (id === '2') return { dimensions: SQ2_DIMENSIONS.map((d) => d.name) };
    return {};
  };

  const [formValue, setFormValue] = useState<Record<string, unknown>>(() => getDefaultFormValue(sqId));

  useEffect(() => {
    setFormValue(getDefaultFormValue(sqId));
  }, [sqId]);

  const config = STANDARD_QUESTIONS.find((q) => q.id === sqId);
  const FormComponent = sqId ? FORM_COMPONENTS[sqId] : null;

  const handleSubmit = () => {
    if (!sqId) return;
    if (sqId === '2') {
      const selectedDims = (formValue.dimensions as string[]) ?? SQ2_DIMENSIONS.map((d) => d.name);
      const enriched: Record<string, unknown> = {};
      for (const dim of SQ2_DIMENSIONS) {
        if (selectedDims.includes(dim.name)) {
          enriched[dim.name] = `Allowed values: ${dim.values.join(', ')}`;
        }
      }
      if (formValue.customDimensionName) {
        enriched['Custom Dimension Name'] = formValue.customDimensionName;
        const vals = (formValue.customDimensionValues as string[])?.filter(Boolean) ?? [];
        if (vals.length) enriched['Custom Dimension Allowed Values'] = vals.join(', ');
      }
      onSubmit(sqId, enriched);
      return;
    }
    onSubmit(sqId, formValue);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setFormValue(getDefaultFormValue(sqId));
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='bg-white sm:max-w-[560px]'>
        <DialogHeader className='text-center sm:text-center'>
          <DialogTitle className='text-xl font-bold'>{config?.title ?? 'Standard Question'}</DialogTitle>
          <DialogDescription className='text-gray-600'>{config?.description}</DialogDescription>
        </DialogHeader>

        {/* Inline alert — limit state uses neutral Upgrade alert; other errors stay red */}
        {error && isLimitReached && <LimitReachedAlert locale={locale} />}
        {error && !isLimitReached && (
          <div className='flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
            <svg className='mt-0.5 h-4 w-4 shrink-0' viewBox='0 0 20 20' fill='currentColor'>
              <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-9.25a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 5.5a.75.75 0 100-1.5.75.75 0 000 1.5z' clipRule='evenodd' />
            </svg>
            {error}
          </div>
        )}

        <div className='max-h-[60vh] overflow-y-auto px-1 py-2'>
          {FormComponent && <FormComponent value={formValue} onChange={setFormValue} />}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => handleOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            className='bg-blue-600 text-white hover:bg-blue-700'
            onClick={handleSubmit}
            disabled={isProcessing}
          >
            {isProcessing ? 'Analysis in progress…' : 'Run'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
