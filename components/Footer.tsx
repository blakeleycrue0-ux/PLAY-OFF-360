import Logo from "./brand/Logo";
import s from "./Footer.module.css";

const COLS = [
  {
    title: "Producto",
    links: ["Asistente", "Comunicación", "Equipo", "Partidos", "Asistencia"],
    hrefs: ["#asistente", "#comunicacion", "#equipo", "#partidos", "#asistencia"],
  },
  {
    title: "Para quién",
    links: ["Entrenadores", "Delegados", "Coordinadores", "Clubes"],
    hrefs: ["#problema", "#problema", "#club", "#club"],
  },
  {
    title: "PLAYOFF30",
    links: ["Cómo funciona", "Probar", "Escríbenos"],
    hrefs: ["#asistente", "#probar", "#probar"],
  },
];

export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className="shell">
        <div className={s.top}>
          <div className={s.brandBlock}>
            <Logo tone="light" size={19} markSize={30} />
            <p className={s.tag}>
              Software de operación diaria para equipos de fútbol. Convocatorias,
              asistencia, partidos y comunicación en un solo sitio.
            </p>
          </div>

          <div className={s.cols}>
            {COLS.map((c) => (
              <div key={c.title}>
                <div className={s.colTitle}>{c.title}</div>
                {c.links.map((l, i) => (
                  <a key={l} href={c.hrefs[i]} className={s.link}>
                    {l}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className={s.bottom}>
          <span>© {new Date().getFullYear()} PLAYOFF30</span>
          <span>Hecho en Mallorca para equipos de fútbol.</span>
          <span className={s.pushRight}>
            <a href="#top">Volver arriba</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
