import { Calendar, CreditCard, Shield } from 'lucide-react';
import Link from 'next/link';

import { ManageSubscriptionButton } from '@/components/manage-subscription-button';
import { Button } from '@/components/ui/button';
import { Price, ProductWithPrices } from '@/features/pricing/types';

interface SubscriptionCardProps {
    subscription: any | null;
    product?: ProductWithPrices;
    price?: Price;
}

export function SubscriptionCard({ subscription, product, price }: SubscriptionCardProps) {
    const planName = product?.name || 'Free Plan';
    const planPrice = price?.unit_amount ? price.unit_amount / 100 : 0;
    const interval = price?.interval || 'month';
    const status = subscription?.status || 'inactive';
    const renewalDate = subscription?.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : null;

    // Safe access to metadata
    const metadata = product?.metadata as Record<string, any> | undefined;
    const topKLimit = metadata?.top_k_limit;

    return (
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
                                <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}
                                >
                                    {status}
                                </span>
                            </div>
                            <p className="mt-1 text-gray-500">
                                {subscription
                                    ? `$${planPrice}/${interval} • ${product?.description || 'Standard features'}`
                                    : 'You are currently on the free plan.'}
                            </p>
                        </div>

                        {subscription ? (
                            <ManageSubscriptionButton />
                        ) : (
                            <Button asChild className="bg-blue-600 hover:bg-blue-700">
                                <Link href="/pricing">Upgrade Plan</Link>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Subscription Details */}
            {subscription && (
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-50 p-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Renewal Date</p>
                                <p className="font-semibold text-gray-900">{renewalDate}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-green-50 p-2">
                                <Shield className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Top-K Limit</p>
                                <p className="font-semibold text-gray-900">
                                    {topKLimit ? topKLimit.toLocaleString() : 'Unlimited'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-purple-50 p-2">
                                <CreditCard className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Billing</p>
                                <p className="font-semibold text-gray-900 capitalize">{interval}ly</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
