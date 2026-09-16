import Reveal from "../ui/Reveal";
import { IconArrow } from "../ui/Icon";
import s from "./FinalCTA.module.css";

export default function FinalCTA() {
  return (
    <section id="probar" className={s.section}>
      <div className={s.glow} aria-hidden />
      <div className={s.spark} aria-hidden />
      <div className="field-lines on-dark" aria-hidden />

      <div className="shell">
        <div className={s.inner}>
          <Reveal variant="fade">
            <span className="eyebrow on-dark">Empieza esta semana</span>
          </Reveal>
          <Reveal variant="up" delay={90}>
            <h2 className={s.title}>
              Tú, al campo.
              <br />
              <em>Del resto nos ocupamos.</em>
            </h2>
          </Reveal>
          <Reveal variant="up" delay={200}>
            <p className={s.sub}>
              Monta tu equipo en PLAYOFF30 y prueba la primera convocatoria. Si no te
              ahorra la noche del jueves, lo dejas.
            </p>
          </Reveal>
          <Reveal variant="up" delay={290}>
            <div className={s.ctas}>
              <a href="#probar" className={`btn btn-lg ${s.primary}`}>
                Probar PLAYOFF30
                <IconArrow size={16} />
              </a>
              <a href="#asistente" className="btn btn-lg btn-ghost-dark">
                Ver cómo funciona
              </a>
            </div>
          </Reveal>
          <Reveal variant="fade" delay={380}>
            <p className={s.fine}>
              <b>Hecho para equipos de fútbol.</b> Empieza con uno. Súmalo al club cuando
              quieras.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
