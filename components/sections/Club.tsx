"use client";

import { TEAMS } from "@/lib/data";
import { useInView } from "@/lib/useInView";
import { Mark } from "../brand/Logo";
import Counter from "../ui/Counter";
import Reveal from "../ui/Reveal";
import SectionHead from "../ui/SectionHead";
import s from "./Club.module.css";

export default function Club() {
  const { ref, inView } = useInView<HTMLDivElement>({ amount: 0.12 });

  return (
    <section id="club" className={`section grain ${s.section}`}>
      <div className="shell">
        <SectionHead
          split
          eyebrow="Del equipo al club"
          title={
            <>
              Empieza con un equipo.
              <br />
              Crece con el <em>club</em>.
            </>
          }
          lead="No hace falta convencer a la directiva para empezar. Lo montas para tu equipo el martes. Si funciona, el club entero puede entrar detrás."
          aside="Cada entrenador sigue mandando en lo suyo. La coordinación solo ve lo que necesita ver."
        />

        <div className={s.wrap} ref={ref}>
          <Reveal variant="up" className={s.summary}>
            <div className={s.sumCell}>
              <span className={s.sumNum}>
                <Counter to={6} />
              </span>
              <span className={s.sumLabel}>Equipos en el club</span>
            </div>
            <div className={s.sumCell}>
              <span className={s.sumNum}>
                <Counter to={102} />
              </span>
              <span className={s.sumLabel}>Jugadores fichados</span>
            </div>
            <div className={s.sumCell}>
              <span className={s.sumNum}>
                <Counter to={4} />
              </span>
              <span className={s.sumLabel}>Avisos esta semana</span>
            </div>
            <div className={`${s.sumCell} ${s.sumBrand}`}>
              <Mark size={34} />
              <span className={s.sumBrandText}>
                <b>CD Son Ferrer</b>
                Temporada 2025/26 · coordinación de fútbol base
              </span>
            </div>
          </Reveal>

          <div className={`${s.teams} ${inView ? s.isIn : ""}`}>
            {TEAMS.map((t, i) => (
              <div
                key={t.name}
                className={s.team}
                style={{ ["--d" as string]: `${140 + i * 80}ms` }}
              >
                <div className={s.teamTop}>
                  <span className={s.teamCrest}>SFE</span>
                  <span>
                    <span className={s.teamName}>{t.name}</span>
                    <span className={s.teamCoach}>{t.coach}</span>
                  </span>
                </div>
                <div className={s.teamFoot}>
                  <span className={`chip chip-${t.tone}`}>
                    <i className={`dot dot-${t.tone}`} /> {t.state}
                  </span>
                  <span className={s.teamPlayers}>{t.players} jugadores</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={s.note}>
          <Reveal variant="up">
            <p className={s.noteBig}>
              Un club no cambia de herramienta. Cambia <em>de equipo en equipo</em>.
            </p>
          </Reveal>
          <Reveal variant="up" delay={120}>
            <p className={s.noteText}>
              Por eso PLAYOFF30 funciona igual con un infantil que con seis categorías: la
              unidad es el equipo. Cuando se suman varios, la coordinación ve el conjunto
              sin que nadie tenga que rehacer su trabajo.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
