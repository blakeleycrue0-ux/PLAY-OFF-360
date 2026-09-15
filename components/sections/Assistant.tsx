"use client";

import { useInView } from "@/lib/useInView";
import { useSequence, useTypewriter } from "@/lib/useSequence";
import { Mark } from "../brand/Logo";
import Reveal from "../ui/Reveal";
import { AvatarStack } from "../ui/Avatar";
import { IconArrow, IconCheck, IconDoc, IconSend } from "../ui/Icon";
import s from "./Assistant.module.css";

const ASK_1 = "Pregunta a los padres del Infantil A quién estará disponible el sábado.";
const ASK_2 = "¿Quién ha confirmado?";
const ASK_3 = "Recuérdaselo a los que no han contestado.";

const NOTES = [
  {
    n: "01",
    title: "Conoce el contexto",
    text: "Sabe quién está en la plantilla, quién responde por cada jugador y qué hay esta semana en el calendario.",
  },
  {
    n: "02",
    title: "Prepara, no improvisa",
    text: "Redacta la convocatoria, elige los destinatarios y propone la hora. Tú lees y envías.",
  },
  {
    n: "03",
    title: "Deja rastro",
    text: "Cada respuesta queda registrada junto al partido. No hay que buscarla en ningún chat.",
  },
];

/** step timeline (ms between stages) */
const TIMELINE = [400, 2100, 900, 1400, 1300, 900, 1500, 1100, 900, 1200];

