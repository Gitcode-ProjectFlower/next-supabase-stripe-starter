import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/components/ui/use-toast';

function toastState(title: string): string | null {
  const el = screen.queryByText(title)?.closest('[data-state]');
  // null = fully unmounted (Radix skips the exit frame without CSS animations)
  return el?.getAttribute('data-state') ?? null;
}

describe('toast auto-dismiss', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('dismisses by default after 8s without interaction', () => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Boom' });
    });
    expect(toastState('Boom')).toBe('open');
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(toastState('Boom')).not.toBe('open');
  });

  it('honours a custom autoDismissMs shorter than the Radix default', () => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Quick', autoDismissMs: 1000 });
    });
    expect(toastState('Quick')).toBe('open');
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(toastState('Quick')).not.toBe('open');
  });
});
