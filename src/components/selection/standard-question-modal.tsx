'use client';

import { useState } from 'react';

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
  'Growing headcount',
  'Recent funding',
  'New leadership',
  'Expanding to new markets',
  'Tech stack match',
  'Active hiring in target role',
];

const COMMERCIAL_SIGNALS = [
  'High revenue potential',
  'Short sales cycle',
  'Repeat purchase likely',
  'Strategic account',
  'Upsell / cross-sell opportunity',
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
        <Label>Product / Service Name</Label>
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
          placeholder='Brief description of what you sell'
          value={(value.productDescription as string) || ''}
          onChange={(e) => update('productDescription', e.target.value)}
        />
      </div>
      <div>
        <Label>Ideal Customer Profile Characteristics</Label>
        <Textarea
          className='mt-1 min-h-[70px]'
          placeholder='Describe your ideal customer in free text'
          value={(value.icpCharacteristics as string) || ''}
          onChange={(e) => update('icpCharacteristics', e.target.value)}
        />
      </div>
      <div>
        <Label className='mb-2 block'>ICP Signals</Label>
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
      </div>
      <div>
        <Label className='mb-2 block'>Commercial Attractiveness Signals</Label>
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
      </div>
      <div>
        <Label>Exclusions / Red Flags</Label>
        <Input
          className='mt-1'
          placeholder='e.g. companies < 10 employees, government'
          value={(value.exclusions as string) || ''}
          onChange={(e) => update('exclusions', e.target.value)}
        />
      </div>
      <div>
        <Label>Scoring Focus</Label>
        <select
          className='mt-1 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-ring'
          value={(value.scoringFocus as string) || 'Fit Mode'}
          onChange={(e) => update('scoringFocus', e.target.value)}
        >
          <option value='Fit Mode'>Fit Mode — how well does this company match my ICP?</option>
          <option value='Revenue Mode'>Revenue Mode — how much revenue could this company generate?</option>
        </select>
      </div>
    </div>
  );
}

