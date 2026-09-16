import { CLUB } from "@/lib/data";
import Avatar from "../ui/Avatar";
import { Mark } from "../brand/Logo";
import {
  IconBell,
  IconChevronDown,
  IconMatch,
  IconMessage,
  IconSearch,
  IconSquad,
  IconToday,
  IconCheck,
} from "../ui/Icon";
import s from "./Chrome.module.css";

const TABS = [
  { label: "Hoy", icon: IconToday },
  { label: "Equipo", icon: IconSquad },
  { label: "Partidos", icon: IconMatch },
  { label: "Asistencia", icon: IconCheck },
  { label: "Mensajes", icon: IconMessage },
];

export default function Chrome({
  active = "Hoy",
  children,
  flat = false,
  className,
  style,
}: {
  active?: string;
  children: React.ReactNode;
  flat?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={["ui", s.frame, flat ? s.frameFlat : "", className]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <div className={s.top}>
        <Mark size={20} />
        <div className={s.club}>
          <span className={s.crest}>{CLUB.short}</span>
          <span className={s.clubName}>{CLUB.name}</span>
          <IconChevronDown size={12} className={s.clubChev} />
        </div>

        <div className={s.tabs}>
          {TABS.map(({ label, icon: I }) => (
            <span
              key={label}
              className={[s.tab, label === active ? s.tabActive : ""].join(" ")}
            >
              <I size={14} />
              {label}
            </span>
          ))}
        </div>

        <div className={s.topRight}>
          <span className={s.iconBtn}>
            <IconSearch size={15} />
          </span>
          <span className={s.iconBtn}>
            <IconBell size={15} />
            <i className={s.badge} />
          </span>
          <Avatar name={CLUB.coach} size={26} />
        </div>
      </div>

      <div className={s.body}>{children}</div>
    </div>
  );
}
