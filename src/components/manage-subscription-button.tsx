'use client';

import { Button } from '@/components/ui/button';

export function ManageSubscriptionButton() {
  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
      });
      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to open portal:', error);
    }
  };

  return (
    <Button variant='outline' onClick={handleManageSubscription}>
      Manage Subscription
    </Button>
  );
}
