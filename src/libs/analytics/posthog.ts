import posthog from 'posthog-js';

// Client-side analytics helper
export const analytics = {
  // User identification
  identify: (userId: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      posthog.identify(userId, properties);
    }
  },

  // Track custom events
  track: (eventName: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      posthog.capture(eventName, properties);
    }
  },

  // Reset user (on logout)
  reset: () => {
    if (typeof window !== 'undefined') {
      posthog.reset();
    }
  },

  // Set user properties
  setUserProperties: (properties: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      posthog.setPersonProperties(properties);
    }
  },
};

// Event tracking helpers
export const trackEvent = {
  // Authentication events
  userSignedUp: (userId: string, email: string) => {
    analytics.track('user_signed_up', { userId, email });
  },

  userLoggedIn: (userId: string) => {
    analytics.track('user_logged_in', { userId });
  },

  userLoggedOut: () => {
    analytics.track('user_logged_out');
    analytics.reset();
  },

  // Search events
  searchStarted: (params: { namesCount: number; topK: number; filterCount: number }) => {
    analytics.track('search_started', {
      names_count: params.namesCount,
      top_k: params.topK,
      filter_count: params.filterCount,
    });
  },

  searchCompleted: (params: { namesCount: number; topK: number; filterCount: number; resultsCount: number }) => {
    analytics.track('search_completed', {
      names_count: params.namesCount,
      top_k: params.topK,
      filter_count: params.filterCount,
      results_count: params.resultsCount,
    });
  },

  searchFailed: (params: { namesCount: number; topK: number; error: string }) => {
    analytics.track('search_failed', {
      names_count: params.namesCount,
      top_k: params.topK,
      error: params.error,
    });
  },

  // Selection events
  selectionCreated: (params: { selectionId: string; itemCount: number; hasFilters: boolean }) => {
    analytics.track('selection_created', {
      selection_id: params.selectionId,
      item_count: params.itemCount,
      has_filters: params.hasFilters,
    });
  },

  selectionOpened: (params: { selectionId: string; itemCount: number }) => {
    analytics.track('selection_opened', {
      selection_id: params.selectionId,
      item_count: params.itemCount,
    });
  },

  selectionDeleted: (params: { selectionId: string }) => {
    analytics.track('selection_deleted', {
      selection_id: params.selectionId,
    });
  },

  // Q&A events
  qaStarted: (params: { selectionId: string; promptLength: number; itemsCount: number }) => {
    analytics.track('qa_started', {
      selection_id: params.selectionId,
      prompt_length: params.promptLength,
      items_count: params.itemsCount,
    });
  },

  qaCompleted: (params: { selectionId: string; itemsCount: number; duration: number }) => {
    analytics.track('qa_completed', {
      selection_id: params.selectionId,
      items_count: params.itemsCount,
      duration_ms: params.duration,
    });
  },

  qaFailed: (params: { selectionId: string; error: string }) => {
    analytics.track('qa_failed', {
      selection_id: params.selectionId,
      error: params.error,
    });
  },

  // Export events
  csvDownloaded: (params: { exportType: 'lookalike' | 'qa'; rowCount: number }) => {
    analytics.track('csv_downloaded', {
      export_type: params.exportType,
      row_count: params.rowCount,
    });
  },

  // Subscription events
  checkoutStarted: (params: { planName: string; price: number; interval: string }) => {
    analytics.track('checkout_started', {
      plan_name: params.planName,
      price: params.price,
      interval: params.interval,
    });
  },

  subscriptionCreated: (params: { planName: string; price: number; interval: string }) => {
    analytics.track('subscription_created', {
      plan_name: params.planName,
      price: params.price,
      interval: params.interval,
    });
  },

  subscriptionCancelled: (params: { planName: string }) => {
    analytics.track('subscription_cancelled', {
      plan_name: params.planName,
    });
  },
};
