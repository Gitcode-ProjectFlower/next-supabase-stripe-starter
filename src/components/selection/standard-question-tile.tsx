'use client';

import { BarChart2, FileText, MessageSquare, Target } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export interface StandardQuestionConfig {
  id: '1' | '2' | '3' | '4';
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

export const STANDARD_QUESTIONS: StandardQuestionConfig[] = [
  {
    id: '1',
    title: 'Sales Priority Score',
    description: 'Score each company 1-5 based on how well it fits your Ideal Customer Profile.',
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: '2',
    title: 'Market Segmentation',
    description: 'Automatically segment companies by customer type, geography, and other dimensions.',
    icon: BarChart2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: '3',
    title: 'Account Intelligence Brief',
    description: 'Generate a full ABM brief with buying signals, entry points, and outreach hooks.',
    icon: FileText,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    id: '4',
    title: 'Personalised Outreach',
    description: 'Write a personalised cold email or LinkedIn message for each company.',
    icon: MessageSquare,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
];

interface StandardQuestionTileProps {
  config: StandardQuestionConfig;
  onRun: (sqId: '1' | '2' | '3' | '4') => void;
  disabled?: boolean;
}

export function StandardQuestionTile({ config, onRun, disabled }: StandardQuestionTileProps) {
  const Icon = config.icon;

  return (
    <div className='flex flex-col justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md'>
      <div className='flex items-start gap-3'>
        <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', config.bgColor)}>
          <Icon className={cn('h-5 w-5', config.color)} />
        </div>
        <div>
          <p className='text-sm font-semibold text-gray-900'>{config.title}</p>
          <p className='mt-0.5 text-xs text-gray-500'>{config.description}</p>
        </div>
      </div>
      <Button
        size='sm'
        variant='outline'
        className='w-full rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50'
        onClick={() => onRun(config.id)}
        disabled={disabled}
      >
        Run
      </Button>
    </div>
  );
}
