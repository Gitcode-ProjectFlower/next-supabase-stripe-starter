import { PropsWithChildren, ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CreditCard, Calendar, Shield, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getSession } from '@/features/account/controllers/get-session';
import { getSubscription } from '@/features/account/controllers/get-subscription';
import { getProducts } from '@/features/pricing/controllers/get-products';
import { Price, ProductWithPrices } from '@/features/pricing/types';

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
  const [session, subscription, products] = await Promise.all([getSession(), getSubscription(), getProducts()]);

  if (!session) {
    redirect('/login');
  }

  let userProduct: ProductWithPrices | undefined;
  let userPrice: Price | undefined;

  if (subscription) {
    for (const product of products) {
      for (const price of product.prices) {
        if (price.id === subscription.price_id) {
          userProduct = product;
          userPrice = price;
        }
      }
    }
  }

  const planName = userProduct?.name || 'Free Plan';
  const planPrice = userPrice?.unit_amount ? userPrice.unit_amount / 100 : 0;
  const interval = userPrice?.interval || 'month';
  const status = subscription?.status || 'inactive';
  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    : null;

  // Safe access to metadata
  const metadata = userProduct?.metadata as Record<string, any> | undefined;
  const topKLimit = metadata?.top_k_limit;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Resumatch
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/selections" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                My Selections
              </Link>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                {session.user.email?.[0].toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="mt-2 text-gray-600">Manage your subscription and billing details.</p>
        </div>

        {params?.success && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-800 border border-green-200">
            <p className="font-medium">Subscription updated successfully!</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Subscription Card */}
          <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200">
            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-500" />
                <h2 className="font-semibold text-gray-900">Subscription Plan</h2>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-gray-900">{planName}</h3>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize
                      ${status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {status}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-500">
                    {subscription
                      ? `$${planPrice}/${interval} • ${userProduct?.description || 'Standard features'}`
                      : 'You are currently on the free plan.'}
                  </p>
                </div>

                {subscription ? (
                  <Button variant="outline" asChild>
                    <Link href="/manage-subscription">Manage Subscription</Link>
                  </Button>
                ) : (
                  <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/pricing">Upgrade Plan</Link>
                  </Button>
                )}
              </div>

              {subscription && (
                <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Calendar className="h-4 w-4" />
                      <span>Renewal Date</span>
                    </div>
                    <p className="font-medium text-gray-900">
                      {renewalDate || 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Shield className="h-4 w-4" />
                      <span>Plan Limits</span>
                    </div>
                    <p className="font-medium text-gray-900">
                      {topKLimit
                        ? `Top-K: ${topKLimit}`
                        : 'Standard Limits'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Profile Card */}
          <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200">
            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-500" />
                <h2 className="font-semibold text-gray-900">Profile Details</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email Address</label>
                  <p className="mt-1 text-gray-900">{session.user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">User ID</label>
                  <p className="mt-1 font-mono text-sm text-gray-600">{session.user.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
