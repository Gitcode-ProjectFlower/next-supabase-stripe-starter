'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useRef, useState, type ReactNode } from 'react';

export function PricingCarousel({ children, count }: { children: ReactNode; count: number }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const scrollToIndex = useCallback(
    (i: number) => {
      const strip = stripRef.current;
      if (!strip) return;
      const clamped = Math.max(0, Math.min(count - 1, i));
      const card = strip.children[clamped] as HTMLElement | undefined;
      if (!card) return;
      const stripRect = strip.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      strip.scrollTo({
        left: strip.scrollLeft + (cardRect.left + cardRect.width / 2) - (stripRect.left + stripRect.width / 2),
        behavior: 'smooth',
      });
      setIndex(clamped);
    },
    [count]
  );

  const handleScroll = useCallback(() => {
    const strip = stripRef.current;
    if (!strip || strip.children.length === 0) return;
    const stripRect = strip.getBoundingClientRect();
    const mid = stripRect.left + stripRect.width / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(strip.children).forEach((child, i) => {
      const r = (child as HTMLElement).getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setIndex(best);
  }, []);

  return (
    <div className='relative'>
      <div
        ref={stripRef}
        onScroll={handleScroll}
        className='flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-5 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:pb-0 md:pt-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden'
      >
        {children}
      </div>
      {index > 0 && (
        <button
          type='button'
          aria-label='Previous plan'
          onClick={() => scrollToIndex(index - 1)}
          className='absolute left-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition hover:bg-gray-50 active:scale-95 md:hidden'
        >
          <ChevronLeft className='h-5 w-5 text-gray-700' />
        </button>
      )}
      {index < count - 1 && (
        <button
          type='button'
          aria-label='Next plan'
          onClick={() => scrollToIndex(index + 1)}
          className='absolute right-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition hover:bg-gray-50 active:scale-95 md:hidden'
        >
          <ChevronRight className='h-5 w-5 text-gray-700' />
        </button>
      )}
    </div>
  );
}