export default function Assistant() {
  const { ref, inView } = useInView<HTMLDivElement>({ amount: 0.22 });
  const step = useSequence(inView, TIMELINE);

  const t1 = useTypewriter(ASK_1, step >= 0, 20);
  const t2 = useTypewriter(ASK_2, step >= 5, 26);
  const t3 = useTypewriter(ASK_3, step >= 8, 22);

  const on = (n: number) => (step >= n ? s.stepIn : "");
  const sent = step >= 4;

  return (
    <section id="asistente" className={`section grain ${s.section}`}>
      <div className="shell">
        <div className={s.layout}>
          <div className={s.aside}>
            <Reveal variant="fade">
              <span className="eyebrow">El asistente</span>
            </Reveal>
            <Reveal variant="up" delay={90}>
              <h2 className={`h2 ${s.title}`}>
                Se lo pides.
                <br />
                Lo deja <em>listo</em>.
              </h2>
            </Reveal>
            <Reveal variant="up" delay={170}>
              <p className={`lead ${s.lead}`}>
                Escribes lo que necesitas igual que se lo dirías a tu segundo entrenador.
                PLAYOFF30 lo prepara y te lo deja delante. No sale nada sin que tú lo
                apruebes.
              </p>
            </Reveal>

            <div className={s.notes}>
              {NOTES.map((n, i) => (
                <Reveal key={n.n} variant="up" delay={i * 100} className={s.note}>
                  <span className={`${s.noteNum} num`}>{n.n}</span>
                  <div>
                    <div className={s.noteTitle}>{n.title}</div>
                    <p className={s.noteText}>{n.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal variant="scale" delay={120} amount={0.08}>
            <div ref={ref} className={`ui ${s.console}`}>
              <div className={s.head}>
                <Mark size={19} />
                <span className={s.headTitle}>Asistente · Infantil A</span>
                <span className={s.headMeta}>
                  <span className={s.headPill}>
                    <IconDoc size={11} /> Jornada 21
                  </span>
                  <span className={s.headPill}>
                    <i className="dot dot-live" /> En línea
                  </span>
                </span>
              </div>

              <div className={s.thread}>
                {/* 1 — la petición */}
                <div className={`${s.step} ${s.ask} ${on(0)}`}>
                  {t1.text}
                  {!t1.done && <i className={s.caret} />}
                </div>

                {/* 2 — respuesta + borrador */}
                <div className={`${s.step} ${s.reply} ${on(1)}`}>
                  <span className={s.replyMark}>
                    <Mark size={15} tone="light" />
                  </span>
                  <div className={s.replyBody}>
                    {step === 1 ? (
                      <span className={s.thinking}>
                        <i />
                        <i />
                        <i />
                      </span>
                    ) : (
                      <p className={s.replyText}>
                        He preparado la convocatoria para <b>18 familias</b>. Faltan dos
                        contactos por verificar, los he marcado.
                      </p>
                    )}

                    <div className={`${s.step} ${s.draft} ${on(2)}`}>
                      <div className={s.draftHead}>
                        <IconDoc size={13} />
                        Convocatoria · Jornada 21
                        <span className={`chip chip-blue ${s.draftTag}`}>Borrador</span>
                      </div>
                      <div className={s.draftBody}>
                        <div className={s.draftLine}>
                          <span className={s.draftKey}>Partido</span>
                          <span className={s.draftVal}>
                            CE Constància — CD Son Ferrer
                          </span>
                        </div>
                        <div className={s.draftLine}>
                          <span className={s.draftKey}>Cuándo</span>
                          <span className={`${s.draftVal} num`}>
                            Sábado 14 de marzo · 11:30 · Inca
                          </span>
                        </div>
                        <div className={s.draftLine}>
                          <span className={s.draftKey}>Para</span>
                          <span className={s.draftVal}>
                            18 familias · WhatsApp y email
                          </span>
                        </div>
                        <div className={s.draftMsg}>
                          «Hola. El sábado jugamos fuera, en el Camp Municipal des Cos
                          (Inca), a las 11:30. Salimos del club a las 10:15. Responde aquí
                          si tu hijo puede venir — con un toque vale.»
                        </div>
                      </div>
                      <div className={s.draftActions}>
                        <button className={s.ghostBtn}>Revisar mensaje</button>
                        <button
                          className={`${s.sendBtn} ${sent ? s.sendBtnDone : ""}`}
                          type="button"
                        >
                          {sent ? (
                            <>
                              <IconCheck size={13} /> Enviada
                            </>
                          ) : (
                            <>
                              <IconSend size={13} /> Enviar
                            </>
                          )}
                        </button>
                        <span className={s.draftNote}>
                          {sent ? "Hoy, 19:41" : "Nada se envía sin tu visto bueno"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 — dos días después */}
                <div className={`${s.step} ${s.divider} ${on(5)}`}>DOS DÍAS DESPUÉS</div>

                <div className={`${s.step} ${s.ask} ${on(5)}`}>
                  {t2.text}
                  {step >= 5 && !t2.done && <i className={s.caret} />}
                </div>

                <div className={`${s.step} ${s.reply} ${on(6)}`}>
                  <span className={s.replyMark}>
                    <Mark size={15} tone="light" />
                  </span>
                  <div className={s.replyBody}>
                    <div className={s.results}>
                      <div className={s.resultsGrid}>
                        <div className={s.resultCell}>
                          <div className={`${s.resultNum} num`}>12</div>
                          <div className={s.resultLabel}>Confirmados</div>
                          <div className={s.resultBar}>
                            <i
                              style={{
                                width: step >= 6 ? "67%" : 0,
                                background: "var(--ok)",
                              }}
                            />
                          </div>
                        </div>
                        <div className={s.resultCell}>
                          <div className={`${s.resultNum} num`}>3</div>
                          <div className={s.resultLabel}>No pueden</div>
                          <div className={s.resultBar}>
                            <i
                              style={{
                                width: step >= 6 ? "17%" : 0,
                                background: "var(--no)",
                              }}
                            />
                          </div>
                        </div>
                        <div className={s.resultCell}>
                          <div className={`${s.resultNum} num`}>3</div>
                          <div className={s.resultLabel}>Sin respuesta</div>
                          <div className={s.resultBar}>
                            <i
                              style={{
                                width: step >= 6 ? "17%" : 0,
                                background: "var(--wait)",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className={s.resultsFoot}>
                        <AvatarStack
                          names={[
                            "Pau Server",
                            "Hugo Nadal",
                            "Marc Vidal",
                            "Iker Salas",
                            "Nico Tous",
                            "Sergi Munar",
                            "Biel Company",
                            "Jan Oliver",
                          ]}
                          size={20}
                          max={5}
                        />
                        <span>
                          Sin respuesta: Guillem Mas, Martí Riera y Bruno Sastre.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 — recordatorio */}
                <div className={`${s.step} ${s.ask} ${on(8)}`}>
                  {t3.text}
                  {step >= 8 && !t3.done && <i className={s.caret} />}
                </div>

                <div className={`${s.step} ${s.reply} ${on(9)}`}>
                  <span className={s.replyMark}>
                    <Mark size={15} tone="light" />
                  </span>
                  <div className={s.replyBody}>
                    <p className={s.replyText}>
                      Recordatorio enviado a <b>3 familias</b>. Te aviso en cuanto
                      respondan.
                    </p>
                    <div className={s.confirmRow}>
                      <span className="chip chip-ok">
                        <IconCheck size={11} /> Guillem Mas
                      </span>
                      <span className="chip chip-ok">
                        <IconCheck size={11} /> Martí Riera
                      </span>
                      <span className="chip chip-ok">
                        <IconCheck size={11} /> Bruno Sastre
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={s.composer}>
                <span className={s.composerInput}>Escribe lo que necesitas…</span>
                <span className={s.composerBtn}>
                  <IconArrow size={16} />
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
