'use client';

import { BarChart2, FileText, MessageSquare, Target } from 'lucide-react';

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
    description: 'Ranks companies based on fit and commercial potential.',
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: '2',
    title: 'Market Segmentation',
    description: 'Classify companies across key market dimensions.',
    icon: BarChart2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: '3',
    title: 'Account Intelligence Brief',
    description: 'Get prepared for your first sales conversation – in one click.',
    icon: FileText,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    id: '4',
    title: 'Personalized Outreach Message',
    description: 'Create a personalized first message based on the company\'s priorities.',
    icon: MessageSquare,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
];

interface StandardQuestionTileProps {
  config: StandardQuestionConfig;
  onRun: (sqId: '1' | '2' | '3' | '4') => void;
  disabled?: boolean;
  secondary?: boolean;
}

export function StandardQuestionTile({ config, onRun, disabled, secondary }: StandardQuestionTileProps) {
  const Icon = config.icon;

  return (
    <button
      type='button'
      disabled={disabled}
      onClick={() => onRun(config.id)}
      className={cn(
        'flex flex-col rounded-2xl border bg-white text-left transition-all cursor-pointer',
        secondary
          ? 'gap-1.5 p-3 border-gray-100 hover:shadow-sm hover:bg-gray-50'
          : 'gap-2 p-4 border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <div className={cn(
        'flex flex-shrink-0 items-center justify-center rounded-lg',
        secondary ? 'h-7 w-7' : 'h-9 w-9',
        config.bgColor
      )}>
        <Icon className={cn(secondary ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5', config.color)} />
      </div>
      <div>
        <p className={cn('font-semibold text-gray-900 truncate', secondary ? 'text-xs' : 'text-sm')}>{config.title}</p>
        <p className={cn('mt-0.5 text-gray-500 line-clamp-2', secondary ? 'text-[11px]' : 'text-xs')}>{config.description}</p>
      </div>
    </button>
  );
}
