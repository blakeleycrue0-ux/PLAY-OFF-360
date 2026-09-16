import type { ReactNode } from "react";
import Nav from "../Nav";
import Footer from "../Footer";
import CookieConsent from "../CookieConsent";
import { ACTUALIZADO, hayPendientes, pendiente } from "@/lib/legal";
import { IconArrow } from "../ui/Icon";
import s from "./LegalPage.module.css";

export type Seccion = { id: string; titulo: string };

/** Muestra un dato del titular, o lo marca como pendiente si no se ha rellenado. */
export function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  if (!valor) return null;
  return (
    <div className={s.dato}>
      <span className={s.datoKey}>{etiqueta}</span>
      <span className={s.datoVal}>
        {pendiente(valor) ? <span className={s.pendiente}>{valor}</span> : valor}
      </span>
    </div>
  );
}

export function Ficha({ children }: { children: ReactNode }) {
  return <div className={s.datos}>{children}</div>;
}

export default function LegalPage({
  titulo,
  entradilla,
  secciones,
  children,
}: {
  titulo: string;
  entradilla: string;
  secciones: Seccion[];
  children: ReactNode;
}) {
  return (
    <div className={s.page}>
      <Nav />

      <header className={s.hero}>
        <div className={s.glow} aria-hidden />
        <div className="field-lines on-dark" aria-hidden />
        <div className="shell">
          <div className={s.heroInner}>
            <span className="eyebrow on-dark">Información legal</span>
            <h1 className={s.title}>{titulo}</h1>
            <p className={s.meta}>
              {entradilla} · Última actualización: {ACTUALIZADO}
            </p>
          </div>
        </div>
      </header>

      <main className={`section-tight ${s.body}`}>
        <div className="shell">
          {hayPendientes() && (
            <div className={s.aviso} role="status">
              <span className={s.avisoIcon} aria-hidden>
                ⚠
              </span>
              <p className={s.avisoText}>
                <strong>Este texto todavía no está completo.</strong>
                Faltan los datos identificativos del titular del sitio, que son
                obligatorios y no se pueden dar por supuestos. Se rellenan una sola vez en{" "}
                <code>lib/legal.ts</code> y este aviso desaparece solo. Conviene además
                que un abogado revise estas páginas antes de publicarlas.
              </p>
            </div>
          )}

          <div className={s.layout}>
            <nav className={s.toc} aria-label="Índice">
              <div className={s.tocTitle}>En esta página</div>
              {secciones.map((sec) => (
                <a key={sec.id} href={`#${sec.id}`} className={s.tocLink}>
                  {sec.titulo}
                </a>
              ))}
            </nav>

            <div className={s.prose}>
              {children}

              <div className={s.volver}>
                <a href="/" className="btn btn-sm btn-ghost">
                  <IconArrow size={14} /> Volver a la portada
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <CookieConsent />
    </div>
  );
}

export { s as legalStyles };
