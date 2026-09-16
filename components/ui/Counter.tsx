"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion, useInView } from "@/lib/useInView";

type Props = {
  to: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
};

/** Counts up once the number scrolls into view. Eases out, never bounces. */
export default function Counter({
  to,
  duration = 1400,
  decimals = 0,
  suffix = "",
  prefix = "",
}: Props) {
  const { ref, inView } = useInView<HTMLSpanElement>({ amount: 0.6 });
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setValue(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(to * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [inView, to, duration]);

  return (
    <span ref={ref} className="num">
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
