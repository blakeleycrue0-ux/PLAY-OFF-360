import Reveal from "../ui/Reveal";
import { IconDoc, IconMail, IconMessage } from "../ui/Icon";
import s from "./Problem.module.css";

const VERDICTS = [
  {
    n: "01",
    text: "Lo preguntas tres veces.",
    aside:
      "En el grupo, por privado y el jueves en el campo. Siguen faltando dos respuestas.",
  },
  {
    n: "02",
    text: "Lo apuntas en dos sitios.",
    aside: "La hoja de cálculo, el cuaderno y un mensaje que te mandaste a ti mismo.",
  },
  {
    n: "03",
    text: "Y el sábado falta alguien.",
    aside:
      "Nadie avisó. O avisó en un chat que se llenó de mensajes a las once de la noche.",
  },
];

export default function Problem() {
  return (
    <section id="problema" className={`section grain ${s.section}`}>
      <div className="shell">
        <div className={s.head}>
          <Reveal variant="fade">
            <span className="eyebrow">El problema</span>
          </Reveal>
          <Reveal variant="up" delay={90}>
            <h2 className={`h2 ${s.title}`}>
              Tu equipo no debería
              <br />
              funcionar <em>así</em>.
            </h2>
          </Reveal>
          <Reveal variant="up" delay={180}>
            <p className="lead" style={{ maxWidth: "52ch" }}>
              Un grupo de WhatsApp a las once de la noche, una hoja de cálculo que solo
              entiendes tú y la memoria del entrenador. Cada semana, otra vez.
            </p>
          </Reveal>
        </div>

        <div className={s.pile}>
          {/* 1 — grupo de padres */}
          <Reveal variant="scale" delay={0} className={`${s.slot} ${s.a1}`}>
            <div className={s.artefact}>
              <div className={s.chatHead}>
                <span className={s.chatAvatar}>IA</span>
                <span>
                  <span className={s.chatTitle}>Infantil A · Padres</span>
                  <span className={s.chatSub}>24 participantes</span>
                </span>
                <span className={s.chatUnread}>47</span>
              </div>
              <div className={s.chatBody}>
                <div className={s.bubble}>
                  <b className={s.bubbleName}>Ramón (padre de Óscar)</b>
                  ¿Al final el sábado a qué hora es?
                </div>
                <div className={s.bubble}>
                  <b className={s.bubbleName}>Carla</b>
                  Yo no puedo llevarlo, ¿alguien va para allá?
                </div>
                <div className={`${s.bubble} ${s.bubbleMe}`}>
                  Lo pongo otra vez: 11:30 en Alcorada 🙏
                </div>
                <div className={s.bubble}>
                  <b className={s.bubbleName}>Rosa</b>
                  Perdón, no había visto el mensaje.
                </div>
              </div>
              <div className={s.chatFoot}>
                <IconMessage size={12} /> 47 mensajes sin leer · 3 respuestas útiles
              </div>
            </div>
          </Reveal>

          {/* 2 — hoja de cálculo */}
          <Reveal variant="scale" delay={110} className={`${s.slot} ${s.a2}`}>
            <div className={s.artefact}>
              <div className={s.sheetHead}>
                <IconDoc size={14} />
                asistencia_infantilA_v4_FINAL.xlsx
                <span className={s.sheetTag}>Editado hace 9 días</span>
              </div>
              <div className={s.grid}>
                <span className={s.gridHead}>Jugador</span>
                <span className={s.gridHead}>10 mar</span>
                <span className={s.gridHead}>12 mar</span>
                <span className={s.gridHead}>14 mar</span>

                <span>Marcos Vidal</span>
                <span className={s.gridOk}>✓</span>
                <span className={s.gridOk}>✓</span>
                <span className={s.gridQ}>?</span>

                <span>Lucas Arriaga</span>
                <span className={s.gridOk}>✓</span>
                <span className={s.gridNo}>✗</span>
                <span className={s.gridQ}>?</span>

                <span>Bruno Salgado</span>
                <span className={s.gridQ}>?</span>
                <span className={s.gridQ}>?</span>
                <span className={s.gridQ}>?</span>

                <span>Gonzalo Mena</span>
                <span className={s.gridOk}>✓</span>
                <span className={s.gridQ}>?</span>
                <span className={s.gridQ}>?</span>
              </div>
            </div>
          </Reveal>

          {/* 3 — email */}
          <Reveal variant="scale" delay={200} className={`${s.slot} ${s.a3}`}>
            <div className={s.artefact}>
              <div className={s.mail}>
                <div className={s.mailTop}>
                  <IconMail size={13} /> Coordinación · para 24 destinatarios
                </div>
                <div className={s.mailSubject}>RE: RE: RE: Convocatoria jornada 21</div>
                <div className={s.mailBody}>
                  “Buenas, perdonad, el campo ha cambiado. Confirmad por aquí, no por
                  WhatsApp, que si no se pierde…”
                </div>
                <div className={s.mailTop} style={{ marginTop: 2 }}>
                  Respondido por 6 de 24
                </div>
              </div>
            </div>
          </Reveal>

          {/* 4 — nota */}
          <Reveal variant="scale" delay={150} className={`${s.slot} ${s.a4}`}>
            <div className={`${s.artefact} ${s.note}`}>
              <p className={s.noteText}>
                llamar madre de Bruno
                <br />
                falta ficha de Mateo
                <br />
                ¿quién lleva el agua?
              </p>
              <div className={s.noteMeta}>Nota del móvil · martes 23:41</div>
            </div>
          </Reveal>

          {/* 5 — llamada perdida */}
          <Reveal variant="scale" delay={250} className={`${s.slot} ${s.a5}`}>
            <div className={`${s.artefact} ${s.call}`}>
              <span className={s.callIcon}>
                <IconMessage size={16} />
              </span>
              <span>
                <span className={s.callTitle}>4 llamadas perdidas</span>
                <span className={s.callSub}>
                  Delegado · ayer 21:12, 21:14, 21:20, 22:03
                </span>
              </span>
            </div>
          </Reveal>

          {/* 6 — captura */}
          <Reveal variant="scale" delay={320} className={`${s.slot} ${s.a6}`}>
            <div className={s.artefact}>
              <div className={s.mail}>
                <div className={s.mailTop}>Captura de pantalla</div>
                <div className={s.mailSubject}>IMG_4471.PNG</div>
                <div className={s.mailBody}>
                  El horario del sábado, fotografiado del tablón del club. Es la única
                  copia que existe.
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <div className={s.verdict}>
          {VERDICTS.map((v, i) => (
            <Reveal key={v.n} variant="up" delay={i * 110} className={s.verdictRow}>
              <span className={`${s.verdictNum} num`}>{v.n}</span>
              <p className={s.verdictText}>{v.text}</p>
              <p className={s.verdictAside}>{v.aside}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
