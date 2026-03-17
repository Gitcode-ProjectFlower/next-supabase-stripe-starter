'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/utils/cn';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LoaderStep {
  label: string;
  threshold: number;
}

interface SQConfig {
  title: string;
  subtitle: string;
  color: string;
  progressColor: string;
  steps: LoaderStep[];
}

// ── Per-SQ configuration ──────────────────────────────────────────────────────

const SQ_CONFIGS: Record<string, SQConfig> = {
  '1': {
    title: 'Generating Sales Priority Scores',
    subtitle: 'This may take a few moments, depending on the number of companies selected. The Sales Priority Scores will be available in Downloads when the analysis is complete.',
    color: 'text-blue-600',
    progressColor: 'bg-blue-500',
    steps: [
      { label: 'Input received', threshold: 10 },
      { label: 'Collecting company data', threshold: 40 },
      { label: 'Evaluating commercial fit', threshold: 75 },
      { label: 'Generating scores and evidence', threshold: 100 },
    ],
  },
  '2': {
    title: 'Classifying companies by selected dimensions',
    subtitle: 'This may take a few moments, depending on the number of companies selected. The segmentation results will be available in Downloads when the analysis is complete.',
    color: 'text-purple-600',
    progressColor: 'bg-purple-500',
    steps: [
      { label: 'Input received', threshold: 10 },
      { label: 'Analyzing companies', threshold: 40 },
      { label: 'Classifying selected dimensions', threshold: 75 },
      { label: 'Generating segmentation output', threshold: 100 },
    ],
  },
  '3': {
    title: 'Generating account brief',
    subtitle: 'This may take a short moment. The Account Intelligence Brief will be available in Downloads when ready.',
    color: 'text-emerald-600',
    progressColor: 'bg-emerald-500',
    steps: [
      { label: 'Input received', threshold: 10 },
      { label: 'Reviewing company data', threshold: 40 },
      { label: 'Identifying key signals', threshold: 75 },
      { label: 'Creating account intelligence brief', threshold: 100 },
    ],
  },
  '4': {
    title: 'Creating outreach message',
    subtitle: 'This may take a short moment. The generated message will be available in Downloads when complete.',
    color: 'text-orange-500',
    progressColor: 'bg-orange-400',
    steps: [
      { label: 'Input received', threshold: 10 },
      { label: 'Analyzing company positioning', threshold: 40 },
      { label: 'Aligning message direction', threshold: 75 },
      { label: 'Writing personalized message', threshold: 100 },
    ],
  },
};

// ── Shared primitives ─────────────────────────────────────────────────────────

function AnimatedCheck({ done }: { done: boolean }) {
  return (
    <svg
      viewBox='0 0 24 24'
      className={cn('h-5 w-5 shrink-0 transition-colors duration-500', done ? 'text-green-500' : 'text-gray-300')}
      fill='none'
      stroke='currentColor'
      strokeWidth={2.5}
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <circle
        cx='12'
        cy='12'
        r='10'
        strokeWidth={1.5}
        className={cn('transition-colors duration-500', done ? 'stroke-green-200' : 'stroke-gray-200')}
      />
      <path
        d='M7 12.5l3.5 3.5L17 8'
        style={{
          strokeDasharray: 20,
          strokeDashoffset: done ? 0 : 20,
          transition: 'stroke-dashoffset 0.6s ease, opacity 0.3s',
          opacity: done ? 1 : 0,
        }}
      />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox='0 0 24 24' fill='none'>
      <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='2' strokeOpacity='0.2' />
      <path d='M12 2a10 10 0 0 1 10 10' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
    </svg>
  );
}

function ElapsedTimer({ running, startedAt }: { running: boolean; startedAt?: string }) {
  const getElapsed = () =>
    startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) : 0;

  const [seconds, setSeconds] = useState(getElapsed);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(getElapsed()), 1000);
    return () => clearInterval(id);
  }, [running, startedAt]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return <span className='font-mono text-xs text-gray-500'>{mm}:{ss}</span>;
}

// ── Main exported component ───────────────────────────────────────────────────

interface SQLoaderProps {
  sqId: string | null | undefined;
  progress: number;
  startedAt?: string;
  totalItems?: number;
}

// How many seconds each step holds before advancing (total ~48s for 4 steps)
const STEP_DURATION_S = 12;

// Returns index of the last step that should be shown as done.
// The final step is never marked done by the timer — only when completed=true.
function useTimedProgress(startedAt?: string, totalSteps = 4): number {
  const getElapsedStepIndex = () => {
    if (!startedAt) return 0;
    const elapsedS = (Date.now() - new Date(startedAt).getTime()) / 1000;
    // Cap at totalSteps - 2 so the last step never ticks to done via timer
    return Math.min(Math.floor(elapsedS / STEP_DURATION_S), totalSteps - 2);
  };

  const [stepIndex, setStepIndex] = useState(getElapsedStepIndex);

  useEffect(() => {
    const tick = () => setStepIndex(getElapsedStepIndex());
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  return stepIndex;
}

export function SQLoader({ sqId, startedAt }: SQLoaderProps) {
  const config = sqId ? SQ_CONFIGS[sqId] : null;
  const stepIndex = useTimedProgress(startedAt, config?.steps.length ?? 4);

  if (!config) return null;

  return (
    <div className='space-y-4 rounded-2xl border bg-white p-6 shadow-sm'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2'>
            <Spinner className={cn('h-5 w-5 shrink-0', config.color)} />
            <span className='font-semibold text-gray-900'>{config.title}</span>
          </div>
          <p className='mt-1 text-xs text-gray-500'>{config.subtitle}</p>
        </div>
        <ElapsedTimer running={true} startedAt={startedAt} />
      </div>

      <div className='space-y-2'>
        {config.steps.map((step, i) => (
          <div key={step.label} className='flex items-center gap-3'>
            <AnimatedCheck done={i <= stepIndex} />
            <span className={cn('text-sm transition-colors duration-300', i <= stepIndex ? 'text-gray-900' : 'text-gray-400')}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}
