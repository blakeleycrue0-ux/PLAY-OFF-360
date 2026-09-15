"use client";

import { SQUAD } from "@/lib/data";
import { useInView } from "@/lib/useInView";
import Chrome from "../product/Chrome";
import Avatar from "../ui/Avatar";
import Reveal from "../ui/Reveal";
import SectionHead from "../ui/SectionHead";
import { IconCheck, IconDoc, IconSearch, IconSquad } from "../ui/Icon";
import s from "./Team.module.css";

const TUTORS: Record<string, string> = {
  "Biel Company": "Neus Company",
  "Marc Vidal": "Marta Soler",
  "Aitor Ramis": "Xisca Ramis",
  "Guillem Mas": "Pere Mas",
  "Nico Tous": "Carla Tous",
  "Sergi Munar": "Joan Munar",
  "Pau Server": "Jaume Server",
  "Hugo Nadal": "Andreu Nadal",
  "Lluc Amengual": "Rosa Amengual",
  "Iker Salas": "Elena Salas",
};

const ROWS = SQUAD.slice(0, 9);

const STREAK = [100, 100, 86, 100, 92, 100];

export default function Team() {
  const { ref, inView } = useInView<HTMLDivElement>({ amount: 0.12 });

  return (
    <section id="equipo" className={`section grain ${s.section}`}>
      <div className="shell">
        <SectionHead
          split
          eyebrow="El equipo"
          title={
            <>
              Tu plantilla,
              <br />
              entera y <em>al día</em>.
            </>
          }
          lead="Jugadores, familias y cuerpo técnico en la misma ficha. Quién responde por cada niño, qué documentación falta y cómo va de asistencia."
          aside="Cuando entra un jugador nuevo, entra una vez. No en cinco listas distintas."
        />

        <Reveal variant="rise" amount={0.06} className={s.panel}>
          <div ref={ref} className={inView ? s.isIn : ""}>
            <Chrome active="Equipo" flat>
              <div className={s.bar}>
                <span className={`${s.tab} ${s.tabActive}`}>
                  <IconSquad size={13} /> Jugadores <span className={s.tabCount}>18</span>
                </span>
                <span className={s.tab}>
                  Familias <span className={s.tabCount}>24</span>
                </span>
                <span className={s.tab}>
                  Cuerpo técnico <span className={s.tabCount}>4</span>
                </span>
                <span className={s.search}>
                  <IconSearch size={13} /> Buscar en la plantilla
                </span>
              </div>

              <div className={s.body}>
                <div className={s.tableWrap}>
                  <div className={s.thead}>
                    <span>Jugador</span>
                    <span>Dorsal</span>
                    <span>Tutor</span>
                    <span>Ficha</span>
                    <span>Sábado</span>
                  </div>

                  {ROWS.map((p, i) => (
                    <div
                      key={p.name}
                      className={[s.trow, p.name === "Pau Server" ? s.trowActive : ""].join(" ")}
                      style={{ ["--d" as string]: `${120 + i * 60}ms` }}
                    >
                      <span className={s.player}>
                        <Avatar name={p.name} size={28} />
                        <span style={{ minWidth: 0 }}>
                          <span className={s.playerName}>{p.name}</span>
                          {p.note && <span className={s.playerTag}>{p.note}</span>}
                        </span>
                      </span>
                      <span className={s.dorsal}>{p.num}</span>
                      <span className={s.tutor}>{TUTORS[p.name] ?? "—"}</span>
                      <span>
                        <span className={s.pos}>{p.pos}</span>
                      </span>
                      <span>
                        {p.status === "ok" && <span className="chip chip-ok">Sí</span>}
                        {p.status === "wait" && <span className="chip chip-wait">—</span>}
                        {p.status === "no" && <span className="chip chip-no">No</span>}
                      </span>
                    </div>
                  ))}
                </div>

                <aside className={s.detail}>
                  <div className={s.detailTop}>
                    <Avatar name="Pau Server" size={42} ring="ok" />
                    <div>
                      <div className={s.detailName}>Pau Server</div>
                      <div className={s.detailMeta}>Mediocentro · Capitán · 13 años</div>
                    </div>
                    <span className={s.detailNum}>8</span>
                  </div>

                  <div className={s.block}>
                    <span className={s.blockTitle}>Responsables</span>
                    <div className={s.contact}>
                      <Avatar name="Jaume Server" size={24} />
                      Jaume Server
                      <span className={s.contactRole}>Padre</span>
                    </div>
                    <div className={s.contact}>
                      <Avatar name="Aina Pons" size={24} />
                      Aina Pons
                      <span className={s.contactRole}>Madre</span>
                    </div>
                  </div>

                  <div className={s.block}>
                    <span className={s.blockTitle}>Documentación</span>
                    <div>
                      <div className={s.docRow}>
                        <IconDoc size={13} /> Ficha federativa
                        <span className={`${s.docState} chip chip-ok`}>
                          <IconCheck size={11} /> Al día
                        </span>
                      </div>
                      <div className={s.docRow}>
                        <IconDoc size={13} /> Autorización de imagen
                        <span className={`${s.docState} chip chip-ok`}>
                          <IconCheck size={11} /> Firmada
                        </span>
                      </div>
                      <div className={s.docRow}>
                        <IconDoc size={13} /> Reconocimiento médico
                        <span className={`${s.docState} chip chip-wait`}>Caduca en 22 días</span>
                      </div>
                    </div>
                  </div>

                  <div className={s.block}>
                    <span className={s.blockTitle}>Asistencia · últimas 6</span>
                    <div className={s.streak} style={{ height: 46 }}>
                      {STREAK.map((v, i) => (
                        <span
                          key={i}
                          className={s.streakBar}
                          style={{
                            height: inView ? `${Math.max(14, v * 0.46)}px` : "4px",
                            background: v === 100 ? "var(--ok)" : "rgba(16,169,122,0.35)",
                            transition: `height .8s var(--ease) ${400 + i * 70}ms`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </Chrome>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
