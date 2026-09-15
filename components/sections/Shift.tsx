"use client";

import { useInView } from "@/lib/useInView";
import { Mark } from "../brand/Logo";
import Reveal from "../ui/Reveal";
import s from "./Shift.module.css";

const INPUTS = [
  "Grupo de WhatsApp",
  "Hoja de cálculo",
  "Cadena de emails",
  "Notas del móvil",
  "Llamadas y recados",
];

const OUTPUTS = ["Convocatoria", "Asistencia", "Partido", "Aviso al equipo"];

/** y positions inside the 1000×400 viewBox */
const IN_Y = [42, 126, 210, 294, 366];
const OUT_Y = [64, 150, 236, 322];

export default function Shift() {
  const { ref, inView } = useInView<HTMLDivElement>({ amount: 0.25 });

  return (
    <section className={`section ${s.section}`}>
      <div className={s.glow} aria-hidden />
      <div className="field-lines on-dark" aria-hidden />

      <div className="shell">
        <div className={s.head}>
          <Reveal variant="fade">
            <span className="eyebrow on-dark accent">El cambio</span>
          </Reveal>
          <Reveal variant="up" delay={90}>
            <h2 className={`h2 ${s.title}`}>
              Eso no es dirigir un equipo.
              <br />
              Es <em>sostenerlo</em> con las manos.
            </h2>
          </Reveal>
          <Reveal variant="up" delay={180}>
            <p className={`lead ${s.sub}`}>
              PLAYOFF30 recoge las cinco herramientas que usas hoy y las convierte en una
              sola operación: una decisión, una comunicación, una respuesta registrada.
            </p>
          </Reveal>
        </div>

        <div
          ref={ref}
          className={[s.diagram, inView ? s.isIn : ""].join(" ")}
          aria-hidden
        >
          <svg className={s.svg} viewBox="0 0 1000 380" fill="none">
            <defs>
              <linearGradient id="pin" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="rgba(255,255,255,0.05)" />
                <stop offset="1" stopColor="rgba(255,255,255,0.32)" />
              </linearGradient>
              <linearGradient id="pout" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="rgba(43,72,255,0.9)" />
                <stop offset="1" stopColor="rgba(201,242,74,0.5)" />
              </linearGradient>
            </defs>

            {IN_Y.map((y, i) => (
              <path
                key={`i${y}`}
                className={s.path}
                stroke="url(#pin)"
                style={{ transitionDelay: `${i * 90}ms` }}
                d={`M 218 ${y} C 340 ${y}, 366 190, 456 190`}
              />
            ))}

            {OUT_Y.map((y, i) => (
              <path
                key={`o${y}`}
                className={s.path}
                stroke="url(#pout)"
                style={{ transitionDelay: `${560 + i * 110}ms` }}
                d={`M 544 190 C 654 190, 676 ${y}, 802 ${y}`}
              />
            ))}
          </svg>

          {INPUTS.map((label, i) => (
            <span
              key={label}
              className={`${s.chip} ${s.chipIn}`}
              style={{ top: `${(IN_Y[i] / 380) * 100}%`, ["--d" as string]: `${i * 80}ms` }}
            >
              {label}
            </span>
          ))}

          <div className={s.node}>
            <span className={s.nodeTile}>
              <Mark size={40} tone="light" />
            </span>
            <span className={s.nodeLabel}>PLAYOFF30</span>
          </div>

          {OUTPUTS.map((label, i) => (
            <span
              key={label}
              className={`${s.chip} ${s.chipOut}`}
              style={{
                top: `${(OUT_Y[i] / 380) * 100}%`,
                ["--d" as string]: `${700 + i * 90}ms`,
              }}
            >
              <i />
              {label}
            </span>
          ))}
        </div>

        {/* stacked version for narrow screens */}
        <div className={s.stack}>
          <div>
            <div className={s.stackLabel}>HOY</div>
            <div className={s.stackGroup}>
              {INPUTS.map((l) => (
                <span key={l} className={s.stackChip}>
                  {l}
                </span>
              ))}
            </div>
          </div>
          <div className={s.stackArrow}>
            <span className={s.stackNode}>
              <Mark size={22} tone="light" /> PLAYOFF30
            </span>
          </div>
          <div>
            <div className={s.stackLabel}>DESPUÉS</div>
            <div className={s.stackGroup}>
              {OUTPUTS.map((l) => (
                <span key={l} className={`${s.stackChip} ${s.stackChipOut}`}>
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
