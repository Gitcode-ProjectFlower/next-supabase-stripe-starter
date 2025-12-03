import { PostHog } from 'posthog-node';

// Server-side PostHog client
export const posthogServer = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
});

// Server-side event tracking
export const trackServerEvent = {
    // Checkout events
    checkoutStarted: (params: {
        userId: string;
        planName: string;
        price: number;
        interval: string;
    }) => {
        posthogServer.capture({
            distinctId: params.userId,
            event: 'checkout_started',
            properties: {
                plan_name: params.planName,
                price: params.price,
                interval: params.interval,
            },
        });
    },

    // Subscription events (from webhooks)
    subscriptionCreated: (params: {
        userId: string;
        planName: string;
        price: number;
        interval: string;
    }) => {
        posthogServer.capture({
            distinctId: params.userId,
            event: 'subscription_created',
            properties: {
                plan_name: params.planName,
                price: params.price,
                interval: params.interval,
            },
        });
    },

    subscriptionUpdated: (params: {
        userId: string;
        planName: string;
        price: number;
        interval: string;
    }) => {
        posthogServer.capture({
            distinctId: params.userId,
            event: 'subscription_updated',
            properties: {
                plan_name: params.planName,
                price: params.price,
                interval: params.interval,
            },
        });
    },

    subscriptionCancelled: (params: { userId: string; planName: string }) => {
        posthogServer.capture({
            distinctId: params.userId,
            event: 'subscription_cancelled',
            properties: {
                plan_name: params.planName,
            },
        });
    },

    // Search events (from API)
    searchCompleted: (params: {
        userId: string;
        namesCount: number;
        topK: number;
        filterCount: number;
        resultsCount: number;
    }) => {
        posthogServer.capture({
            distinctId: params.userId,
            event: 'search_completed',
            properties: {
                names_count: params.namesCount,
                top_k: params.topK,
                filter_count: params.filterCount,
                results_count: params.resultsCount,
            },
        });
    },

    // Selection events (from API)
    selectionCreated: (params: {
        userId: string;
        selectionId: string;
        itemCount: number;
        hasFilters: boolean;
    }) => {
        posthogServer.capture({
            distinctId: params.userId,
            event: 'selection_created',
            properties: {
                selection_id: params.selectionId,
                item_count: params.itemCount,
                has_filters: params.hasFilters,
            },
        });
    },

    // Q&A events (from Inngest)
    qaCompleted: (params: {
        userId: string;
        selectionId: string;
        itemsCount: number;
        duration: number;
    }) => {
        posthogServer.capture({
            distinctId: params.userId,
            event: 'qa_completed',
            properties: {
                selection_id: params.selectionId,
                items_count: params.itemsCount,
                duration_ms: params.duration,
            },
        });
    },
};

// Ensure events are flushed before process exits
export async function shutdownPostHog() {
    await posthogServer.shutdown();
}
