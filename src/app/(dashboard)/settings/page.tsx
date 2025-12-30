import { redirect } from 'next/navigation';

import { SubscriptionCard } from '@/components/subscription-card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { UsageMeter } from '@/components/usage/usage-meter';
import { getNotificationPreference } from '@/features/account/controllers/get-notification-preference';
import { getSession } from '@/features/account/controllers/get-session';
import { getSubscription } from '@/features/account/controllers/get-subscription';
import { getProducts } from '@/features/pricing/controllers/get-products';
import { Price, ProductWithPrices } from '@/features/pricing/types';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { getUserPlan } from '@/libs/user-plan';
import { DownloadsSection } from '../../../components/settings/downloads-section';
import { GeneralSection } from '../../../components/settings/general-section';
import { NotificationsSection } from '../../../components/settings/notifications-section';
import { PlanSelector } from '../../../components/settings/plan-selector';
import { SettingsNav } from '../../../components/settings/settings-nav';

interface SettingsPageProps {
  searchParams: Promise<{ success?: string; tab?: string; error?: string }>;
}

/**
 * Settings page - Server component that fetches user data and renders settings sections
 */
export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  // If success=true, check Stripe as fallback in case webhook hasn't processed yet
  const shouldCheckStripe = params?.success === 'true';
  const [session, subscription, products] = await Promise.all([
    getSession(),
    getSubscription(shouldCheckStripe),
    getProducts(),
  ]);

  if (!session) {
    redirect('/login');
  }

  // Get user plan, notification preference, and downloads count
  let userPlan: Awaited<ReturnType<typeof getUserPlan>> = 'free_tier';
  let emailNotificationsEnabled = false;
  let downloadsCount = 0;

  try {
    const supabase = await createSupabaseServerClient();

    [userPlan, emailNotificationsEnabled] = await Promise.all([
      getUserPlan(session.user.id, shouldCheckStripe),
      getNotificationPreference(session.user.id),
    ]);

    // Fetch count of non-expired downloads
    const { count, error: downloadsError } = await supabase
      .from('downloads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .gt('expires_at', new Date().toISOString());

    if (downloadsError) {
      console.error('[Settings Page] Error fetching downloads count:', downloadsError);
    } else {
      downloadsCount = count || 0;
    }
  } catch (error) {
    console.error('[Settings Page] Error fetching user plan or preferences:', error);
    // userPlan defaults to 'free_tier' if getUserPlan fails
  }

  // Find user's product and price
  let userProduct: ProductWithPrices | undefined;
  let userPrice: Price | undefined;

  if (subscription && subscription.price_id) {
    for (const product of products) {
      for (const price of product.prices) {
        if (price.id === subscription.price_id) {
          userProduct = product;
          userPrice = price;
          break;
        }
      }
      if (userProduct) break;
    }
  }

  console.log('userPlan', userPlan);

  const defaultTab = params?.tab || 'general';

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>Settings</h1>
          <p className='mt-2 text-gray-600'>Manage your account settings and preferences.</p>
        </div>

        {/* Success/Error Messages */}
        {params?.success && (
          <div className='mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800'>
            <p className='font-medium'>Subscription updated successfully!</p>
          </div>
        )}

        {params?.error === 'same-plan' && (
          <div className='mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800'>
            <p className='font-medium'>You are already subscribed to this plan.</p>
          </div>
        )}

        {params?.error === 'use-portal' && (
          <div className='mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800'>
            <p className='font-medium'>
              To change your plan, please use the &quot;Manage Subscription&quot; button below.
            </p>
          </div>
        )}

        {/* Main Content with Tabs */}
        <Tabs defaultValue={defaultTab} className='mx-auto grid w-full grid-cols-12 gap-6 py-6'>
          <SettingsNav currentTab={defaultTab} />

          <div className='col-span-12 space-y-6 md:col-span-9'>
            {/* General Tab */}
            <TabsContent value='general' className='mt-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm'>
              <GeneralSection
                userEmail={session.user.email!}
                userId={session.user.id}
                userPlan={userPlan}
                downloadsCount={downloadsCount}
                emailNotificationsEnabled={emailNotificationsEnabled}
              />
            </TabsContent>

            {/* Plan Tab */}
            <TabsContent value='plan' className='mt-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm'>
              <div className='space-y-4'>
                <PlanSelector products={products} currentPriceId={subscription?.price_id ?? null} />
                <SubscriptionCard subscription={subscription} product={userProduct} price={userPrice} />
              </div>
            </TabsContent>

            {/* Usage & Limits Tab */}
            <TabsContent value='limits' className='mt-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm'>
              <div className='space-y-4'>
                <h2 className='mb-6 text-lg font-semibold text-gray-900'>Usage & Limits</h2>
                <p className='mb-6 text-sm text-gray-600'>
                  Track your usage for the current 30-day period. Limits reset on a rolling basis.
                </p>
                <UsageMeter />
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent
              value='notifications'
              className='mt-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm'
            >
              <NotificationsSection initialEmailNotifications={emailNotificationsEnabled} />
            </TabsContent>

            {/* Downloads Tab */}
            <TabsContent value='downloads' className='mt-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm'>
              <div className='space-y-4'>
                <h2 className='mb-4 text-lg font-semibold text-gray-900'>Ready to download</h2>
                <DownloadsSection />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