const SQ2_DIMENSIONS = [
  'Primary Customer Type',
  'Target Customer Segment',
  'Geographic Scope',
  'Organizational Sophistication',
  'Market Positioning',
  'Operational Criticality',
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

  const toggleDimension = (dim: string) => {
    const arr = (value.dimensions as string[]) || SQ2_DIMENSIONS;
    const next = arr.includes(dim) ? arr.filter((v) => v !== dim) : [...arr, dim];
    update('dimensions', next);
  };

  // Default: all dimensions selected
  const selectedDimensions = (value.dimensions as string[]) ?? SQ2_DIMENSIONS;

  return (
    <div className='space-y-4'>
      <div>
        <Label className='mb-2 block'>Dimensions to extract</Label>
        <p className='mb-2 text-xs text-gray-500'>Select which segments the AI should identify for each company.</p>
        <div className='flex flex-wrap gap-2'>
          {SQ2_DIMENSIONS.map((dim) => {
            const selected = selectedDimensions.includes(dim);
            return (
              <button
                key={dim}
                type='button'
                onClick={() => toggleDimension(dim)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selected
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-400 line-through hover:border-gray-300'
                }`}
              >
                {dim}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label>Custom Dimension (optional)</Label>
        <Input
          className='mt-1'
          placeholder='e.g. Digital Maturity Level'
          value={(value.customDimensionName as string) || ''}
          onChange={(e) => update('customDimensionName', e.target.value)}
        />
      </div>
      {!!value.customDimensionName && (
        <div>
          <Label>Allowed Values for Custom Dimension (comma-separated)</Label>
          <Input
            className='mt-1'
            placeholder='e.g. Low, Medium, High'
            value={
              Array.isArray(value.customDimensionValues)
                ? (value.customDimensionValues as string[]).join(', ')
                : ''
            }
            onChange={(e) =>
              update(
                'customDimensionValues',
                e.target.value
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean)
              )
            }
          />
        </div>
      )}
    </div>
  );
}

// ---- SQ3 Form ----------------------------------------------------------------
function SQ3Form({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const update = (key: string, val: unknown) => onChange({ ...value, [key]: val });

  return (
    <div className='space-y-4'>
      <div>
        <Label>Product / Service Context</Label>
        <Textarea
          className='mt-1 min-h-[80px]'
          placeholder='Describe what you sell and who it is for'
          value={(value.productContext as string) || ''}
          onChange={(e) => update('productContext', e.target.value)}
        />
      </div>
      <div>
        <Label>Sales Objective</Label>
        <Input
          className='mt-1'
          placeholder='e.g. Book a discovery call'
          value={(value.salesObjective as string) || ''}
          onChange={(e) => update('salesObjective', e.target.value)}
        />
      </div>
      <div>
        <Label>Primary Focus Preference</Label>
        <select
          className='mt-1 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-ring'
          value={(value.primaryFocusPreference as string) || ''}
          onChange={(e) => update('primaryFocusPreference', e.target.value)}
        >
          <option value=''>Select…</option>
          <option value='Commercial Entry Points'>Commercial Entry Points</option>
          <option value='Strategic Priorities'>Strategic Priorities</option>
          <option value='Buying Signals'>Buying Signals</option>
        </select>
      </div>

      {/* Advanced ▼ collapsible section */}
      <div>
        <button
          type='button'
          className='flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors'
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
            viewBox='0 0 20 20'
            fill='currentColor'
          >
            <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clipRule='evenodd' />
          </svg>
          Advanced
        </button>

        {showAdvanced && (
          <div className='mt-3 space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-3'>
            <div>
              <Label>Intended Conversation Perspective</Label>
              <Input
                className='mt-1'
                placeholder='e.g. We help mid-market SaaS companies…'
                value={(value.conversationPerspective as string) || ''}
                onChange={(e) => update('conversationPerspective', e.target.value)}
              />
            </div>
            <div>
              <Label>Conversation Tone Preference</Label>
              <select
                className='mt-1 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-ring'
                value={(value.conversationTonePreference as string) || ''}
                onChange={(e) => update('conversationTonePreference', e.target.value)}
              >
                <option value=''>Select…</option>
                <option value='Consultative'>Consultative</option>
                <option value='Direct'>Direct</option>
                <option value='Challenger'>Challenger</option>
              </select>
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
  const usps = (value.usps as string[]) || ['', '', ''];

  return (
    <div className='space-y-4'>
      <div>
        <Label>What do you sell?</Label>
        <Input
          className='mt-1'
          placeholder='e.g. B2B sales automation software'
          value={(value.whatYouSell as string) || ''}
          onChange={(e) => update('whatYouSell', e.target.value)}
        />
      </div>
      <div>
        <Label>Who is it for?</Label>
        <Input
          className='mt-1'
          placeholder='e.g. Sales teams at mid-market SaaS companies'
          value={(value.whoIsItFor as string) || ''}
          onChange={(e) => update('whoIsItFor', e.target.value)}
        />
      </div>
      <div>
        <Label>Core Outcome</Label>
        <Input
          className='mt-1'
          placeholder='e.g. 3x more booked demos per month'
          value={(value.coreOutcome as string) || ''}
          onChange={(e) => update('coreOutcome', e.target.value)}
        />
      </div>
      <div>
        <Label>USPs (up to 3)</Label>
        {usps.slice(0, 3).map((usp, i) => (
          <Input
            key={i}
            className='mt-1'
            placeholder={`USP ${i + 1}`}
            value={usp}
            onChange={(e) => {
              const next = [...usps];
              next[i] = e.target.value;
              update('usps', next.filter(Boolean));
            }}
          />
        ))}
      </div>
      <div>
        <Label>Channel</Label>
        <select
          className='mt-1 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-ring'
          value={(value.channel as string) || 'Email'}
          onChange={(e) => update('channel', e.target.value)}
        >
          <option value='Email'>Email</option>
          <option value='LinkedIn'>LinkedIn</option>
        </select>
      </div>
      <div>
        <Label>Message Length</Label>
        <select
          className='mt-1 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-ring'
          value={(value.messageLength as string) || 'Short (3-4 sentences)'}
          onChange={(e) => update('messageLength', e.target.value)}
        >
          <option value='Short (3-4 sentences)'>Short (3-4 sentences)</option>
          <option value='Medium (1 paragraph)'>Medium (1 paragraph)</option>
          <option value='Long (2-3 paragraphs)'>Long (2-3 paragraphs)</option>
        </select>
      </div>
      <div>
        <Label>Tone Preference</Label>
        <select
          className='mt-1 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-ring'
          value={(value.tonePreference as string) || 'Professional'}
          onChange={(e) => update('tonePreference', e.target.value)}
        >
          <option value='Professional'>Professional</option>
          <option value='Friendly'>Friendly</option>
          <option value='Direct'>Direct</option>
          <option value='Challenger'>Challenger</option>
        </select>
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
  const [formValue, setFormValue] = useState<Record<string, unknown>>({});

  const config = STANDARD_QUESTIONS.find((q) => q.id === sqId);
  const FormComponent = sqId ? FORM_COMPONENTS[sqId] : null;

  const handleSubmit = () => {
    if (!sqId) return;
    onSubmit(sqId, formValue);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setFormValue({});
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='bg-white sm:max-w-[560px]'>
        <DialogHeader>
          <DialogTitle>{config?.title ?? 'Standard Question'}</DialogTitle>
          <DialogDescription className='text-gray-600'>{config?.description}</DialogDescription>
        </DialogHeader>

        {/* §5.5 Inline error — shown above form, replaces toast for 400/500 errors */}
        {error && (
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
            {isProcessing ? 'Processing…' : 'Run'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
