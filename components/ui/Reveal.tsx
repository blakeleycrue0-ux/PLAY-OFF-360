"use client";

import { type ElementType, type ReactNode } from "react";
import { useInView } from "@/lib/useInView";

type Variant = "up" | "left" | "right" | "scale" | "fade" | "rise";

type Props = {
  children: ReactNode;
  as?: ElementType;
  variant?: Variant;
  delay?: number;
  amount?: number;
  className?: string;
  style?: React.CSSProperties;
};

export default function Reveal({
  children,
  as: Tag = "div",
  variant = "up",
  delay = 0,
  amount = 0.12,
  className,
  style,
}: Props) {
  const { ref, inView } = useInView<HTMLDivElement>({ amount });

  return (
    <Tag
      ref={ref}
      data-reveal={variant}
      className={[inView ? "is-in" : "", className].filter(Boolean).join(" ")}
      style={{ ["--reveal-delay" as string]: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}
