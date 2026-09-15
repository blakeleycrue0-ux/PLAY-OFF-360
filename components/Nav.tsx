"use client";

import { useEffect, useState } from "react";
import Logo from "./brand/Logo";
import { IconArrow } from "./ui/Icon";
import s from "./Nav.module.css";

const LINKS = [
  { href: "#asistente", label: "Asistente", index: "01" },
  { href: "#comunicacion", label: "Comunicación", index: "02" },
  { href: "#equipo", label: "Equipo", index: "03" },
  { href: "#partidos", label: "Partidos", index: "04" },
  { href: "#club", label: "Club", index: "05" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        className={[s.wrap, scrolled ? s.scrolled : "", open ? s.open : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <nav className={s.bar} aria-label="Principal">
          <a href="#top" className={s.brand} aria-label="PLAYOFF30 — inicio">
            <Logo tone="light" />
          </a>

          <div className={s.links}>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className={s.link}>
                {l.label}
              </a>
            ))}
          </div>

          <div className={s.actions}>
            <a href="#probar" className={s.signin}>
              Entrar
            </a>
            <a href="#probar" className={s.cta}>
              Probar PLAYOFF30
              <IconArrow size={15} />
            </a>
            <button
              className={s.burger}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
            >
              <span />
              <span />
            </button>
          </div>
        </nav>
      </div>

      <div className={[s.sheet, open ? s.sheetOpen : ""].join(" ")}>
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className={s.sheetLink}
            onClick={() => setOpen(false)}
          >
            <span>{l.label}</span>
            <span className="num">{l.index}</span>
          </a>
        ))}
        <div className={s.sheetFoot}>
          <a href="#probar" className="btn btn-electric" onClick={() => setOpen(false)}>
            Probar PLAYOFF30
          </a>
          <a
            href="#asistente"
            className="btn btn-ghost-dark"
            onClick={() => setOpen(false)}
          >
            Ver cómo funciona
          </a>
        </div>
      </div>
    </>
  );
}
