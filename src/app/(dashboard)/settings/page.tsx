import { redirect } from 'next/navigation';

import { SubscriptionCard } from '@/components/subscription-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSession } from '@/features/account/controllers/get-session';
import { getSubscription } from '@/features/account/controllers/get-subscription';
import { getProducts } from '@/features/pricing/controllers/get-products';
import { Price, ProductWithPrices } from '@/features/pricing/types';

export default async function SettingsPage({
    searchParams,
}: {
    searchParams: Promise<{ success?: string; tab?: string; error?: string }>;
}) {
    const params = await searchParams;
    const [session, subscription, products] = await Promise.all([
        getSession(),
        getSubscription(),
        getProducts(),
    ]);

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

    const defaultTab = params?.tab || 'general';

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                    <p className="mt-2 text-gray-600">Manage your account settings and preferences.</p>
                </div>

                {params?.success && (
                    <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-800 border border-green-200">
                        <p className="font-medium">Subscription updated successfully!</p>
                    </div>
                )}

                {params?.error === 'same-plan' && (
                    <div className="mb-6 rounded-lg bg-yellow-50 p-4 text-yellow-800 border border-yellow-200">
                        <p className="font-medium">You are already subscribed to this plan.</p>
                    </div>
                )}

                {params?.error === 'use-portal' && (
                    <div className="mb-6 rounded-lg bg-blue-50 p-4 text-blue-800 border border-blue-200">
                        <p className="font-medium">
                            To change your plan, please use the &quot;Manage Subscription&quot; button below.
                        </p>
                    </div>
                )}

                <Tabs defaultValue={defaultTab} className="space-y-6">
                    <TabsList className="bg-white border border-gray-200">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="plan">Plan</TabsTrigger>
                        <TabsTrigger value="downloads">Downloads</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-6">
                        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Email</label>
                                    <p className="mt-1 text-gray-900">{session.user.email}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">User ID</label>
                                    <p className="mt-1 text-sm text-gray-500 font-mono">{session.user.id}</p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="plan" className="space-y-6">
                        <SubscriptionCard subscription={subscription} product={userProduct} price={userPrice} />
                    </TabsContent>

                    <TabsContent value="downloads" className="space-y-6">
                        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Export History</h2>
                            {/* TODO: Fetch downloads from database */}
                            <p className="text-gray-600 text-sm">
                                Your CSV exports will appear here. Exports are available for 7 days after generation.
                            </p>
                            <div className="mt-4 text-sm text-gray-500">
                                <p>• Click &quot;Export CSV&quot; on any selection to generate a download</p>
                                <p>• You&apos;ll receive an email when your export is ready</p>
                                <p>• Downloads expire after 7 days</p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
