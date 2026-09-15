import Reveal from "../ui/Reveal";
import SectionHead from "../ui/SectionHead";
import { Mark } from "../brand/Logo";
import { IconArrow, IconBell, IconCheck, IconDoc, IconMatch } from "../ui/Icon";
import s from "./Contrast.module.css";

const BEFORE = [
  { name: "Grupo de WhatsApp", state: "47 sin leer" },
  { name: "asistencia_v4_FINAL.xlsx", state: "hace 9 días" },
  { name: "Cadena de emails", state: "6 de 24" },
  { name: "Notas del móvil", state: "3 recordatorios" },
  { name: "Llamadas y recados", state: "4 perdidas" },
];

const AFTER = [
  { icon: IconDoc, name: "Convocatoria", val: "16 publicados" },
  { icon: IconCheck, name: "Asistencia", val: "15 de 18" },
  { icon: IconMatch, name: "Partido", val: "sáb · 11:30" },
  { icon: IconBell, name: "Avisos", val: "24 entregados" },
];

export default function Contrast() {
  return (
    <section className={`section ${s.section}`}>
      <div className={s.glow} aria-hidden />
      <div className="field-lines on-dark" aria-hidden />

      <div className="shell">
        <SectionHead
          split
          tone="dark"
          eyebrow="La diferencia"
          title={
            <>
              Cinco sitios.
              <br />O <em>uno</em>.
            </>
          }
          lead="No es que sobren herramientas. Es que ninguna sabe lo que hace la otra, y el pegamento entre todas eres tú."
        />

        <div className={s.compare}>
          <Reveal variant="right" className={`${s.col} ${s.before}`}>
            <div className={s.colHead}>
              <span className={s.colLabel}>Antes</span>
              <span className={s.colMeta} style={{ color: "rgba(255,255,255,0.32)" }}>
                Cinco herramientas
              </span>
            </div>
            <div className={s.beforeStack}>
              {BEFORE.map((b) => (
                <div key={b.name} className={s.beforeRow}>
                  <span className={s.beforeX}>✕</span>
                  <span className={s.beforeName}>{b.name}</span>
                  <span className={s.beforeState}>{b.state}</span>
                </div>
              ))}
            </div>
            <p className={s.beforeFoot}>
              Ninguna habla con la siguiente. Lo que no copies a mano, se pierde.
            </p>
          </Reveal>

          <div className={s.arrow}>
            <i className={s.arrowLine} />
            <span>
              <IconArrow size={17} />
            </span>
          </div>

          <Reveal variant="left" delay={140} className={s.col}>
            <div className={s.colHead}>
              <span className={s.colLabel}>Ahora</span>
              <span className={s.colMeta} style={{ color: "var(--pitch)" }}>
                Un solo sitio
              </span>
            </div>
            <div className={s.afterCard}>
              <div className={s.afterHead}>
                <Mark size={20} />
                <span className={s.afterTitle}>Infantil A · semana 21</span>
                <span className={`${s.afterTag} chip chip-ok`}>
                  <i className="dot dot-ok" /> Al día
                </span>
              </div>
              {AFTER.map(({ icon: I, ...a }) => (
                <div key={a.name} className={s.afterRow}>
                  <span className={s.afterIcon}>
                    <I size={14} />
                  </span>
                  <span className={s.afterName}>{a.name}</span>
                  <span className={s.afterVal}>{a.val}</span>
                </div>
              ))}
            </div>
            <p className={s.afterFoot}>
              Una decisión entra una vez y aparece donde tiene que aparecer.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
