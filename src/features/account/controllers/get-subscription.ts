import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export async function getSubscription() {
  const supabase = await createSupabaseServerClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .eq('user_id', user.id)
    .in('status', ['trialing', 'active'])
    .order('created', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[getSubscription] Error fetching subscription:', {
      error,
      userId: user.id,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }

  return data;
}
