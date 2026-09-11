'use client';

import { useEffect, useRef } from 'react';

export function useSyncedTopScrollbar(deps: unknown[] = []) {
  const topRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  useEffect(() => {
    const top = topRef.current;
    const main = mainRef.current;
    const spacer = spacerRef.current;
    if (!top || !main || !spacer) return;

    // shadcn Table renders its own `div.overflow-auto` wrapper around <table>.
    // That inner wrapper is the element that actually scrolls horizontally;
    // mainRef only sizes the outer container and never overflows itself.
    const table = main.querySelector('table');
    const view = table?.parentElement instanceof HTMLElement ? table.parentElement : main;

    // The bar shows whenever the table overflows and hides otherwise:
    // an empty track on a fitting table is noise, not signal (platform
    // convention). Discoverability — the point of the brief — holds exactly
    // when there is something to scroll to.
    // Accepted deviation: the bar sits above the table, not between the header
    // and the rows — thead/tbody share one <table>, so an external synced div
    // cannot be placed between them without breaking it.
    const syncWidth = () => {
      spacer.style.width = `${view.scrollWidth}px`;
      top.style.display = view.scrollWidth > view.clientWidth + 1 ? 'block' : 'none';
    };
    syncWidth();

    const onTopScroll = () => {
      if (syncing.current) return;
      syncing.current = true;
      view.scrollLeft = top.scrollLeft;
      requestAnimationFrame(() => {
        syncing.current = false;
      });
    };
    const onViewScroll = () => {
      if (syncing.current) return;
      syncing.current = true;
      top.scrollLeft = view.scrollLeft;
      requestAnimationFrame(() => {
        syncing.current = false;
      });
    };

    const observer = new ResizeObserver(syncWidth);
    observer.observe(main);
    if (table) observer.observe(table);

    top.addEventListener('scroll', onTopScroll, { passive: true });
    view.addEventListener('scroll', onViewScroll, { passive: true });
    return () => {
      observer.disconnect();
      top.removeEventListener('scroll', onTopScroll);
      view.removeEventListener('scroll', onViewScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { topRef, mainRef, spacerRef };
}

export function TopScrollbar({
  topRef,
  spacerRef,
}: {
  topRef: React.RefObject<HTMLDivElement | null>;
  spacerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={topRef} className='top-scrollbar overflow-x-scroll border-b border-gray-100'>
      <div ref={spacerRef} className='h-px' />
    </div>
  );
}
