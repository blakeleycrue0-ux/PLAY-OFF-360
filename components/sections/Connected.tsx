import Avatar from "../ui/Avatar";
import Reveal from "../ui/Reveal";
import SectionHead from "../ui/SectionHead";
import { IconBell, IconCheck, IconClock, IconDoc } from "../ui/Icon";
import s from "./Connected.module.css";

export default function Connected() {
  return (
    <section className={`section ${s.section}`}>
      <div className="shell">
        <SectionHead
          split
          eyebrow="Todos conectados"
          title={
            <>
              La misma información.
              <br />
              Cada uno <em>la suya</em>.
            </>
          }
          lead="El entrenador ve el equipo. El jugador ve su sábado. La familia ve lo que tiene que hacer. Nadie tiene que reenviar nada a nadie."
        />

        <div className={s.rail}>
          <Reveal variant="up" delay={0} className={s.card}>
            <div className={s.role}>
              <i className={s.roleDot} /> Entrenador
            </div>
            <div className={s.screen}>
              <div className={s.big}>12 de 18</div>
              <div className={s.line}>confirmados para el sábado</div>
              <div className={s.sheet}>
                <div className={s.sheetTop}>
                  <i className="dot dot-wait" /> Falta por responder
                </div>
                <div className={s.sheetMain}>Gonzalo, Mateo y Bruno</div>
              </div>
            </div>
            <p className={s.desc}>Decide con la plantilla delante, no de memoria.</p>
          </Reveal>

          <Reveal variant="up" delay={90} className={s.card}>
            <div className={s.role}>
              <i className={s.roleDot} style={{ background: "var(--ok)" }} /> Jugador
            </div>
            <div className={s.screen}>
              <div className={s.sheet}>
                <div className={s.sheetTop}>
                  <IconClock size={11} /> Sábado · 11:30
                </div>
                <div className={s.sheetMain}>CF Alcorada — CD Valmorán</div>
                <div className={s.line}>Citación 10:15 en el club</div>
              </div>
              <div className={s.actions}>
                <span className={`${s.act} ${s.actYes}`}>
                  <IconCheck size={13} /> Puedo
                </span>
                <span className={`${s.act} ${s.actNo}`}>No puedo</span>
              </div>
            </div>
            <p className={s.desc}>Dos botones. Sin escribir en ningún grupo.</p>
          </Reveal>

          <Reveal variant="up" delay={180} className={s.card}>
            <div className={s.role}>
              <i className={s.roleDot} style={{ background: "var(--wait)" }} /> Familia
            </div>
            <div className={s.screen}>
              <div className={s.sheet}>
                <div className={s.sheetTop}>
                  <IconBell size={11} /> Aviso del equipo
                </div>
                <div className={s.sheetMain}>El jueves se entrena a las 19:00</div>
                <div className={s.line}>Antes: 18:00 · Campo 2</div>
              </div>
              <div className={s.miniRow}>
                <Avatar name="Marcos Vidal" size={22} /> Marcos Vidal
                <span className="chip chip-ok">Confirmado</span>
              </div>
            </div>
            <p className={s.desc}>Un solo canal. Y el calendario ya actualizado.</p>
          </Reveal>

          <Reveal variant="up" delay={270} className={s.card}>
            <div className={s.role}>
              <i className={s.roleDot} style={{ background: "var(--no)" }} /> Delegado
            </div>
            <div className={s.screen}>
              <div className={s.miniRow}>
                <IconDoc size={13} /> Acta jornada 20
                <span className="chip chip-ok">Subida</span>
              </div>
              <div className={s.miniRow}>
                <IconDoc size={13} /> Acta jornada 21
                <span className="chip chip-wait">Pendiente</span>
              </div>
              <div className={s.miniRow}>
                <IconCheck size={13} /> Material del sábado
                <span className="chip chip-ok">Listo</span>
              </div>
            </div>
            <p className={s.desc}>Lo suyo, sin tener que preguntar por el chat.</p>
          </Reveal>

          <Reveal variant="up" delay={360} className={s.card}>
            <div className={s.role}>
              <i className={s.roleDot} style={{ background: "var(--electric-lift)" }} />{" "}
              Coordinador
            </div>
            <div className={s.screen}>
              <div className={s.miniRow}>
                Infantil A <span className="chip chip-ok">Al día</span>
              </div>
              <div className={s.miniRow}>
                Cadete B <span className="chip chip-wait">3 sin responder</span>
              </div>
              <div className={s.miniRow}>
                Benjamín C <span className="chip chip-no">Falta el acta</span>
              </div>
            </div>
            <p className={s.desc}>Ve todos los equipos sin entrar en ninguno.</p>
          </Reveal>
        </div>

        <div className={s.closing}>
          <Reveal variant="up">
            <p className={s.closingText}>
              Un equipo no son once jugadores. Son <em>cuarenta personas</em> intentando
              coincidir el sábado.
            </p>
          </Reveal>
          <Reveal variant="up" delay={120}>
            <p className={s.closingAside}>
              Padres que trabajan, hermanos que hay que llevar a otro campo, coches que se
              organizan el viernes por la noche. PLAYOFF30 no lo simplifica de más: solo
              hace que todo el mundo mire el mismo sitio.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
