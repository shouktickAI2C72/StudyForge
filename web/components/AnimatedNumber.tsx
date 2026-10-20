"use client";

import React, { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  /** Render the tweened value however the caller needs ("3h 30m", "42m", ...) */
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}

/**
 * Tweens between numeric values with an ease-out cubic so slider-driven
 * and state-driven figures roll instead of snapping.
 */
export function AnimatedNumber({
  value,
  format = (v) => Math.round(v).toString(),
  duration = 450,
  className = "",
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <span className={`tnum ${className}`.trim()}>{format(display)}</span>;
}