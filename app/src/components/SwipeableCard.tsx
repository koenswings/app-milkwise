"use client";

import { useState, useRef } from "react";

interface Props {
  views: React.ReactNode[];
  className?: string;
}

export default function SwipeableCard({ views, className = "" }: Props) {
  const [current, setCurrent] = useState(0);
  const startX = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) setCurrent((c) => Math.min(c + 1, views.length - 1));
      else setCurrent((c) => Math.max(c - 1, 0));
    }
    startX.current = null;
  }
  function onMouseDown(e: React.MouseEvent) { startX.current = e.clientX; }
  function onMouseUp(e: React.MouseEvent) {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) setCurrent((c) => Math.min(c + 1, views.length - 1));
      else setCurrent((c) => Math.max(c - 1, 0));
    }
    startX.current = null;
  }

  return (
    <div
      className={`bg-slate-800 rounded-xl overflow-hidden select-none cursor-grab active:cursor-grabbing ${className}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    >
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {views.map((view, i) => (
          <div key={i} className="min-w-full">
            {view}
          </div>
        ))}
      </div>


    </div>
  );
}
