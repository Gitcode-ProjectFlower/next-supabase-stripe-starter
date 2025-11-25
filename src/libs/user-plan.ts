import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export type UserPlan = 'small' | 'medium' | 'large' | null;

export async function getUserPlan(userId: string): Promise<UserPlan> {
  const supabase = await createSupabaseServerClient();

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('metadata, prices(products(metadata))')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (error || !subscription) {
    return null;
  }

  const productMetadata = (subscription.prices as any)?.products?.metadata;
  const planName = productMetadata?.plan_name as UserPlan;

  return planName || null;
}

export function getPlanCap(plan: UserPlan): number {
  const capsByPlan = {
    small: 100,
    medium: 500,
    large: 5000,
  };

  return plan ? capsByPlan[plan] : 100;
}


export function getVisibleColumns(plan: UserPlan): string[] {
  if (!plan) {
    return ['name', 'city', 'sectors', 'experience_years'];
  }

  const columnsByPlan = {
    small: ['name', 'city', 'street', 'sectors', 'experience_years'],
    medium: ['name', 'email', 'phone', 'city', 'street', 'sectors', 'experience_years'],
    large: ['name', 'email', 'phone', 'city', 'street', 'sectors', 'experience_years', 'similarity'],
  };

  return columnsByPlan[plan] || columnsByPlan.small;
}

export function maskFields(
  items: any[],
  plan: UserPlan
): any[] {
  const visibleColumns = getVisibleColumns(plan);

  return items.map(item => {
    const masked: any = {};

    visibleColumns.forEach(col => {
      if (item[col] !== undefined) {
        masked[col] = item[col];
      }
    });

    if (item.doc_id) {
      masked.doc_id = item.doc_id;
    }

    return masked;
  });
}
