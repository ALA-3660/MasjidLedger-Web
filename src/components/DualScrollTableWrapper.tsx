import React, { useRef, useState, useEffect, useCallback } from 'react';

interface DualScrollTableWrapperProps {
  children: React.ReactNode;
  className?: string;
  maxHeightClassName?: string;
  minTableWidthClassName?: string;
}

/**
 * DualScrollTableWrapper
 * Provides:
 * 1. Top Horizontal Sliding Bar (উপরে ডানে-বামে স্লাইড করার বার) with left/right arrows & draggable thumb
 * 2. Right Vertical Sliding Bar (ডান পাশে উপরে-নিচে স্লাইড করার বার) with up/down arrows & draggable thumb
 * 3. Bottom Horizontal Native Scrollbar (নিচে ডানে-বামে স্লাইড করার বার)
 * 4. Sticky table header (<thead>) while scrolling vertically
 */
export const DualScrollTableWrapper: React.FC<DualScrollTableWrapperProps> = ({
  children,
  className = '',
  maxHeightClassName = 'max-h-[62vh]',
  minTableWidthClassName = '[&_table]:min-w-[1050px]',
}) => {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const hTrackRef = useRef<HTMLDivElement>(null);
  const vTrackRef = useRef<HTMLDivElement>(null);

  // Horizontal scroll metrics
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollWidth, setScrollWidth] = useState(1000);
  const [clientWidth, setClientWidth] = useState(1000);

  // Vertical scroll metrics
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(500);
  const [clientHeight, setClientHeight] = useState(500);

  // Dragging state
  const [isDraggingH, setIsDraggingH] = useState(false);
  const [isDraggingV, setIsDraggingV] = useState(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
  }>({
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });

  const updateMetrics = useCallback(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    setScrollLeft(el.scrollLeft);
    setScrollWidth(Math.max(el.scrollWidth, el.clientWidth));
    setClientWidth(el.clientWidth);
    setScrollTop(el.scrollTop);
    setScrollHeight(Math.max(el.scrollHeight, el.clientHeight));
    setClientHeight(el.clientHeight);
  }, []);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;

    updateMetrics();

    const resizeObserver = new ResizeObserver(() => {
      updateMetrics();
    });
    resizeObserver.observe(el);

    const tableEl = el.querySelector('table');
    if (tableEl) {
      resizeObserver.observe(tableEl);
    }

    const mutationObserver = new MutationObserver(() => {
      updateMetrics();
    });
    mutationObserver.observe(el, { childList: true, subtree: true });

    window.addEventListener('resize', updateMetrics);
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', updateMetrics);
    };
  }, [updateMetrics, children]);

  const handleContainerScroll = () => {
    updateMetrics();
  };

  // Horizontal calculations
  const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);
  const hThumbRatio = scrollWidth > 0 ? Math.min(1, clientWidth / scrollWidth) : 1;
  const hThumbWidthPercent = Math.max(15, Math.min(100, hThumbRatio * 100));
  const hThumbLeftPercent =
    maxScrollLeft > 0
      ? (scrollLeft / maxScrollLeft) * (100 - hThumbWidthPercent)
      : 0;

  // Vertical calculations
  const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
  const vThumbRatio = scrollHeight > 0 ? Math.min(1, clientHeight / scrollHeight) : 1;
  const vThumbHeightPercent = Math.max(15, Math.min(100, vThumbRatio * 100));
  const vThumbTopPercent =
    maxScrollTop > 0
      ? (scrollTop / maxScrollTop) * (100 - vThumbHeightPercent)
      : 0;

  // Scroll step helpers
  const scrollByHorizontal = (delta: number) => {
    const el = tableContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const scrollByVertical = (delta: number) => {
    const el = tableContainerRef.current;
    if (!el) return;
    el.scrollBy({ top: delta, behavior: 'smooth' });
  };

  // Horizontal Track Click
  const handleHTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingH) return;
    const track = hTrackRef.current;
    const el = tableContainerRef.current;
    if (!track || !el) return;

    const rect = track.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetScroll = clickRatio * Math.max(0, el.scrollWidth - el.clientWidth);
    el.scrollTo({ left: targetScroll, behavior: 'smooth' });
  };

  // Vertical Track Click
  const handleVTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingV) return;
    const track = vTrackRef.current;
    const el = tableContainerRef.current;
    if (!track || !el) return;

    const rect = track.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const targetScroll = clickRatio * Math.max(0, el.scrollHeight - el.clientHeight);
    el.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  // Horizontal Thumb Drag
  const handleHThumbMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const el = tableContainerRef.current;
    if (!el) return;
    setIsDraggingH(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startScrollLeft: el.scrollLeft,
      startScrollTop: el.scrollTop,
    };
  };

  // Vertical Thumb Drag
  const handleVThumbMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const el = tableContainerRef.current;
    if (!el) return;
    setIsDraggingV(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startScrollLeft: el.scrollLeft,
      startScrollTop: el.scrollTop,
    };
  };

  useEffect(() => {
    if (!isDraggingH && !isDraggingV) return;

    const handleMouseMove = (e: MouseEvent) => {
      const el = tableContainerRef.current;
      if (!el) return;

      if (isDraggingH && hTrackRef.current) {
        const trackWidth = hTrackRef.current.clientWidth;
        const availableTrack = trackWidth * (1 - hThumbWidthPercent / 100);
        if (availableTrack > 0) {
          const deltaX = e.clientX - dragStartRef.current.startX;
          const maxLeft = Math.max(1, el.scrollWidth - el.clientWidth);
          const scrollDelta = (deltaX / availableTrack) * maxLeft;
          el.scrollLeft = dragStartRef.current.startScrollLeft + scrollDelta;
        }
      }

      if (isDraggingV && vTrackRef.current) {
        const trackHeight = vTrackRef.current.clientHeight;
        const availableTrack = trackHeight * (1 - vThumbHeightPercent / 100);
        if (availableTrack > 0) {
          const deltaY = e.clientY - dragStartRef.current.startY;
          const maxTop = Math.max(1, el.scrollHeight - el.clientHeight);
          const scrollDelta = (deltaY / availableTrack) * maxTop;
          el.scrollTop = dragStartRef.current.startScrollTop + scrollDelta;
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingH(false);
      setIsDraggingV(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingH, isDraggingV, hThumbWidthPercent, vThumbHeightPercent]);

  return (
    <div className={`w-full flex flex-col ${className}`}>
      {/* 1. TOP HORIZONTAL SLIDING BAR (উপরে ডানে-বামে স্লাইডিং বার) */}
      <div
        className="print:hidden no-print flex items-center bg-slate-100 border-b border-slate-200 px-1.5 py-1 select-none"
        title="ডানে-বামে স্লাইড করুন"
      >
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={() => scrollByHorizontal(-220)}
          className="w-6 h-4 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-xs transition-colors cursor-pointer shrink-0"
          title="বামে স্লাইড করুন"
          aria-label="Scroll Left"
        >
          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-current">
            <polygon points="8,1 2,5 8,9" />
          </svg>
        </button>

        {/* Horizontal Track & Thumb */}
        <div
          ref={hTrackRef}
          onClick={handleHTrackClick}
          className="relative flex-1 h-3 bg-slate-200/90 rounded-full mx-1 cursor-pointer overflow-hidden"
        >
          <div
            onMouseDown={handleHThumbMouseDown}
            style={{
              width: `${hThumbWidthPercent}%`,
              left: `${hThumbLeftPercent}%`,
            }}
            className={`absolute top-0 bottom-0 rounded-full transition-colors cursor-grab active:cursor-grabbing ${
              isDraggingH
                ? 'bg-slate-600'
                : 'bg-slate-400 hover:bg-slate-500'
            }`}
          />
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={() => scrollByHorizontal(220)}
          className="w-6 h-4 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-xs transition-colors cursor-pointer shrink-0"
          title="ডানে স্লাইড করুন"
          aria-label="Scroll Right"
        >
          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-current">
            <polygon points="2,1 8,5 2,9" />
          </svg>
        </button>
      </div>

      {/* 2. MAIN TABLE + RIGHT VERTICAL SLIDING BAR */}
      <div className="relative flex items-stretch w-full">
        {/* Scrollable Table Viewport (Bottom Horizontal + Vertical Scroll) */}
        <div
          ref={tableContainerRef}
          onScroll={handleContainerScroll}
          className={`flex-1 overflow-x-auto overflow-y-auto ${maxHeightClassName} ${minTableWidthClassName} [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-20 [&_thead]:shadow-2xs dual-scroll-table-viewport print:max-h-none print:overflow-visible`}
        >
          {children}
        </div>

        {/* Right Vertical Sliding Bar (ডান পাশে উপরে-নিচে স্লাইডিং বার) */}
        <div
          className="print:hidden no-print flex flex-col items-center justify-between bg-slate-100 border-l border-slate-200 py-1 px-1 select-none shrink-0 w-5"
          title="উপরে-নিচে স্লাইড করুন"
        >
          {/* Up Arrow Button */}
          <button
            type="button"
            onClick={() => scrollByVertical(-180)}
            className="w-4 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-xs transition-colors cursor-pointer shrink-0"
            title="উপরে স্লাইড করুন"
            aria-label="Scroll Up"
          >
            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-current">
              <polygon points="1,8 5,2 9,8" />
            </svg>
          </button>

          {/* Vertical Track & Thumb */}
          <div
            ref={vTrackRef}
            onClick={handleVTrackClick}
            className="relative flex-1 w-3 bg-slate-200/90 rounded-full my-1 cursor-pointer overflow-hidden min-h-[120px]"
          >
            <div
              onMouseDown={handleVThumbMouseDown}
              style={{
                height: `${vThumbHeightPercent}%`,
                top: `${vThumbTopPercent}%`,
              }}
              className={`absolute left-0 right-0 rounded-full transition-colors cursor-grab active:cursor-grabbing ${
                isDraggingV
                  ? 'bg-slate-600'
                  : 'bg-slate-400 hover:bg-slate-500'
              }`}
            />
          </div>

          {/* Down Arrow Button */}
          <button
            type="button"
            onClick={() => scrollByVertical(180)}
            className="w-4 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-xs transition-colors cursor-pointer shrink-0"
            title="নিচে স্লাইড করুন"
            aria-label="Scroll Down"
          >
            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-current">
              <polygon points="1,2 5,8 9,2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
