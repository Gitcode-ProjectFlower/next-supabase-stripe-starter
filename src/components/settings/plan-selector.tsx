'use client';

import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import type { Price, ProductWithPrices } from '@/features/pricing/types'
import { PLAN_CONFIGS, type UserPlan } from '@/libs/plan-config'

type PlanChoice = {
  productId: string;
  priceId: string;
  displayName: string;
  description?: string;
  amount: string;
  interval?: string;
  planKey?: UserPlan;
  topKCap?: number;
};

interface PlanSelectorProps {
  products: ProductWithPrices[];
  currentPriceId?: string | null;
}

/**
 * Inline plan selector that lets a user switch plans directly from settings.
 * Falls back to the existing Stripe subscription flow via a server API call.
 */
export function PlanSelector({ products, currentPriceId }: PlanSelectorProps) {
  const choices = useMemo<PlanChoice[]>(() => {
    const items: PlanChoice[] = [];

    products.forEach((product) => {
      product.prices.forEach((price: Price) => {
        const planKey = normalizePlanName(
          (product.metadata as Record<string, any> | null | undefined)?.plan_name || product.name
        ) as UserPlan | undefined;

        const topKCap = planKey && planKey in PLAN_CONFIGS ? PLAN_CONFIGS[planKey].topKLimit : undefined;

        items.push({
          productId: product.id,
          priceId: price.id,
          displayName: product.name || 'Plan',
          description: product.description || undefined,
          amount: formatAmount(price.unit_amount, price.currency, price.interval),
          interval: price.interval || undefined,
          planKey,
          topKCap,
        });
      });
    });

    // Sort by price if available
    return items.sort((a, b) => {
      const getAmount = (choice: PlanChoice) => parseInt(choice.amount.replace(/[^0-9]/g, ''), 10) || 0;
      return getAmount(a) - getAmount(b);
    });
  }, [products]);

  // Initialize with current price ID if available
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(currentPriceId || null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Update selected price when currentPriceId changes
  useEffect(() => {
    if (currentPriceId) {
      setSelectedPriceId(currentPriceId);
    }
  }, [currentPriceId]);

  const handleSave = async () => {
    if (!selectedPriceId) {
      setError('Please select a plan');
      return;
    }

    // Don't allow saving if it's the same as current plan
    if (selectedPriceId === currentPriceId) {
      setError('This is already your current plan');
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId: selectedPriceId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change plan');
      }

      const data = await res.json();

      if (data.checkoutUrl) {
        // No active subscription: redirect to Stripe Checkout
        window.location.href = data.checkoutUrl;
        return;
      }

      setMessage('Plan updated successfully! Reloading...');
      // Refresh page to show updated subscription/plan
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to change plan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className='rounded-2xl border bg-white p-4 shadow-sm'>
      <h2 className='mb-3 text-lg font-semibold text-gray-900'>Plan</h2>
      <p className='mb-3 text-sm text-gray-600'>Choose your plan. Changes apply immediately to caps and limits.</p>

      <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
        {choices.map((choice) => {
          const isCurrentPlan = currentPriceId === choice.priceId;
          const isSelected = selectedPriceId === choice.priceId;

          return (
            <label
              key={choice.priceId}
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                isCurrentPlan
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : isSelected
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className='flex items-start gap-3'>
                <input
                  type='radio'
                  name='plan'
                  className='mt-1'
                  checked={isSelected}
                  onChange={() => setSelectedPriceId(choice.priceId)}
                />
                <div className='flex-1'>
                  <div className='flex items-center gap-2'>
                    <div className='font-semibold text-gray-900'>{choice.displayName}</div>
                    {isCurrentPlan && (
                      <span className='rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white'>
                        Current
                      </span>
                    )}
                  </div>
                  {choice.description ? <div className='text-sm text-gray-600'>{choice.description}</div> : null}
                  <div className='mt-1 text-sm text-gray-700'>
                    {choice.amount}
                    {choice.interval ? ` / ${choice.interval}` : ''}
                  </div>
                  {choice.topKCap ? <div className='text-xs text-gray-500'>Top‑K up to {choice.topKCap}</div> : null}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <div className='mt-4 flex items-center gap-2'>
        <Button
          onClick={handleSave}
          disabled={!selectedPriceId || isSaving}
          className='rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black disabled:opacity-50'
        >
          {isSaving ? 'Saving...' : 'Save changes'}
        </Button>
        {selectedPriceId ? (
          <span className='text-xs text-gray-600'>
            Top‑K cap will update to{' '}
            {choices.find((c) => c.priceId === selectedPriceId)?.topKCap ?? 'the selected plan limit'}
          </span>
        ) : null}
      </div>

      {message ? <p className='mt-2 text-xs text-green-600'>{message}</p> : null}
      {error ? <p className='mt-2 text-xs text-red-600'>{error}</p> : null}
    </section>
  );
}

function formatAmount(amount?: number | null, currency?: string | null, interval?: string | null) {
  if (amount == null) return 'N/A';
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
    minimumFractionDigits: 0,
  });
  return formatter.format(amount / 100);
}

function normalizePlanName(name?: string | null): string | undefined {
  if (!name) return undefined;
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}
