import { UserPlan } from './plan-config';

export const PLAN_UI = {
  small: {
    label: 'Small',
    description: 'Top-K up to 100',
  },
  medium: {
    label: 'Medium',
    description: 'Top-K up to 500',
  },
  large: {
    label: 'Large',
    description: 'Top-K up to 5,000',
  },
} as const;

export type PaidPlan = keyof typeof PLAN_UI;

/**
 * Map backend/user plan → UI plan
 */
export function toPaidPlan(plan: UserPlan): PaidPlan | null {
  if (plan === 'small' || plan === 'medium' || plan === 'large') {
    return plan;
  }
  if (plan === 'promo_medium') return 'medium';
  return null;
}
