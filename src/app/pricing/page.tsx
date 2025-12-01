import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { createCheckoutAction } from '@/features/pricing/actions/create-checkout-action';

const PLANS = [
  {
    name: 'Small',
    topK: 100,
    price: 29,
    interval: 'month',
    features: [
      'Up to 100 results per search',
      'Basic similarity search',
      'Q&A on selected candidates',
      'CSV export',
      'Email support',
    ],
  },
  {
    name: 'Medium',
    topK: 500,
    price: 99,
    interval: 'month',
    popular: true,
    features: [
      'Up to 500 results per search',
      'Advanced similarity search',
      'Q&A on selected candidates',
      'CSV export',
      'Priority email support',
      'Advanced filters',
    ],
  },
  {
    name: 'Large',
    topK: 5000,
    price: 299,
    interval: 'month',
    features: [
      'Up to 5,000 results per search',
      'Premium similarity search',
      'Q&A on selected candidates',
      'CSV export',
      'Priority support',
      'Advanced filters',
      'API access',
    ],
  },
] as const;

export default async function PricingPage() {
  const supabase = await createSupabaseServerClient();

  // Fetch products and prices from Stripe
  const { data: products } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .order('metadata->index')
    .order('unit_amount', { referencedTable: 'prices' });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Pricing</h1>
          <p className="mt-2 text-gray-600">
            Choose the plan that fits your needs. Upgrade or downgrade at any time.
          </p>
        </div>
      </header>

      {/* Pricing Cards */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan, idx) => {
            // Find matching product from database
            const product = products?.find((p) => p.name === plan.name);
            const price = product?.prices?.find((p) => p.interval === 'month');

            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${plan.popular ? 'border-blue-600 ring-2 ring-blue-600' : ''
                  }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">
                      ${price?.unit_amount ? price.unit_amount / 100 : plan.price}
                    </span>
                    <span className="text-gray-600">/month</span>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-sm text-gray-600">Top-K Limit</div>
                    <div className="text-2xl font-bold text-gray-900">{plan.topK}</div>
                    <div className="text-xs text-gray-500">results per search</div>
                  </div>
                </div>

                <ul className="mb-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 shrink-0 text-green-600" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <form action={createCheckoutAction}>
                  {price && <input type="hidden" name="priceId" value={price.id} />}
                  <Button
                    type="submit"
                    className={`w-full ${plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-900 hover:bg-black'
                      }`}
                    disabled={!price}
                  >
                    {price ? 'Subscribe' : 'Coming Soon'}
                  </Button>
                </form>
              </div>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-12 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">Can I change my plan later?</h3>
              <p className="mt-1 text-sm text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time from your account settings.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">What is Top-K?</h3>
              <p className="mt-1 text-sm text-gray-600">
                Top-K is the maximum number of candidate results you can retrieve per search. Higher
                limits allow you to cast a wider net.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">How does billing work?</h3>
              <p className="mt-1 text-sm text-gray-600">
                All plans are billed monthly. You can manage your subscription and payment methods
                through the Stripe Customer Portal in your account settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
