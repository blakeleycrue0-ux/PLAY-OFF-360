"use client";

import { useInView } from "@/lib/useInView";
import SectionHead from "../ui/SectionHead";
import Reveal from "../ui/Reveal";
import Avatar from "../ui/Avatar";
import {
  IconBell,
  IconCheck,
  IconClock,
  IconDoc,
  IconMail,
  IconMessage,
  IconSend,
} from "../ui/Icon";
import s from "./Communication.module.css";

const DELIVERY = [
  { name: "Marta Soler", role: "Madre de Marc Vidal", state: "Respondido", time: "19:42" },
  { name: "Jaume Server", role: "Padre de Pau Server", state: "Leído", time: "19:44" },
  { name: "Andreu Nadal", role: "Padre de Hugo Nadal", state: "Respondido", time: "19:51" },
  { name: "Carla Tous", role: "Madre de Nico Tous", state: "Leído", time: "20:03" },
  { name: "Rosa Amengual", role: "Madre de Lluc Amengual", state: "Entregado", time: "20:10" },
  { name: "Chema Ruiz", role: "Delegado", state: "Respondido", time: "20:12" },
];

const KINDS = [
  {
    icon: IconDoc,
    title: "Convocatoria",
    text: "Quién juega, dónde y a qué hora. Con confirmación de cada familia.",
    sample: "«Convocado para el sábado. Citación 10:15.»",
  },
  {
    icon: IconClock,
    title: "Cambio de horario",
    text: "Cambias la hora una vez y se actualiza en el calendario de todos.",
    sample: "«El jueves entrenamos a las 19:00, no a las 18:00.»",
  },
  {
    icon: IconBell,
    title: "Aviso al equipo",
    text: "Material, desplazamientos, documentación. Sin abrir seis chats.",
    sample: "«Recordad traer la equipación visitante.»",
  },
  {
    icon: IconCheck,
    title: "Recordatorio",
    text: "Solo a quien falta por responder. Nunca al grupo entero.",
    sample: "«Quedan 3 familias por confirmar.»",
  },
];

function stateChip(state: string) {
  if (state === "Respondido") return "chip chip-ok";
  if (state === "Leído") return "chip chip-blue";
  return "chip chip-neutral";
}

export default function Communication() {
  const { ref, inView } = useInView<HTMLDivElement>({ amount: 0.18 });

  return (
    <section id="comunicacion" className={`section ${s.section}`}>
      <div className="shell">
        <SectionHead
          split
          eyebrow="Comunicación"
          title={
            <>
              Cambias una hora.
              <br />
              Se entera <em>todo el mundo</em>.
            </>
          }
          lead="Mueves el entrenamiento del jueves. PLAYOFF30 avisa a las familias, actualiza el calendario del equipo y te dice quién lo ha leído."
          aside="Sin reenviar capturas. Sin repetirlo en tres sitios. Sin acordarte a las once de la noche de que faltaba avisar a alguien."
        />

        <div ref={ref} className={[s.flow, inView ? s.isIn : ""].join(" ")}>
          {/* acción */}
          <Reveal variant="right" className={s.card}>
            <div className={s.cardHead}>
              <IconClock size={14} />
              Entrenamiento · Infantil A
              <span className={`${s.cardHeadTag} chip chip-neutral`}>Editando</span>
            </div>
            <div className={s.edit}>
              <div className={s.editTitle}>Jueves 12 de marzo</div>

              <div className={s.field}>
                <span className={s.fieldKey}>Hora</span>
                <span className={`${s.fieldBox} ${s.fieldChanged} num`}>
                  19:00 <span className={s.was}>18:00</span>
                </span>
              </div>
              <div className={s.field}>
                <span className={s.fieldKey}>Campo</span>
                <span className={s.fieldBox}>Campo 2 · Césped artificial</span>
              </div>

              <div className={s.toggleRow}>
                <span className={s.toggle} />
                Avisar a jugadores y familias
                <span className={s.toggleMeta}>24 personas</span>
              </div>

              <div className={s.saveRow}>
                <button className={s.saveBtn}>
                  <IconSend size={13} /> Guardar y avisar
                </button>
              </div>
            </div>
          </Reveal>

          {/* conector */}
          <div className={s.link}>
            <svg className={s.linkSvg} viewBox="0 0 132 120" fill="none" aria-hidden>
              <path className={s.linkPath} d="M2 60 H130" />
            </svg>
            <span className={s.linkBadge}>
              <IconSend size={12} /> 1 acción
            </span>
          </div>

          {/* resultado */}
          <Reveal variant="left" delay={140} className={s.card}>
            <div className={s.cardHead}>
              <IconMessage size={14} />
              Entrega del aviso
              <span className={`${s.cardHeadTag} chip chip-ok`}>
                <i className="dot dot-ok" /> En curso
              </span>
            </div>

            <div className={s.summary}>
              <div className={s.summaryCell}>
                <div className={`${s.summaryNum} num`}>24</div>
                <div className={s.summaryLabel}>Entregados</div>
              </div>
              <div className={s.summaryCell}>
                <div className={`${s.summaryNum} num`}>21</div>
                <div className={s.summaryLabel}>Leídos</div>
              </div>
              <div className={s.summaryCell}>
                <div className={`${s.summaryNum} num`}>18</div>
                <div className={s.summaryLabel}>Respondidos</div>
              </div>
            </div>

            <div className={s.list}>
              {DELIVERY.map((d, i) => (
                <div
                  key={d.name}
                  className={s.row}
                  style={{ ["--d" as string]: `${300 + i * 90}ms` }}
                >
                  <Avatar name={d.name} size={26} />
                  <span>
                    <span className={s.rowName}>{d.name}</span>
                    <span className={s.rowRole}>{d.role}</span>
                  </span>
                  <span className={s.rowChannel}>
                    <IconMessage size={13} />
                    <IconMail size={13} />
                  </span>
                  <span className={stateChip(d.state)}>{d.state}</span>
                  <span className={`${s.rowTime} num`}>
                    {d.time}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <div className={s.kinds}>
          {KINDS.map(({ icon: I, ...k }, i) => (
            <Reveal key={k.title} variant="up" delay={i * 90} className={s.kind}>
              <span className={s.kindIcon}>
                <I size={16} />
              </span>
              <div className={s.kindTitle}>{k.title}</div>
              <p className={s.kindText}>{k.text}</p>
              <p className={s.kindSample}>{k.sample}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
