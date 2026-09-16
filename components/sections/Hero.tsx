import Chrome from "../product/Chrome";
import TodayScreen from "../product/TodayScreen";
import Reveal from "../ui/Reveal";
import { IconArrow, IconCheck, IconPlay } from "../ui/Icon";
import s from "./Hero.module.css";

const RAIL = [
  { n: "01", label: "Convocatorias", text: "Preparadas, enviadas y respondidas." },
  {
    n: "02",
    label: "Asistencia",
    text: "Entrenamientos y partidos, sin perseguir a nadie.",
  },
  { n: "03", label: "Partidos", text: "Citación, campo, desplazamiento y acta." },
  { n: "04", label: "Comunicación", text: "Cada aviso llega a quien tiene que llegar." },
];

export default function Hero() {
  return (
    <header id="top" className={s.hero}>
      <div className={s.glow} aria-hidden />
      <div className={s.glowLow} aria-hidden />
      <div className="field-lines on-dark" aria-hidden />

      <div className="shell-wide">
        <div className={s.intro}>
          <Reveal variant="fade" delay={40}>
            <span className="eyebrow on-dark">
              Entrenadores · Delegados · Coordinadores
            </span>
          </Reveal>

          <Reveal variant="up" delay={120}>
            <h1 className={s.h1}>
              El puesto de mando
              <br className={s.brDesktop} /> de tu <em>equipo.</em>
            </h1>
          </Reveal>

          <Reveal variant="fade" delay={280}>
            <hr className={s.hair} />
          </Reveal>

          <div className={s.introFoot}>
            <Reveal variant="up" delay={300}>
              <p className={`lead ${s.lead}`}>
                Convocatorias, asistencia, partidos y avisos en un mismo sitio. Le dices a
                PLAYOFF30 lo que necesitas y lo deja preparado para enviar.
              </p>
            </Reveal>

            <Reveal variant="up" delay={380} className={s.actions}>
              <div className={s.ctas}>
                <a href="/entrar/" className={`btn btn-lg ${s.ctaPrimary}`}>
                  Probar PLAYOFF30
                  <IconArrow size={16} />
                </a>
                <a href="#asistente" className="btn btn-lg btn-ghost-dark">
                  <IconPlay size={15} />
                  Ver cómo funciona
                </a>
              </div>
              <div className={s.trust}>
                <b>Hecho para equipos de fútbol.</b>
                <i className={s.trustSep} />
                <span>Base, juvenil y amateur.</span>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      <div className="shell-wide">
        <Reveal variant="rise" delay={120} amount={0.04} className={s.stage}>
          <Chrome active="Hoy">
            <TodayScreen />
          </Chrome>

          <div className={`${s.overlay} ${s.toastPos}`}>
            <div className={s.toast}>
              <span className={s.toastIcon}>
                <IconCheck size={16} />
              </span>
              <span>
                <span className={s.toastTitle}>Convocatoria enviada</span>
                <span className={s.toastSub}>18 familias · WhatsApp y email</span>
              </span>
            </div>
          </div>

          <div className={`${s.overlay} ${s.pulsePos}`}>
            <div className={s.pulseCard}>
              <div className={s.pulseHead}>
                <i className="dot dot-live" /> Respuestas en vivo
              </div>
              <div className={s.pulseRow}>
                <b className="num">12</b> Disponibles
                <i className={s.pulseTrack}>
                  <i style={{ width: "67%", background: "var(--ok)" }} />
                </i>
              </div>
              <div className={s.pulseRow}>
                <b className="num">3</b> No pueden
                <i className={s.pulseTrack}>
                  <i style={{ width: "17%", background: "var(--no)" }} />
                </i>
              </div>
              <div className={s.pulseRow}>
                <b className="num">3</b> Sin respuesta
                <i className={s.pulseTrack}>
                  <i style={{ width: "17%", background: "var(--wait)" }} />
                </i>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="shell-wide">
        <div className={s.rail}>
          {RAIL.map((r, i) => (
            <Reveal key={r.n} variant="up" delay={i * 90} className={s.railItem}>
              <div className={`${s.railNum} num`}>{r.n}</div>
              <div className={s.railLabel}>{r.label}</div>
              <div className={s.railText}>{r.text}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </header>
  );
}
