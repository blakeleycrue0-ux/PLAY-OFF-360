"use client";

import { CLUB, MATCH } from "@/lib/data";
import { useInView } from "@/lib/useInView";
import Avatar, { AvatarStack } from "../ui/Avatar";
import { IconArrow, IconChevron, IconClock, IconPin, IconShield } from "../ui/Icon";
import s from "./TodayScreen.module.css";

const CONFIRMED = [
  "Pau Server",
  "Hugo Nadal",
  "Marc Vidal",
  "Iker Salas",
  "Biel Company",
  "Nico Tous",
  "Sergi Munar",
  "Álvaro Ferrer",
];

const FEED = [
  {
    who: "Marta Soler",
    text: "confirmó a **Marc Vidal** para el sábado",
    time: "hace 4 min",
  },
  {
    who: "Chema Ruiz",
    text: "adjuntó el **acta de la jornada 20**",
    time: "hace 26 min",
  },
  {
    who: "Rosa Amengual",
    text: "marcó **no disponible** — examen el sábado",
    time: "hace 1 h",
  },
  {
    who: "Dani Moreno",
    text: "movió el entrenamiento del jueves a **18:00**",
    time: "ayer, 21:04",
  },
];

function rich(text: string) {
  return text
    .split("**")
    .map((part, i) =>
      i % 2 === 1 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>,
    );
}

export default function TodayScreen() {
  const { ref, inView } = useInView<HTMLDivElement>({ amount: 0.15 });

  return (
    <div ref={ref} className={[s.screen, inView ? s.isIn : ""].join(" ")}>
      <div className={s.hello}>
        <div>
          <div className={s.helloTitle}>Buenos días, {CLUB.coachFirst}.</div>
          <div className={s.helloMeta}>
            Miércoles, 11 de marzo · {CLUB.teamName} · {CLUB.season}
          </div>
        </div>
        <span className={`${s.week} num`}>
          <IconShield size={12} /> Jornada 21
        </span>
      </div>

      <div className={s.attention}>
        <i className="dot dot-live" />
        <span>
          <b>3 cosas</b> requieren tu atención
        </span>
        <span className={s.attentionLink}>
          Revisar <IconChevron size={12} />
        </span>
      </div>

      <div className={s.cards}>
        <div className={s.card}>
          <div className={s.cardHead}>
            <span className={`${s.cardKpi} num`}>8</span>
            <span className="chip chip-ok">
              <i className="dot dot-ok" /> Confirmados
            </span>
          </div>
          <div className={s.cardLabel}>Jugadores disponibles el sábado</div>
          <div className={s.bar} style={{ ["--bar-w" as string]: "44%" }}>
            <i className={s.barFill} style={{ ["--bar-w" as string]: "44%" }} />
          </div>
          <AvatarStack names={CONFIRMED} size={22} max={6} />
        </div>

        <div className={s.card}>
          <div className={s.cardHead}>
            <span className={`${s.cardKpi} num`}>3</span>
            <span className="chip chip-wait">
              <i className="dot dot-wait" /> Sin responder
            </span>
          </div>
          <div className={s.cardLabel}>Guillem Mas, Martí Riera, Bruno Sastre</div>
          <div className={s.cardSub}>Se les avisó el lunes a las 19:40.</div>
          <button className={s.miniBtn}>
            Recordar a los 3 <IconArrow size={12} />
          </button>
        </div>

        <div className={s.card}>
          <div className={s.cardHead}>
            <span className={`${s.cardKpi} num`}>1</span>
            <span className="chip chip-blue">Convocatoria</span>
          </div>
          <div className={s.cardLabel}>Pendiente de publicar</div>
          <div className={s.cardSub}>
            {MATCH.home} · {MATCH.day.toLowerCase()} {MATCH.time}
          </div>
          <button className={`${s.miniBtn} ${s.miniBtnGhost}`}>
            Preparar convocatoria
          </button>
        </div>
      </div>

      <div className={s.split}>
        <div className={s.panel}>
          <div className={s.panelHead}>
            <span className={s.panelTitle}>Actividad</span>
            <span className={s.panelMeta}>Últimas 24 h</span>
          </div>
          <div className={s.feed}>
            {FEED.map((f, i) => (
              <div
                key={f.who + i}
                className={s.feedRow}
                style={{ ["--row-delay" as string]: `${360 + i * 110}ms` }}
              >
                <Avatar name={f.who} size={24} />
                <span className={s.feedText}>
                  <b>{f.who}</b> {rich(f.text)}
                </span>
                <span className={`${s.feedTime} num`}>{f.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={s.panel}>
          <div className={s.match}>
            <div className={s.matchTop}>
              <span className={s.matchDate}>
                {MATCH.day} {MATCH.time}
              </span>
              <span className="chip chip-neutral">Fuera</span>
            </div>
            <div className={s.matchTeams}>
              <div className={s.matchTeam}>
                <span
                  className={s.matchCrest}
                  style={{ background: "linear-gradient(140deg,#4a1720,#b03246)" }}
                >
                  CON
                </span>
                <span>{MATCH.home}</span>
              </div>
              <div className={s.matchTeam}>
                <span
                  className={s.matchCrest}
                  style={{ background: "linear-gradient(140deg,#16295e,#2b48ff)" }}
                >
                  {CLUB.short}
                </span>
                <span className={s.away}>{MATCH.away}</span>
              </div>
            </div>
            <div className={s.matchInfo}>
              <div>
                <IconPin size={12} /> {MATCH.venue}, {MATCH.city}
              </div>
              <div>
                <IconClock size={12} /> Citación {MATCH.meeting}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
