type P = {
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
};

const base = (
  size: number,
  strokeWidth: number,
  className?: string,
  style?: React.CSSProperties,
) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className,
  style,
});

export const IconToday = ({ size = 18, strokeWidth = 1.6, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <rect x="3" y="4.5" width="18" height="16" rx="3" />
    <path d="M3 9.5h18M8 3v3M16 3v3M8 14h4" />
  </svg>
);

export const IconSquad = ({ size = 18, strokeWidth = 1.6, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19.5c0-3.1 2.7-5 6-5s6 1.9 6 5" />
    <path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 19.5c0-2.3-.8-3.7-2-4.6" />
  </svg>
);

export const IconMatch = ({ size = 18, strokeWidth = 1.6, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5v3.2M12 17.3v3.2M3.5 12h3.2M17.3 12h3.2" />
    <path d="M12 8.6 15.2 11l-1.2 3.8h-4L8.8 11z" />
  </svg>
);

export const IconCheck = ({ size = 18, strokeWidth = 1.6, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.4 12.2 2.4 2.4 4.8-4.9" />
  </svg>
);

export const IconMessage = ({ size = 18, strokeWidth = 1.6, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <path d="M20.5 12.2c0 3.8-3.8 6.8-8.5 6.8-1 0-2-.1-2.9-.4L4 20.5l1.3-3.5C4.1 15.7 3.5 14 3.5 12.2 3.5 8.4 7.3 5.4 12 5.4s8.5 3 8.5 6.8Z" />
  </svg>
);

export const IconBell = ({ size = 18, strokeWidth = 1.6, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.2 1.5 5.2H5S6.5 14 6.5 10Z" />
    <path d="M10.2 18.4a2 2 0 0 0 3.6 0" />
  </svg>
);

export const IconSearch = ({ size = 18, strokeWidth = 1.6, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

export const IconArrow = ({ size = 18, strokeWidth = 1.7, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const IconChevron = ({ size = 16, strokeWidth = 1.7, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const IconChevronDown = ({
  size = 16,
  strokeWidth = 1.7,
  className,
  style,
}: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <path d="m5 9 7 7 7-7" />
  </svg>
);

export const IconSend = ({ size = 18, strokeWidth = 1.6, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <path d="M20.5 3.5 10.8 13.2M20.5 3.5l-6.3 17-3.4-7.3-7.3-3.4z" />
  </svg>
);

export const IconClock = ({ size = 18, strokeWidth = 1.6, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.6V12l3 1.8" />
  </svg>
);

export const IconPin = ({ size = 18, strokeWidth = 1.6, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <path d="M12 21s6.5-5.6 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.4 12 21 12 21Z" />
    <circle cx="12" cy="10.6" r="2.4" />
  </svg>
);

export const IconMail = ({ size = 18, strokeWidth = 1.6, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.6" />
    <path d="m3.8 7.2 7.2 5a1.8 1.8 0 0 0 2 0l7.2-5" />
  </svg>
);

export const IconDoc = ({ size = 18, strokeWidth = 1.6, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <path d="M6 3.5h8L19 8v12.5H6z" />
    <path d="M13.6 3.7V8.3H18M9 13h6M9 16.4h4" />
  </svg>
);

export const IconGrid = ({ size = 18, strokeWidth = 1.6, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
  </svg>
);

export const IconShield = ({ size = 18, strokeWidth = 1.6, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <path d="M12 3.2 19 5.6v5.9c0 4.3-3 7.4-7 9.3-4-1.9-7-5-7-9.3V5.6Z" />
  </svg>
);

export const IconPlus = ({ size = 18, strokeWidth = 1.7, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <path d="M12 5.5v13M5.5 12h13" />
  </svg>
);

export const IconMore = ({ size = 18, strokeWidth = 1.9, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <path d="M6 12h.01M12 12h.01M18 12h.01" />
  </svg>
);

export const IconPlay = ({ size = 18, strokeWidth = 1.6, className, style }: P) => (
  <svg {...base(size, strokeWidth, className, style)}>
    <path d="M8.5 6.8 17 12l-8.5 5.2z" />
  </svg>
);
