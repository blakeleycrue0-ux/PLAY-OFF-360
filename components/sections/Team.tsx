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
  "Rubén Cabrera": "Pilar Cabrera",
  "Marcos Vidal": "Marta Soler",
  "Aitor Nieto": "Cristina Nieto",
  "Gonzalo Mena": "Pedro Mena",
  "Nico Duarte": "Carla Duarte",
  "Sergio Prieto": "Juan Prieto",
  "Pablo Serrano": "Javier Serrano",
  "Hugo Peña": "Andrés Peña",
  "Lucas Arriaga": "Rosa Arriaga",
  "Iker Salas": "Elena Salas",
};

const ROWS = SQUAD.slice(0, 9);

const STREAK = [100, 89, 78, 100, 94, 100];

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
                    <span className={s.cDorsal}>Dorsal</span>
                    <span className={s.cTutor}>Responsable</span>
                    <span>Pos.</span>
                    <span>Sábado</span>
                  </div>

                  {ROWS.map((p, i) => (
                    <div
                      key={p.name}
                      className={[
                        s.trow,
                        p.name === "Pablo Serrano" ? s.trowActive : "",
                      ].join(" ")}
                      style={{ ["--d" as string]: `${120 + i * 60}ms` }}
                    >
                      <span className={s.player}>
                        <Avatar name={p.name} size={28} />
                        <span style={{ minWidth: 0 }}>
                          <span className={s.playerName}>{p.name}</span>
                          {p.note && <span className={s.playerTag}>{p.note}</span>}
                        </span>
                      </span>
                      <span className={`${s.dorsal} ${s.cDorsal}`}>{p.num}</span>
                      <span className={`${s.tutor} ${s.cTutor}`}>
                        {TUTORS[p.name] ?? "—"}
                      </span>
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
                    <Avatar name="Pablo Serrano" size={42} ring="ok" />
                    <div>
                      <div className={s.detailName}>Pablo Serrano</div>
                      <div className={s.detailMeta}>Mediocentro · Capitán · 13 años</div>
                    </div>
                    <span className={s.detailNum}>8</span>
                  </div>

                  <div className={s.block}>
                    <span className={s.blockTitle}>Responsables</span>
                    <div className={s.contact}>
                      <Avatar name="Javier Serrano" size={24} />
                      Javier Serrano
                      <span className={s.contactRole}>Padre</span>
                    </div>
                    <div className={s.contact}>
                      <Avatar name="Ana Serrano" size={24} />
                      Ana Serrano
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
                        <span className={`${s.docState} chip chip-wait`}>
                          Caduca en 22 días
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={s.block}>
                    <span className={s.blockTitle}>Asistencia · últimas 6</span>
                    <div className={s.streak}>
                      {STREAK.map((v, i) => (
                        <span key={i} className={s.streakTrack}>
                          <i
                            className={s.streakBar}
                            style={{
                              height: inView ? `${v}%` : "0%",
                              opacity: v >= 95 ? 1 : v >= 85 ? 0.7 : 0.45,
                              transitionDelay: `${360 + i * 70}ms`,
                            }}
                          />
                        </span>
                      ))}
                    </div>
                    <div className={s.streakLabels}>
                      <span>hace 6</span>
                      <span>última</span>
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
