"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  /** 0–1. How much of the element must be visible before firing. */
  amount?: number;
  /** Shrink the viewport from the bottom so things fire a touch early. */
  margin?: string;
  /** Keep the "in view" state once it has fired. */
  once?: boolean;
};

/**
 * Small IntersectionObserver wrapper. Everything animated on this page runs
 * through it so the whole site shares one scroll-reveal cadence.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>({
  amount = 0.12,
  margin = "0px 0px -6% 0px",
  once = true,
}: Options = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold: amount, rootMargin: margin },
    );

    io.observe(node);
    return () => io.disconnect();
  }, [amount, margin, once]);

  return { ref, inView };
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
