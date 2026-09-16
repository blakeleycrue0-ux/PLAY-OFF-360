import Logo from "./brand/Logo";
import PreferenciasBoton from "./legal/PreferenciasBoton";
import s from "./Footer.module.css";

const COLS = [
  {
    title: "Producto",
    links: [
      ["Asistente", "/#asistente"],
      ["Comunicación", "/#comunicacion"],
      ["Equipo", "/#equipo"],
      ["Partidos", "/#partidos"],
      ["Asistencia", "/#asistencia"],
    ],
  },
  {
    title: "Para quién",
    links: [
      ["Entrenadores", "/#problema"],
      ["Delegados", "/#problema"],
      ["Coordinadores", "/#club"],
      ["Clubes", "/#club"],
    ],
  },
  {
    title: "PLAYOFF30",
    links: [
      ["Cómo funciona", "/#asistente"],
      ["Probar", "/#probar"],
      ["Escríbenos", "/#probar"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Aviso legal", "/legal/aviso-legal/"],
      ["Privacidad", "/legal/privacidad/"],
      ["Cookies", "/legal/cookies/"],
      ["Términos de uso", "/legal/terminos/"],
    ],
  },
] as const;

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
                {c.links.map(([label, href]) => (
                  <a key={label + href} href={href} className={s.link}>
                    {label}
                  </a>
                ))}
                {c.title === "Legal" && (
                  <PreferenciasBoton variante="enlace" className={s.prefs} />
                )}
              </div>
            ))}
          </div>
        </div>

        <p className={s.disclaimer}>
          Los clubes, equipos, competiciones, campos, jugadores y familias que aparecen en
          esta web son ficticios y se usan únicamente para mostrar el producto. Cualquier
          parecido con entidades o personas reales es casual.
        </p>

        <div className={s.bottom}>
          <span>© {new Date().getFullYear()} PLAYOFF30</span>
          <span>Hecho en España para equipos de fútbol.</span>
          <span className={s.pushRight}>
            <a href="/#top">Volver arriba</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
