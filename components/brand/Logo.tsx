type Tone = "dark" | "light" | "mono";

/**
 * The PLAYOFF30 symbol: the corner arc of a pitch, plus the spot.
 * Geometric enough to survive at 16px, distinctive enough to stand alone.
 */
export function Mark({
  size = 30,
  tone = "dark",
  className,
}: {
  size?: number;
  tone?: Tone;
  className?: string;
}) {
  const id = `mk-${tone}`;
  const tile =
    tone === "mono" ? "currentColor" : tone === "light" ? "#ffffff" : `url(#${id})`;
  const arc = tone === "light" ? "#0a1428" : tone === "mono" ? "var(--bone)" : "#ffffff";
  const spot = tone === "light" ? "#2b48ff" : "#c9f24a";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="2" y1="0" x2="30" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16295e" />
          <stop offset="1" stopColor="#2b48ff" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={tile} />
      <path
        d="M9 24.5A15.5 15.5 0 0 0 24.5 9"
        stroke={arc}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="10.4" cy="10.4" r="2.5" fill={spot} />
    </svg>
  );
}

/** Wordmark. Tight grotesk caps, with the 30 carried in the accent. */
export function Wordmark({
  tone = "dark",
  size = 17,
}: {
  tone?: "dark" | "light";
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        fontFamily: "var(--font-display)",
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "-0.045em",
        lineHeight: 1,
        color: tone === "light" ? "#fff" : "var(--ink)",
        display: "inline-flex",
        alignItems: "baseline",
        fontFeatureSettings: '"tnum" 1',
      }}
    >
      PLAYOFF
      <span
        style={{
          color: tone === "light" ? "var(--pitch)" : "var(--electric)",
          letterSpacing: "-0.03em",
          marginLeft: "0.06em",
        }}
      >
        30
      </span>
    </span>
  );
}

export default function Logo({
  tone = "dark",
  size = 17,
  markSize = 28,
  gap = 10,
}: {
  tone?: "dark" | "light";
  size?: number;
  markSize?: number;
  gap?: number;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap }}>
      <Mark size={markSize} tone={tone === "light" ? "dark" : "dark"} />
      <Wordmark tone={tone} size={size} />
      <span className="sr-only">PLAYOFF30</span>
    </span>
  );
}
