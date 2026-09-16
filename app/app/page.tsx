"use client";

import Link from "next/link";
import { useSesion } from "@/lib/app/sesion";
import {
  disponibilidadDe,
  listarEntrenamientos,
  listarJugadores,
  listarMensajes,
  listarPartidos,
} from "@/lib/app/datos";
import { fechaLarga, haceTiempo, hora, nombreCorto, saludo } from "@/lib/app/fechas";
import { AvatarStack } from "@/components/ui/Avatar";
import { IconArrow, IconClock, IconPin } from "@/components/ui/Icon";
import { Cargando, Vacio, useDatos } from "@/components/app/piezas";

export default function Hoy() {
  const { equipo, user } = useSesion();
  const equipoId = equipo?.id ?? "";

  const { datos, cargando } = useDatos(async () => {
    if (!equipoId) return null;
    const [jugadores, partidos, entrenos, mensajes] = await Promise.all([
      listarJugadores(equipoId),
      listarPartidos(equipoId),
      listarEntrenamientos(equipoId),
      listarMensajes(equipoId),
    ]);
    const ahora = Date.now();
    const partido =
      [...partidos].reverse().find((p) => new Date(p.kickoff_at).getTime() > ahora) ??
      null;
    const entreno =
      [...entrenos].reverse().find((e) => new Date(e.starts_at).getTime() > ahora) ??
      null;
    const disp = partido ? await disponibilidadDe(partido.id) : [];
    return { jugadores, partido, entreno, mensajes: mensajes.slice(0, 5), disp };
  }, [equipoId]);

  const nombre = nombreCorto(user);
  const jugadores = datos?.jugadores ?? [];
  const disp = datos?.disp ?? [];
  const si = disp.filter((d) => d.status === "yes");
  const no = disp.filter((d) => d.status === "no");
  const sin = jugadores.length - si.length - no.length;

  return (
    <>
      <div className="a-head">
        <div>
          <h1 className="a-title">
            {saludo()}, {nombre}.
          </h1>
          <p className="a-sub">
            {equipo?.name} · {equipo?.category ?? "Sin categoría"} ·{" "}
            {equipo?.season ?? "Sin temporada"}
          </p>
        </div>
        <div className="a-head-actions">
          <Link href="/app/asistente/" className="btn btn-sm btn-primary">
            Pedir algo al asistente <IconArrow size={14} />
          </Link>
        </div>
      </div>

      {cargando ? (
        <div className="a-panel">
          <Cargando />
        </div>
      ) : jugadores.length === 0 ? (
        <div className="a-panel">
          <Vacio
            titulo="Tu equipo está vacío"
            texto="Empieza añadiendo la plantilla. Después podrás crear partidos, pasar lista y preparar convocatorias."
          />
          <div className="a-panel-body" style={{ paddingTop: 0 }}>
            <Link href="/app/jugadores/" className="btn btn-sm btn-primary">
              Añadir jugadores
            </Link>
          </div>
        </div>
      ) : (
        <div className="a-grid a-grid-side">
          <div>
            <div className="a-grid a-grid-2">
              <div className="a-panel">
                <div className="a-panel-head">
                  <span className="a-panel-title">Disponibles el próximo partido</span>
                </div>
                <div className="a-panel-body" style={{ display: "grid", gap: 10 }}>
                  <span
                    className="a-num"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "2.2rem",
                      fontWeight: 660,
                      letterSpacing: "-0.05em",
                      lineHeight: 1,
                    }}
                  >
                    {si.length}
                  </span>
                  <span className="a-cell-sub">
                    {no.length} no pueden · {Math.max(0, sin)} sin responder
                  </span>
                  {si.length > 0 && (
                    <AvatarStack
                      names={si
                        .map(
                          (d) => jugadores.find((j) => j.id === d.player_id)?.full_name,
                        )
                        .filter((n): n is string => Boolean(n))}
                      size={24}
                      max={7}
                    />
                  )}
                </div>
              </div>

              <div className="a-panel">
                <div className="a-panel-head">
                  <span className="a-panel-title">Plantilla</span>
                </div>
                <div className="a-panel-body" style={{ display: "grid", gap: 10 }}>
                  <span
                    className="a-num"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "2.2rem",
                      fontWeight: 660,
                      letterSpacing: "-0.05em",
                      lineHeight: 1,
                    }}
                  >
                    {jugadores.length}
                  </span>
                  <span className="a-cell-sub">jugadores en {equipo?.name}</span>
                  <Link href="/app/jugadores/" className="btn btn-sm btn-ghost">
                    Ver plantilla
                  </Link>
                </div>
              </div>
            </div>

            <div className="a-panel">
              <div className="a-panel-head">
                <span className="a-panel-title">Últimas comunicaciones</span>
                <Link href="/app/comunicaciones/" className="a-panel-meta">
                  Ver todas
                </Link>
              </div>
              {(datos?.mensajes ?? []).length === 0 ? (
                <Vacio
                  titulo="Nada enviado todavía"
                  texto="Publica una convocatoria o redacta un aviso y aparecerá aquí."
                />
              ) : (
                (datos?.mensajes ?? []).map((m) => (
                  <div
                    key={m.id}
                    className="a-row"
                    style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span className="a-cell-name">{m.subject}</span>
                      <span className="a-cell-sub">
                        {m.recipients_count} destinatarios
                      </span>
                    </span>
                    <span className="a-cell-sub">{haceTiempo(m.created_at)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="a-panel">
              <div className="a-panel-head">
                <span className="a-panel-title">Próximo partido</span>
              </div>
              {datos?.partido ? (
                <div className="a-panel-body" style={{ display: "grid", gap: 9 }}>
                  <span className="chip chip-blue" style={{ justifySelf: "start" }}>
                    {fechaLarga(datos.partido.kickoff_at)} ·{" "}
                    {hora(datos.partido.kickoff_at)}
                  </span>
                  <span className="a-cell-name" style={{ fontSize: "1.05rem" }}>
                    {datos.partido.is_home
                      ? `${equipo?.name} — ${datos.partido.opponent}`
                      : `${datos.partido.opponent} — ${equipo?.name}`}
                  </span>
                  {datos.partido.venue && (
                    <span className="a-cell-sub">
                      <IconPin size={12} /> {datos.partido.venue}
                    </span>
                  )}
                  {datos.partido.meeting_at && (
                    <span className="a-cell-sub">
                      <IconClock size={12} /> Citación {hora(datos.partido.meeting_at)}
                    </span>
                  )}
                  <Link href="/app/convocatorias/" className="btn btn-sm btn-primary">
                    Preparar convocatoria
                  </Link>
                </div>
              ) : (
                <Vacio titulo="Sin partidos" texto="Crea el próximo desde Partidos." />
              )}
            </div>

            <div className="a-panel">
              <div className="a-panel-head">
                <span className="a-panel-title">Próximo entrenamiento</span>
              </div>
              {datos?.entreno ? (
                <div className="a-panel-body" style={{ display: "grid", gap: 8 }}>
                  <span className="a-cell-name">
                    {fechaLarga(datos.entreno.starts_at)}
                  </span>
                  <span className="a-cell-sub">
                    {hora(datos.entreno.starts_at)} · {datos.entreno.pitch ?? "Sin campo"}
                  </span>
                  <Link href="/app/entrenamientos/" className="btn btn-sm btn-ghost">
                    Pasar lista
                  </Link>
                </div>
              ) : (
                <Vacio
                  titulo="Sin entrenamientos"
                  texto="Créalos desde Entrenamientos."
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
