"use client";

import { useSesion } from "@/lib/app/sesion";
import { asistenciaDe, listarEntrenamientos, listarJugadores } from "@/lib/app/datos";
import type { AsistenciaEntreno, Entrenamiento, Jugador } from "@/lib/supabase/types";
import { fechaLarga } from "@/lib/app/fechas";
import Avatar from "@/components/ui/Avatar";
import { AvisoError, Cargando, Vacio, useDatos } from "@/components/app/piezas";

type Carga = {
  entrenos: Entrenamiento[];
  jugadores: Jugador[];
  registros: Record<string, AsistenciaEntreno[]>;
};

export default function Asistencia() {
  const { equipo } = useSesion();
  const equipoId = equipo?.id ?? "";

  const { datos, cargando, error } = useDatos<Carga>(async () => {
    if (!equipoId) return { entrenos: [], jugadores: [], registros: {} };
    const entrenos = (await listarEntrenamientos(equipoId)).slice(0, 8);
    const jugadores = await listarJugadores(equipoId);
    const pares = await Promise.all(
      entrenos.map(async (e) => [e.id, await asistenciaDe(e.id)] as const),
    );
    return { entrenos, jugadores, registros: Object.fromEntries(pares) };
  }, [equipoId]);

  const entrenos = datos?.entrenos ?? [];
  const jugadores = datos?.jugadores ?? [];
  const registros = datos?.registros ?? {};

  const contar = (id: string, v: string) =>
    (registros[id] ?? []).filter((r) => r.status === v).length;

  /** Porcentaje de sesiones a las que un jugador dijo que sí. */
  function porcentaje(jugadorId: string) {
    const conDato = entrenos.filter((e) =>
      (registros[e.id] ?? []).some((r) => r.player_id === jugadorId),
    );
    if (!conDato.length) return null;
    const si = conDato.filter((e) =>
      (registros[e.id] ?? []).some(
        (r) => r.player_id === jugadorId && r.status === "yes",
      ),
    ).length;
    return Math.round((si / conDato.length) * 100);
  }

  return (
    <>
      <div className="a-head">
        <div>
          <h1 className="a-title">Asistencia</h1>
          <p className="a-sub">
            Las últimas {entrenos.length} sesiones, sesión a sesión y jugador a jugador.
          </p>
        </div>
      </div>

      {cargando ? (
        <div className="a-panel">
          <Cargando />
        </div>
      ) : error ? (
        <div className="a-panel">
          <AvisoError mensaje={error} />
        </div>
      ) : entrenos.length === 0 ? (
        <div className="a-panel">
          <Vacio
            titulo="Todavía no hay datos"
            texto="Crea entrenamientos y pasa lista: aquí verás la evolución."
          />
        </div>
      ) : (
        <div className="a-grid a-grid-side">
          <div className="a-panel">
            <div className="a-panel-head">
              <span className="a-panel-title">Por jugador</span>
              <span className="a-panel-meta">% de sesiones a las que viene</span>
            </div>
            {jugadores.map((j) => {
              const p = porcentaje(j.id);
              return (
                <div
                  key={j.id}
                  className="a-row"
                  style={{ gridTemplateColumns: "minmax(0,1fr) 120px 50px" }}
                >
                  <span className="a-cell-main">
                    <Avatar name={j.full_name} size={28} />
                    <span className="a-cell-name">{j.full_name}</span>
                  </span>
                  <span
                    style={{
                      height: 6,
                      borderRadius: 4,
                      background: "rgba(6,8,15,0.07)",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        height: "100%",
                        width: `${p ?? 0}%`,
                        borderRadius: 4,
                        background:
                          p === null
                            ? "transparent"
                            : p >= 85
                              ? "var(--ok)"
                              : p >= 60
                                ? "var(--wait)"
                                : "var(--no)",
                        transition: "width .7s var(--ease)",
                      }}
                    />
                  </span>
                  <span className="a-num a-cell-sub" style={{ textAlign: "right" }}>
                    {p === null ? "—" : `${p}%`}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="a-panel">
            <div className="a-panel-head">
              <span className="a-panel-title">Por sesión</span>
            </div>
            {entrenos.map((e) => (
              <div
                key={e.id}
                className="a-row"
                style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}
              >
                <span style={{ minWidth: 0 }}>
                  <span className="a-cell-name">{fechaLarga(e.starts_at)}</span>
                  <span className="a-cell-sub">{e.pitch ?? "Sin campo"}</span>
                </span>
                <span style={{ display: "flex", gap: 5 }}>
                  <span className="chip chip-ok">{contar(e.id, "yes")}</span>
                  <span className="chip chip-no">{contar(e.id, "no")}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
