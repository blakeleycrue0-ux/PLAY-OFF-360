"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import Logo from "../brand/Logo";
import Avatar from "../ui/Avatar";
import { useSesion } from "@/lib/app/sesion";
import {
  IconBell,
  IconCheck,
  IconChevronDown,
  IconDoc,
  IconGrid,
  IconMatch,
  IconMessage,
  IconSend,
  IconSquad,
  IconToday,
} from "../ui/Icon";

const SECCIONES = [
  {
    grupo: "Día a día",
    items: [
      { href: "/app/", label: "Hoy", icon: IconToday },
      { href: "/app/asistente/", label: "Asistente", icon: IconMessage },
    ],
  },
  {
    grupo: "Equipo",
    items: [
      { href: "/app/jugadores/", label: "Jugadores", icon: IconSquad },
      { href: "/app/padres/", label: "Padres y tutores", icon: IconSquad },
      { href: "/app/equipo/", label: "Equipo y club", icon: IconGrid },
    ],
  },
  {
    grupo: "Calendario",
    items: [
      { href: "/app/entrenamientos/", label: "Entrenamientos", icon: IconCheck },
      { href: "/app/partidos/", label: "Partidos", icon: IconMatch },
      { href: "/app/convocatorias/", label: "Convocatorias", icon: IconDoc },
      { href: "/app/asistencia/", label: "Asistencia", icon: IconCheck },
    ],
  },
  {
    grupo: "Comunicación",
    items: [{ href: "/app/comunicaciones/", label: "Comunicaciones", icon: IconSend }],
  },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { cargando, user, equipo, equipos, elegirEquipo, salir } = useSesion();
  const router = useRouter();
  const ruta = usePathname();
  const [menu, setMenu] = useState(false);

  // Guardias de navegación. La seguridad real está en RLS: esto solo evita
  // que alguien se quede mirando una pantalla vacía.
  useEffect(() => {
    if (cargando) return;
    if (!user) {
      router.replace("/entrar/");
      return;
    }
    if (!equipo && ruta !== "/app/bienvenida/" && ruta !== "/app/bienvenida") {
      router.replace("/app/bienvenida/");
    }
  }, [cargando, user, equipo, ruta, router]);

  useEffect(() => setMenu(false), [ruta]);

  if (cargando) {
    return (
      <div className="a-shell">
        <div className="a-main">
          <div
            className="a-wrap"
            style={{ display: "grid", gap: 12, maxWidth: 520, marginTop: 80 }}
          >
            <div className="a-skeleton" style={{ width: "40%", height: 26 }} />
            <div className="a-skeleton" style={{ width: "75%" }} />
            <div className="a-skeleton" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const esBienvenida = ruta.startsWith("/app/bienvenida");

  return (
    <div className="a-shell">
      <header className="a-top">
        <Link href="/app/" className="a-top-brand" aria-label="PLAYOFF30">
          <Logo size={15} markSize={24} gap={8} />
        </Link>

        {equipo && (
          <span className="a-team">
            <select
              value={equipo.id}
              onChange={(e) => elegirEquipo(e.target.value)}
              aria-label="Equipo activo"
            >
              {equipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <IconChevronDown size={13} />
          </span>
        )}

        <div className="a-top-right">
          <Link href="/" className="btn btn-sm btn-ghost">
            Ver la web
          </Link>
          <button className="btn btn-sm btn-ghost" onClick={salir}>
            Salir
          </button>
          <Avatar name={user.email ?? "Entrenador"} size={28} />
          {!esBienvenida && (
            <button
              className="a-burger"
              onClick={() => setMenu((v) => !v)}
              aria-label="Menú"
              aria-expanded={menu}
            >
              <span />
              <span />
            </button>
          )}
        </div>
      </header>

      <div className="a-body">
        {!esBienvenida && (
          <nav className={`a-nav ${menu ? "a-nav-open" : ""}`} aria-label="Secciones">
            {SECCIONES.map((s) => (
              <div key={s.grupo}>
                <div className="a-nav-group">{s.grupo}</div>
                {s.items.map(({ href, label, icon: I }) => {
                  const activo = ruta === href || ruta === href.slice(0, -1);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`a-nav-link ${activo ? "a-nav-link-on" : ""}`}
                    >
                      <I size={16} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            ))}
            <div style={{ marginTop: 24, padding: "0 11px" }}>
              <span className="a-cell-sub">
                <IconBell size={12} /> Los envíos reales a WhatsApp y email todavía no
                están conectados.
              </span>
            </div>
          </nav>
        )}

        <main className="a-main">
          <div className="a-wrap">{children}</div>
        </main>
      </div>
    </div>
  );
}
