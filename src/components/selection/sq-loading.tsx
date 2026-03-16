'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/cn';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LoaderStep {
  label: string;
  threshold: number;
}

interface SQConfig {
  title: string;
  color: string;
  progressColor: string;
  steps: LoaderStep[];
}

// ── Per-SQ configuration ──────────────────────────────────────────────────────

const SQ_CONFIGS: Record<string, SQConfig> = {
  '1': {
    title: 'Sales Priority Score',
    color: 'text-blue-600',
    progressColor: 'bg-blue-500',
    steps: [
      { label: 'Fetching company data', threshold: 20 },
      { label: 'Analysing ICP fit signals', threshold: 50 },
      { label: 'Calculating priority score', threshold: 80 },
      { label: 'Finalising results', threshold: 100 },
    ],
  },
  '2': {
    title: 'Market Segmentation',
    color: 'text-purple-600',
    progressColor: 'bg-purple-500',
    steps: [
      { label: 'Retrieving company profiles', threshold: 20 },
      { label: 'Identifying customer segments', threshold: 45 },
      { label: 'Mapping geographic scope', threshold: 70 },
      { label: 'Building segmentation matrix', threshold: 100 },
    ],
  },
  '3': {
    title: 'Account Intelligence Brief',
    color: 'text-emerald-600',
    progressColor: 'bg-emerald-500',
    steps: [
      { label: 'Scanning company website data', threshold: 15 },
      { label: 'Extracting strategic indicators', threshold: 40 },
      { label: 'Identifying commercial entry points', threshold: 65 },
      { label: 'Composing intelligence brief', threshold: 100 },
    ],
  },
  '4': {
    title: 'Personalised Outreach',
    color: 'text-orange-500',
    progressColor: 'bg-orange-400',
    steps: [
      { label: 'Reading company context', threshold: 20 },
      { label: 'Matching tone and channel', threshold: 45 },
      { label: 'Drafting personalised message', threshold: 75 },
      { label: 'Reviewing and finalising copy', threshold: 100 },
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

export function SQLoader({ sqId, progress, startedAt, totalItems }: SQLoaderProps) {
  const config = sqId ? SQ_CONFIGS[sqId] : null;
  const [displayProgress, setDisplayProgress] = useState(progress);
  const fakeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (fakeRef.current) clearInterval(fakeRef.current);

    if (progress >= 100) {
      setDisplayProgress(100);
      return;
    }

    // Target ceiling: random 90-99%, reached quickly then slows down.
    // Speed adapts to totalItems: fewer items → faster crawl.
    const ceiling = Math.floor(Math.random() * 10) + 90; // 90–99
    const items = totalItems && totalItems > 0 ? totalItems : 10;
    // Aim to hit ceiling in ~(items * 1.5) seconds. Tick every 600ms.
    const ticksToReach = (items * 1.5 * 1000) / 600;
    const stepPerTick = ceiling / ticksToReach;

    const startTimeout = setTimeout(() => {
      fakeRef.current = setInterval(() => {
        setDisplayProgress((prev) => {
          if (prev >= ceiling) {
            clearInterval(fakeRef.current!);
            return prev;
          }
          // Fast at start, slow near ceiling (ease-out)
          const remaining = ceiling - prev;
          const step = Math.max(stepPerTick * (remaining / ceiling), 0.05);
          return Math.min(prev + step, ceiling);
        });
      }, 600);
    }, 1000);

    return () => {
      clearTimeout(startTimeout);
      if (fakeRef.current) clearInterval(fakeRef.current);
    };
  }, [progress, totalItems]);

  if (!config) return null;

  return (
    <div className='space-y-4 rounded-2xl border bg-white p-6 shadow-sm'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Spinner className={cn('h-5 w-5', config.color)} />
          <span className='font-semibold text-gray-900'>{config.title}</span>
        </div>
        <ElapsedTimer running={progress < 100} startedAt={startedAt} />
      </div>

      <div className='space-y-2'>
        {config.steps.map((step) => (
          <div key={step.label} className='flex items-center gap-3'>
            <AnimatedCheck done={displayProgress >= step.threshold} />
            <span className={cn('text-sm transition-colors duration-300', displayProgress >= step.threshold ? 'text-gray-900' : 'text-gray-400')}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <div>
        <div className='mb-1 flex justify-between text-xs text-gray-500'>
          <span>Progress</span>
          <span>{Math.round(displayProgress)}%</span>
        </div>
        <div className='h-1.5 w-full overflow-hidden rounded-full bg-gray-100'>
          <div
            className={cn('h-full rounded-full transition-all duration-700', config.progressColor)}
            style={{ width: `${displayProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
