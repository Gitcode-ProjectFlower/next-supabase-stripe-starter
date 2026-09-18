'use client';

import { useParams } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { LimitReachedAlert } from '@/components/limit-reached-alert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
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

import { ScaledExample } from './example-results';
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

// ---- SQ1 Form ----------------------------------------------------------------
// Accepted deviation from the brief (final): the example renders the shared
// React component via ScaledExample instead of the enclosed PNG, and touch
// opens the fullscreen view via click. Content, fit and behaviour match.
function ExampleHover({ variant }: { variant: 'sps' | 'segmentation' | 'brief' | 'outreach' }) {
  const [preview, setPreview] = useState(false);
  const [previewClosing, setPreviewClosing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fsClosing, setFsClosing] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<NodeJS.Timeout | null>(null);
  const exitTimer = useRef<NodeJS.Timeout | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const canHover = () =>
    typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (exitTimer.current) {
      clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
    setPreviewClosing(false);
  };

  const startPreviewClose = () => {
    if (!preview || previewClosing) return;
    setPreviewClosing(true);
    exitTimer.current = setTimeout(() => {
      exitTimer.current = null;
      setPreview(false);
      setPreviewClosing(false);
    }, 130);
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(startPreviewClose, 150);
  };

  const openFullscreen = () => {
    cancelClose();
    setPreview(false);
    setPreviewClosing(false);
    setFsClosing(false);
    setFullscreen(true);
  };

  const closeFullscreen = () => {
    if (!fullscreen || fsClosing) return;
    setFsClosing(true);
    exitTimer.current = setTimeout(() => {
      exitTimer.current = null;
      setFullscreen(false);
      setFsClosing(false);
    }, 140);
  };

  const show = () => {
    if (!canHover()) return;
    cancelClose();
    // Already open (e.g. re-enter fired by the panel moving out from under
    // the cursor): keep the corrected position instead of recomputing it.
    if (preview) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(window.innerWidth * 0.92, 780);
      // The panel lives in a body portal (viewport coords), but historically
      // it sat further right — keep that exact horizontal placement, only
      // the vertical position moves up under the button.
      const dialogLeft = triggerRef.current?.closest('[role="dialog"]')?.getBoundingClientRect().left ?? 0;
      // Optimistic: open below the trigger; the mount effect below corrects
      // using the real panel height if it overflows the viewport.
      setPos({
        width,
        // +56: panel padding + zoom rounding, so the right edge never clips.
        left: Math.max(8, Math.min(rect.right - width + dialogLeft, window.innerWidth - width - 56)),
        top: rect.bottom + 8,
      });
    }
    setPreview(true);
  };

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (exitTimer.current) clearTimeout(exitTimer.current);
    },
    []
  );

  // Nudge the preview after mount using its real height: prefer below the
  // trigger, otherwise above it — never covering the trigger itself. Double
  // rAF so ScaledExample's zoom has settled before measuring.
  useEffect(() => {
    if (!preview || fullscreen) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        const panelEl = panelRef.current;
        const btnEl = triggerRef.current;
        if (!panelEl || !btnEl) return;
        const r = panelEl.getBoundingClientRect();
        const b = btnEl.getBoundingClientRect();
        const vh = window.innerHeight;
        const fitsBelow = b.bottom + 8 + r.height + 8 <= vh;
        const fitsAbove = b.top - r.height - 8 >= 8;
        const top = fitsBelow ? b.bottom + 8 : fitsAbove ? b.top - r.height - 8 : Math.max(8, vh - r.height - 8);
        setPos((prev) => (Math.abs(prev.top - top) > 1 ? { ...prev, top } : prev));
      });
    });
    return () => {
      cancelAnimationFrame(first);
      if (second) cancelAnimationFrame(second);
    };
  }, [preview, fullscreen]);

  useEffect(() => {
    if (!fullscreen) return;
    closeBtnRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        closeFullscreen();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [fullscreen, fsClosing]);

  return (
    <>
      <button
        ref={triggerRef}
        type='button'
        className='ml-2 whitespace-nowrap text-xs font-medium text-blue-600 transition-colors hover:text-blue-800'
        onMouseEnter={show}
        onMouseLeave={scheduleClose}
        onClick={() => {
          openFullscreen();
        }}
      >
        View example →
      </button>
      {preview &&
        !fullscreen &&
        typeof window !== 'undefined' &&
        // Portal to body: DialogContent has translate-x/y, which would make
        // `fixed` coordinates relative to the dialog instead of the viewport.
        createPortal(
          <div
            ref={panelRef}
            className={`example-preview pointer-events-auto fixed z-[100] overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-xl${
              previewClosing ? ' example-preview-closing' : ''
            }`}
            style={{ top: pos.top, left: pos.left, maxHeight: '76vh' }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <ScaledExample variant={variant} maxWidth={pos.width || 780} maxHeight={window.innerHeight * 0.76 - 32} />
          </div>,
          document.body
        )}
      {fullscreen &&
        createPortal(
          <div
            ref={dialogRef}
            className={`pointer-events-auto fixed inset-0 flex items-center justify-center bg-black/60 p-4${
              fsClosing ? ' example-backdrop-closing' : ' example-backdrop'
            }`}
            style={{ zIndex: 200 }}
            role='dialog'
            aria-modal='true'
            aria-label='Example preview'
            onClick={() => closeFullscreen()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div
              className={`relative max-h-[90vh] w-fit max-w-full overflow-auto rounded-xl bg-white p-4 shadow-2xl${
                fsClosing ? ' example-fullscreen-closing' : ' example-fullscreen'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                ref={closeBtnRef}
                type='button'
                aria-label='Close example'
                className='absolute right-3 top-3 rounded-full bg-white p-1.5 text-gray-500 shadow transition-colors hover:bg-gray-100 hover:text-gray-900'
                onClick={() => closeFullscreen()}
              >
                <svg viewBox='0 0 20 20' fill='currentColor' className='h-5 w-5'>
                  <path d='M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z' />
                </svg>
              </button>
              <ScaledExample
                variant={variant}
                maxWidth={typeof window === 'undefined' ? 860 : Math.min(860, window.innerWidth - 64)}
                maxHeight={typeof window === 'undefined' ? 800 : window.innerHeight * 0.9 - 64}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function SQ1Form({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const update = (key: string, val: unknown) => onChange({ ...value, [key]: val });

  return (
    <div className='space-y-4'>
      <div className='text-center'>
        <p className='text-2xl font-bold text-gray-900'>Sales Priority Score</p>
        <p className='mt-0.5 text-sm text-gray-600'>
          Ranks companies based on fit and commercial potential. <ExampleHover variant='sps' />
        </p>
      </div>
      <div>
        <Label>Product / Service Description</Label>
        <p className='mt-0.5 text-xs text-gray-500'>What do you offer and what value does it provide?</p>
        <Textarea
          className='mt-1 min-h-[150px]'
          placeholder='e.g. Temporary and permanent staffing for logistics, construction and industrial companies.'
          value={(value.productDescription as string) || ''}
          onChange={(e) => update('productDescription', e.target.value)}
        />
      </div>
      <div>
        <Label>Ideal Customer Profile (ICP)</Label>
        <p className='mt-0.5 text-xs text-gray-500'>What makes a company a particularly good prospect?</p>
        <Textarea
          className='mt-1 min-h-[150px]'
          placeholder='e.g. Warehouses, factories, shift work, recurring workforce needs or seasonal demand.'
          value={(value.icp as string) || ''}
          onChange={(e) => update('icp', e.target.value)}
        />
        <p className='mt-1.5 text-xs text-gray-400'>
          Complete at least one of the two fields above. Providing both can improve the assessment.
        </p>
      </div>
      <div>
        <Label>
          Exclusions / Red Flags <span className='font-normal text-gray-400'>(optional)</span>
        </Label>
        <p className='mt-0.5 text-xs text-gray-500'>Which companies are unlikely to be relevant?</p>
        <Textarea
          className='mt-1 min-h-[96px]'
          placeholder='e.g. B2C-only companies or sectors you do not serve.'
          value={(value.exclusions as string) || ''}
          onChange={(e) => update('exclusions', e.target.value)}
        />
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
      <div className='text-center'>
        <p className='text-2xl font-bold text-gray-900'>Market Segmentation</p>
        <p className='mt-0.5 text-sm text-gray-600'>
          Classify companies across key market dimensions. <ExampleHover variant='segmentation' />
        </p>
      </div>
      <div>
        <Label className='mb-2 block'>Dimensions to extract</Label>
        <div className='space-y-2'>
          {SQ2_DIMENSIONS.map((dim) => {
            const selected = selectedDimensions.includes(dim.name);
            return (
              <div
                key={dim.name}
                role='checkbox'
                aria-checked={selected}
                tabIndex={0}
                onClick={() => toggleDimension(dim.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleDimension(dim.name);
                  }
                }}
                className={`cursor-pointer rounded-lg border px-3 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-purple-500 ${
                  selected ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white opacity-50'
                }`}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div>
                    <p className={`text-xs font-semibold ${selected ? 'text-purple-800' : 'text-gray-500'}`}>
                      {dim.name}
                    </p>
                    <p className='mt-0.5 text-xs text-gray-500'>{dim.description}</p>
                    <p className='mt-1 text-xs text-gray-500'>{dim.values.join(' · ')}</p>
                  </div>
                  <div
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 ${
                      selected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                    }`}
                  >
                    {selected && (
                      <svg viewBox='0 0 12 12' fill='none' className='h-full w-full p-0.5'>
                        <path
                          d='M2 6l3 3 5-5'
                          stroke='white'
                          strokeWidth='1.5'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
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
        <Label>
          Custom Dimension <span className='font-normal text-gray-400'>(optional)</span>
        </Label>
        <Input
          className='mt-1'
          placeholder='e.g. Digital Maturity Level'
          value={(value.customDimensionName as string) || ''}
          onChange={(e) => update('customDimensionName', e.target.value)}
        />
      </div>
      {!!value.customDimensionName && (
        <div>
          <Label className='mb-1 block'>
            Classification Values <span className='font-normal text-gray-400'>(2–6 required)</span>
          </Label>
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
  const advancedRef = useRef<HTMLDivElement>(null);
  const update = (key: string, val: unknown) => onChange({ ...value, [key]: val });

  return (
    <div className='space-y-4'>
      <div className='text-center'>
        <p className='text-2xl font-bold text-gray-900'>Account Intelligence Brief</p>
        <p className='mt-0.5 text-sm text-gray-600'>
          Get prepared for your first sales conversation – in one click. <ExampleHover variant='brief' />
        </p>
      </div>

      <div>
        <Label>
          Product / Service Context <span className='text-red-500'>*</span>
        </Label>
        <Textarea
          className='mt-1 min-h-[80px]'
          placeholder='Briefly describe what you are offering to this company (recommended max ~300 characters)'
          value={(value.productContext as string) || ''}
          onChange={(e) => update('productContext', e.target.value)}
        />
      </div>

      <div>
        <Label className='mb-2 block'>
          Intended Conversation Perspective <span className='font-normal text-gray-400'>(optional)</span>
        </Label>
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
        <Label className='mb-2 block'>
          Sales Objective <span className='font-normal text-gray-400'>(optional)</span>
        </Label>
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
          <svg
            viewBox='0 0 20 20'
            fill='currentColor'
            className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
          >
            <path
              fillRule='evenodd'
              d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z'
              clipRule='evenodd'
            />
          </svg>
        </button>

        {showAdvanced && (
          <div className='mt-3 space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-3'>
            <div>
              <Label className='mb-2 block'>
                Primary Focus Preference <span className='font-normal text-gray-400'>(optional)</span>
              </Label>
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
              <Label className='mb-2 block'>
                Conversation Tone Preference <span className='font-normal text-gray-400'>(optional)</span>
              </Label>
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

  const getUsp = (i: number) => usps[i] || '';
  let leadingFilled = 0;
  while (leadingFilled < 5 && getUsp(leadingFilled).trim() !== '') leadingFilled++;
  let lastFilled = -1;
  for (let i = 0; i < 5; i++) {
    if (getUsp(i).trim() !== '') lastFilled = i;
  }
  const visibleUspCount = Math.min(5, Math.max(1, leadingFilled + 1, lastFilled + 1));

  return (
    <div className='space-y-4'>
      <div className='text-center'>
        <p className='text-2xl font-bold text-gray-900'>Personalized Outreach Message</p>
        <p className='mt-0.5 text-sm text-gray-600'>
          Create a personalized first message based on the company&apos;s priorities.{' '}
          <ExampleHover variant='outreach' />
        </p>
      </div>
      <div>
        <Label>
          What do you sell? <span className='text-red-500'>*</span>
        </Label>
        <Textarea
          className='mt-1 min-h-[70px]'
          placeholder='2 clear, functional sentences. No marketing language.'
          value={(value.whatYouSell as string) || ''}
          onChange={(e) => update('whatYouSell', e.target.value)}
        />
      </div>
      <div>
        <Label>
          Who is it for? <span className='text-red-500'>*</span>
        </Label>
        <Input
          className='mt-1'
          placeholder='e.g. role, industry, company type, size'
          value={(value.whoIsItFor as string) || ''}
          onChange={(e) => update('whoIsItFor', e.target.value)}
        />
      </div>
      <div>
        <Label>
          Core Outcome <span className='text-red-500'>*</span>
        </Label>
        <Input
          className='mt-1'
          placeholder='e.g. Increases [specific result] for [specific audience]'
          value={(value.coreOutcome as string) || ''}
          onChange={(e) => update('coreOutcome', e.target.value)}
        />
      </div>
      <div>
        <Label>
          What differentiates your offering? <span className='font-normal text-gray-400'>(optional, up to 5)</span>
        </Label>
        <div className='mt-1 space-y-1'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Collapsible key={i} open={i < visibleUspCount}>
              <CollapsibleContent className='p-[2px]'>
                <Input
                  placeholder={`USP ${i + 1}`}
                  value={getUsp(i)}
                  onChange={(e) => {
                    const next = [...usps];
                    while (next.length < 5) next.push('');
                    next[i] = e.target.value;
                    update('usps', next);
                  }}
                />
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
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
                checked={
                  (value.messageLength as string) === opt.value ||
                  (!value.messageLength && opt.value === 'Short (3-5 sentences)')
                }
                onChange={() => update('messageLength', opt.value)}
                className='h-3.5 w-3.5 accent-gray-600'
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label className='mb-2 block'>
          Tone Preference <span className='font-normal text-gray-400'>(optional)</span>
        </Label>
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
        <p className='mt-1 text-xs text-gray-400'>
          If not selected, tone will automatically follow each prospect&apos;s style.
        </p>
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
  const [formError, setFormError] = useState<string | null>(null);

  // Parents null activeSqId in the same commit that closes the dialog. Radix
  // keeps the content mounted for the exit animation, so without freezing the
  // id the dialog would flash the generic "Standard Question" branch (and an
  // emptied form) while closing. effectiveSqId stays on the last real id
  // until the next question opens.
  const [frozenSqId, setFrozenSqId] = useState<SQId | null>(sqId);
  useLayoutEffect(() => {
    if (sqId) setFrozenSqId(sqId);
  }, [sqId]);
  const effectiveSqId = sqId ?? frozenSqId;

  useEffect(() => {
    if (open && effectiveSqId) {
      setFormValue(getDefaultFormValue(effectiveSqId));
      setFormError(null);
    }
  }, [open, effectiveSqId]);

  const config = STANDARD_QUESTIONS.find((q) => q.id === effectiveSqId);
  const FormComponent = effectiveSqId ? FORM_COMPONENTS[effectiveSqId] : null;

  const handleSubmit = () => {
    if (!effectiveSqId) return;
    if (effectiveSqId === '1') {
      const desc = String(formValue.productDescription ?? '').trim();
      const icp = String(formValue.icp ?? '').trim();
      if (!desc && !icp) {
        setFormError('Fill in Product / Service Description or Ideal Customer Profile (or both).');
        return;
      }
    }
    setFormError(null);
    if (effectiveSqId === '2') {
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
      onSubmit(effectiveSqId, enriched);
      return;
    }
    onSubmit(effectiveSqId, formValue);
  };

  const handleOpenChange = (v: boolean) => {
    // No form reset here: Radix keeps the content mounted for the exit
    // animation and must show the closing question, not an emptied form.
    // Freshness is handled by the open-gated reset effect above.
    if (!v) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='bg-white sm:max-w-[640px]'>
        {!FormComponent && (
          <DialogHeader className='text-center sm:text-center'>
            <DialogTitle className='text-2xl font-bold'>{config?.title ?? 'Standard Question'}</DialogTitle>
            <DialogDescription className='text-gray-600'>{config?.description}</DialogDescription>
          </DialogHeader>
        )}
        {FormComponent && (
          <>
            <DialogTitle className='sr-only'>{config?.title ?? 'Standard Question'}</DialogTitle>
            <DialogDescription className='sr-only'>{config?.description ?? ''}</DialogDescription>
          </>
        )}

        {/* Inline alert — limit state uses neutral Upgrade alert; other errors stay red */}
        {error && isLimitReached && <LimitReachedAlert locale={locale} />}
        {formError && (
          <div
            role='alert'
            className='flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
          >
            <svg className='mt-0.5 h-4 w-4 shrink-0' viewBox='0 0 20 20' fill='currentColor'>
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-9.25a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 5.5a.75.75 0 100-1.5.75.75 0 000 1.5z'
                clipRule='evenodd'
              />
            </svg>
            {formError}
          </div>
        )}
        {error && !isLimitReached && (
          <div
            role='alert'
            className='flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
          >
            <svg className='mt-0.5 h-4 w-4 shrink-0' viewBox='0 0 20 20' fill='currentColor'>
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-9.25a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 5.5a.75.75 0 100-1.5.75.75 0 000 1.5z'
                clipRule='evenodd'
              />
            </svg>
            {error}
          </div>
        )}

        <div className='min-h-0 flex-1 overflow-y-auto px-1 py-2'>
          {FormComponent && (
            <FormComponent
              value={formValue}
              onChange={(v) => {
                setFormValue(v);
                setFormError(null);
              }}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => handleOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button className='bg-blue-600 text-white hover:bg-blue-700' onClick={handleSubmit} disabled={isProcessing}>
            {isProcessing ? 'Analysis in progress…' : 'Run'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
