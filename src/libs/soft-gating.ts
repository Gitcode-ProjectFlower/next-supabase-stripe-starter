import type { UserPlan } from './plan-config';

export function canSaveSelection(plan: UserPlan): boolean {
  return plan !== 'anonymous' && plan !== null;
}

export function canGenerateQA(plan: UserPlan): boolean {
  return plan !== 'anonymous' && plan !== null;
}

export function canScrollBeyondPreview(plan: UserPlan): boolean {
  return plan !== 'anonymous' && plan !== null;
}

export function canExportCSV(plan: UserPlan): boolean {
  return plan !== 'anonymous' && plan !== null;
}

export function getMaxVisibleResults(plan: UserPlan): number {
  if (plan === 'anonymous' || plan === null) {
    return 3;
  }

  return 10000;
}

export function requiresUpgrade(plan: UserPlan, feature: 'save' | 'qa' | 'scroll' | 'export'): boolean {
  if (plan === 'anonymous' || plan === null) {
    return true;
  }

  switch (feature) {
    case 'save':
      return !canSaveSelection(plan);
    case 'qa':
      return !canGenerateQA(plan);
    case 'scroll':
      return !canScrollBeyondPreview(plan);
    case 'export':
      return !canExportCSV(plan);
    default:
      return false;
  }
}
