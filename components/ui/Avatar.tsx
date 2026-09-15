const PALETTES = [
  ["#16295e", "#2b48ff"],
  ["#0d3b3a", "#12a37e"],
  ["#2d1b52", "#6d4bd1"],
  ["#4a2413", "#c1682c"],
  ["#0b2a4a", "#2f7fc4"],
  ["#3a1526", "#c2456b"],
  ["#1f2a12", "#7d9c2a"],
  ["#2b2118", "#8a6d4a"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  name,
  size = 32,
  ring,
}: {
  name: string;
  size?: number;
  /** thin status ring around the avatar */
  ring?: "ok" | "wait" | "no";
}) {
  const [a, b] = PALETTES[hash(name) % PALETTES.length];
  const ringColor =
    ring === "ok" ? "var(--ok)" : ring === "wait" ? "var(--wait)" : ring === "no" ? "var(--no)" : null;

  return (
    <span
      title={name}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flex: "none",
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${a}, ${b})`,
        color: "#fff",
        fontSize: Math.max(9, Math.round(size * 0.36)),
        fontWeight: 600,
        letterSpacing: "0.01em",
        boxShadow: ringColor
          ? `0 0 0 2px var(--paper), 0 0 0 3.5px ${ringColor}`
          : "inset 0 0 0 1px rgba(255,255,255,0.14)",
        userSelect: "none",
      }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  names,
  size = 28,
  max = 6,
}: {
  names: string[];
  size?: number;
  max?: number;
}) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;

  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {shown.map((n, i) => (
        <span
          key={n}
          style={{
            marginLeft: i === 0 ? 0 : -size * 0.3,
            borderRadius: "50%",
            boxShadow: "0 0 0 2px var(--paper)",
            display: "inline-flex",
            zIndex: shown.length - i,
          }}
        >
          <Avatar name={n} size={size} />
        </span>
      ))}
      {rest > 0 && (
        <span
          className="num"
          style={{
            marginLeft: -size * 0.3,
            width: size,
            height: size,
            borderRadius: "50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bone-2)",
            color: "var(--ink-55)",
            fontSize: Math.max(9, Math.round(size * 0.33)),
            fontWeight: 600,
            boxShadow: "0 0 0 2px var(--paper)",
          }}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
