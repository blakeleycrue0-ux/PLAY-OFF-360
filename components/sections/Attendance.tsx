"use client";

import { SQUAD, TRAINING } from "@/lib/data";
import { useInView } from "@/lib/useInView";
import Avatar from "../ui/Avatar";
import Counter from "../ui/Counter";
import Reveal from "../ui/Reveal";
import SectionHead from "../ui/SectionHead";
import { IconCheck } from "../ui/Icon";
import s from "./Attendance.module.css";

const SESSIONS = [
  { label: "24 feb", v: 94 },
  { label: "26 feb", v: 83 },
  { label: "3 mar", v: 100 },
  { label: "5 mar", v: 89 },
  { label: "10 mar", v: 94 },
  { label: "12 mar", v: 83 },
];

export default function Attendance() {
  const { ref, inView } = useInView<HTMLDivElement>({ amount: 0.12 });

  return (
    <section id="asistencia" className={`section grain ${s.section}`}>
      <div className="shell">
        <SectionHead
          split
          eyebrow="Asistencia"
          title={
            <>
              Quién viene
              <br />
              al <em>entrenamiento</em>.
            </>
          }
          lead="Cada sesión abre su lista sola. Los jugadores y las familias responden con un toque y tú lo ves antes de salir de casa."
          aside="Y queda guardado, así que en febrero sabes quién ha venido en noviembre."
        />

        <Reveal variant="rise" amount={0.05}>
          <div ref={ref} className={`ui ${s.panel} ${inView ? s.isIn : ""}`}>
            <div className={s.top}>
              <span className={s.topIcon}>
                <IconCheck size={20} />
              </span>
              <div>
                <div className={s.topTitle}>Entrenamiento · {TRAINING.day} {TRAINING.date}</div>
                <div className={s.topMeta}>{TRAINING.pitch} · Infantil A</div>
              </div>
              <span className={s.topTime}>{TRAINING.time}</span>
            </div>

            <div className={s.kpis}>
              <div className={s.kpi}>
                <div className={s.kpiNum}>
                  <Counter to={TRAINING.total} />
                </div>
                <div className={s.kpiLabel}>Jugadores citados</div>
              </div>
              <div className={s.kpi}>
                <div className={s.kpiNum} style={{ color: "var(--ok)" }}>
                  <Counter to={TRAINING.confirmed} />
                </div>
                <div className={s.kpiLabel}>
                  <i className="dot dot-ok" /> Confirmados
                </div>
              </div>
              <div className={s.kpi}>
                <div className={s.kpiNum} style={{ color: "var(--wait)" }}>
                  <Counter to={TRAINING.pending} />
                </div>
                <div className={s.kpiLabel}>
                  <i className="dot dot-wait" /> Pendientes
                </div>
              </div>
              <div className={s.kpi}>
                <div className={s.kpiNum} style={{ color: "var(--no)" }}>
                  <Counter to={TRAINING.unavailable} />
                </div>
                <div className={s.kpiLabel}>
                  <i className="dot dot-no" /> No disponible
                </div>
              </div>
            </div>

            <div className={s.tiles}>
              {SQUAD.map((p, i) => (
                <div
                  key={p.name}
                  className={s.tile}
                  style={{ ["--d" as string]: `${140 + i * 38}ms` }}
                >
                  <Avatar name={p.name} size={26} ring={p.status} />
                  <span className={s.tileName}>{p.name}</span>
                  <i
                    className={`dot ${
                      p.status === "ok" ? "dot-ok" : p.status === "wait" ? "dot-wait" : "dot-no"
                    } ${s.tileState}`}
                  />
                </div>
              ))}
            </div>

            <div className={s.foot}>
              <div className={s.footTitle}>Asistencia de las últimas seis sesiones</div>
              <div className={s.bars}>
                {SESSIONS.map((x, i) => (
                  <div key={x.label} className={s.barCol}>
                    <span className={s.barVal}>{x.v}%</span>
                    <span
                      className={s.bar}
                      style={{
                        height: inView ? `${x.v * 0.52}px` : 0,
                        ["--d" as string]: `${300 + i * 90}ms`,
                      }}
                    />
                    <span className={s.barLabel}>{x.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
