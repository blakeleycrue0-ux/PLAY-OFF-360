"use client";

import { CLUB, MATCH } from "@/lib/data";
import { useInView } from "@/lib/useInView";
import { AvatarStack } from "../ui/Avatar";
import Reveal from "../ui/Reveal";
import SectionHead from "../ui/SectionHead";
import { IconCheck, IconClock, IconMatch, IconPin, IconSend } from "../ui/Icon";
import s from "./Matches.module.css";

const AVAILABILITY = [
  { n: 12, label: "Disponibles", color: "var(--ok)", w: "67%" },
  { n: 3, label: "No pueden", color: "var(--no)", w: "17%" },
  { n: 3, label: "Sin respuesta", color: "var(--wait)", w: "17%" },
];

const WEEK = [
  { day: "Lunes", text: "Convocatoria enviada a 18 familias." },
  { day: "Miércoles", text: "12 confirmados. 3 bajas registradas." },
  { day: "Jueves", text: "Recordatorio a quien faltaba." },
  { day: "Viernes", text: "Convocatoria publicada. 16 jugadores." },
  { day: "Sábado", text: "Partido. Citación a las 10:15.", last: true },
];

const CALLED = [
  "Pau Server",
  "Hugo Nadal",
  "Marc Vidal",
  "Iker Salas",
  "Nico Tous",
  "Sergi Munar",
  "Biel Company",
  "Jan Oliver",
  "Aitor Ramis",
  "Álvaro Ferrer",
  "Diego Cabrer",
  "Toni Bennàsar",
  "Óscar Palou",
  "Adrián Pons",
  "Guillem Mas",
  "Martí Riera",
];

export default function Matches() {
  const { ref, inView } = useInView<HTMLDivElement>({ amount: 0.15 });

  return (
    <section id="partidos" className={`section dark ${s.section}`}>
      <div className={s.glow} aria-hidden />
      <div className="field-lines on-dark" aria-hidden />

      <div className="shell">
        <SectionHead
          split
          tone="dark"
          eyebrow="Partidos"
          title={
            <>
              El sábado se
              <br />
              resuelve el <em>martes</em>.
            </>
          }
          lead="Cada partido tiene su propia página: la convocatoria, quién puede venir, dónde se juega y a qué hora se sale del club."
          aside="Cuando llega el viernes ya no hay nada que preguntar."
        />

        <div ref={ref} className={s.grid}>
          <Reveal variant="up" className={`${s.card} ${s.main}`}>
            <div className={s.mainTop}>
              <IconMatch size={14} />
              {MATCH.competition}
              <span className={s.away}>Fuera de casa</span>
            </div>

            <div className={s.fixture}>
              <div className={s.side}>
                <span
                  className={s.crest}
                  style={{ background: "linear-gradient(145deg,#4a1720,#b03246)" }}
                >
                  CON
                </span>
                <span>
                  <span className={s.teamName}>{MATCH.home}</span>
                  <span className={s.teamMeta}>Local · 3.º clasificado</span>
                </span>
              </div>

              <div className={s.when}>
                <div className={s.whenDay}>Sábado</div>
                <div className={s.whenTime}>{MATCH.time}</div>
                <div className={s.whenDate}>{MATCH.date}</div>
              </div>

              <div className={`${s.side} ${s.sideRight}`}>
                <span
                  className={s.crest}
                  style={{ background: "linear-gradient(145deg,#16295e,#2b48ff)" }}
                >
                  {CLUB.short}
                </span>
                <span>
                  <span className={s.teamName}>{CLUB.name}</span>
                  <span className={s.teamMeta}>Visitante · 5.º clasificado</span>
                </span>
              </div>
            </div>

            <div className={s.facts}>
              <div className={s.fact}>
                <span className={s.factKey}>Campo</span>
                <span className={s.factVal}>
                  {MATCH.venue} · {MATCH.city}
                </span>
              </div>
              <div className={s.fact}>
                <span className={s.factKey}>Citación</span>
                <span className={`${s.factVal} num`}>{MATCH.meeting}</span>
              </div>
              <div className={s.fact}>
                <span className={s.factKey}>Desplazamiento</span>
                <span className={s.factVal}>{MATCH.travel}</span>
              </div>
              <div className={s.fact}>
                <span className={s.factKey}>Equipación</span>
                <span className={s.factVal}>{MATCH.kit}</span>
              </div>
            </div>
          </Reveal>

          <div className={s.aside}>
            <Reveal variant="left" delay={120} className={s.card}>
              <div className={s.panelHead}>
                <IconCheck size={14} /> Disponibilidad
                <span className={s.panelMeta}>Hace 6 min</span>
              </div>
              <div className={s.panelBody}>
                {AVAILABILITY.map((a, i) => (
                  <div key={a.label} className={s.avRow}>
                    <span className={s.avNum}>{a.n}</span>
                    <span className={s.avTrack}>
                      <i
                        style={{
                          width: inView ? a.w : 0,
                          background: a.color,
                          ["--d" as string]: `${300 + i * 130}ms`,
                        }}
                      />
                    </span>
                    <span className={s.avLabel}>{a.label}</span>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal variant="left" delay={200} className={s.card}>
              <div className={s.panelHead}>
                <IconSend size={14} /> Convocatoria
                <span className={s.panelMeta}>Borrador</span>
              </div>
              <div className={s.panelBody}>
                <div className={s.callUp}>
                  <div className={s.callUpTop}>
                    <span className={s.callUpNum}>16</span>
                    <span className={s.callUpText}>convocados de 18 disponibles</span>
                  </div>
                  <AvatarStack names={CALLED} size={26} max={9} surface="#16224a" />
                  <button className={s.publish}>
                    <IconSend size={13} /> Publicar convocatoria
                  </button>
                </div>
              </div>
            </Reveal>

            <Reveal variant="left" delay={280} className={s.card}>
              <div className={s.panelHead}>
                <IconPin size={14} /> Cómo llegar
                <span className={s.panelMeta}>Inca</span>
              </div>
              <div className={s.panelBody}>
                <div className={s.avRow} style={{ gridTemplateColumns: "auto 1fr" }}>
                  <IconClock size={14} />
                  <span style={{ color: "rgba(255,255,255,0.6)" }}>
                    Salida del club a las 10:15 · llegada prevista 10:55
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        <Reveal variant="up" delay={100} className={s.week}>
          <div className={s.weekTitle}>La semana del partido</div>
          <div className={s.steps}>
            {WEEK.map((w) => (
              <div
                key={w.day}
                className={[s.step, w.last ? s.stepLast : ""].filter(Boolean).join(" ")}
              >
                <div className={s.stepDay}>{w.day}</div>
                <div className={s.stepText}>{w.text}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
