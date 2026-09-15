"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "./useInView";

/**
 * Advances through a list of step durations once `active` turns true.
 * Returns the index of the last step that has started.
 */
export function useSequence(active: boolean, durations: number[]) {
  const [step, setStep] = useState(-1);

  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) {
      setStep(durations.length);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let acc = 0;
    durations.forEach((d, i) => {
      acc += d;
      timers.push(setTimeout(() => setStep(i), acc));
    });
    setStep(0);

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return step;
}

/** Types a string out character by character. */
export function useTypewriter(text: string, active: boolean, speed = 22) {
  const [out, setOut] = useState("");

  useEffect(() => {
    if (!active) {
      setOut("");
      return;
    }
    if (prefersReducedMotion()) {
      setOut(text);
      return;
    }

    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);

    return () => clearInterval(id);
  }, [text, active, speed]);

  return { text: out, done: out.length >= text.length };
}
