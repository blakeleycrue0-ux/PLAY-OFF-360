import type { ReactNode } from "react";
import Reveal from "./Reveal";
import s from "./SectionHead.module.css";

export default function SectionHead({
  eyebrow,
  title,
  lead,
  aside,
  tone = "light",
  split = false,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  aside?: ReactNode;
  tone?: "light" | "dark";
  split?: boolean;
}) {
  return (
    <div
      className={[s.head, split ? s.split : "", tone === "dark" ? s.dark : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={s.main}>
        <Reveal variant="fade">
          <span className={`eyebrow ${tone === "dark" ? "on-dark" : ""}`}>{eyebrow}</span>
        </Reveal>
        <Reveal variant="up" delay={80}>
          <h2 className={`h2 ${s.title}`}>{title}</h2>
        </Reveal>
      </div>
      {(lead || aside) && (
        <div>
          {lead && (
            <Reveal variant="up" delay={160}>
              <p className={`lead ${s.lead}`}>{lead}</p>
            </Reveal>
          )}
          {aside && (
            <Reveal variant="up" delay={220}>
              <p className={s.aside}>{aside}</p>
            </Reveal>
          )}
        </div>
      )}
    </div>
  );
}
