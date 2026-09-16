"use client";

import Link from "next/link";
import { useSesion } from "@/lib/app/sesion";
import { listarJugadores, listarTutores } from "@/lib/app/datos";
import Avatar from "@/components/ui/Avatar";
import { IconPlus } from "@/components/ui/Icon";
import { Cargando, useDatos } from "@/components/app/piezas";

const ROLES: Record<string, string> = {
  owner: "Responsable",
  coach: "Entrenador",
  delegate: "Delegado",
  coordinator: "Coordinador",
};

export default function EquipoYClub() {
  const { equipo, club, equipos, pertenencias, user } = useSesion();
  const equipoId = equipo?.id ?? "";

  const { datos, cargando } = useDatos(
    async () =>
      equipoId
        ? {
            jugadores: (await listarJugadores(equipoId)).length,
            tutores: (await listarTutores(equipoId)).length,
          }
        : { jugadores: 0, tutores: 0 },
    [equipoId],
  );

  return (
    <>
      <div className="a-head">
        <div>
          <h1 className="a-title">{equipo?.name ?? "Equipo"}</h1>
          <p className="a-sub">
            {club?.name} · {equipo?.category ?? "Sin categoría"} ·{" "}
            {equipo?.season ?? "Sin temporada"}
          </p>
        </div>
        <div className="a-head-actions">
          <Link href="/app/bienvenida/" className="btn btn-sm btn-ghost">
            <IconPlus size={14} /> Añadir otro equipo
          </Link>
        </div>
      </div>

      <div className="a-grid a-grid-2">
        <div className="a-panel">
          <div className="a-panel-head">
            <span className="a-panel-title">Resumen</span>
          </div>
          {cargando ? (
            <Cargando filas={2} />
          ) : (
            <>
              <div
                className="a-row"
                style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}
              >
                <span className="a-cell-name">Jugadores</span>
                <span className="a-num" style={{ fontWeight: 620 }}>
                  {datos?.jugadores ?? 0}
                </span>
              </div>
              <div
                className="a-row"
                style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}
              >
                <span className="a-cell-name">Padres y tutores</span>
                <span className="a-num" style={{ fontWeight: 620 }}>
                  {datos?.tutores ?? 0}
                </span>
              </div>
              <div
                className="a-row"
                style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}
              >
                <span className="a-cell-name">Equipos en el club</span>
                <span className="a-num" style={{ fontWeight: 620 }}>
                  {equipos.length}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="a-panel">
          <div className="a-panel-head">
            <span className="a-panel-title">Quién tiene acceso</span>
          </div>
          {pertenencias.map((p) => (
            <div
              key={p.id}
              className="a-row"
              style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}
            >
              <span className="a-cell-main">
                <Avatar name={user?.email ?? "Tú"} size={28} />
                <span style={{ minWidth: 0 }}>
                  <span className="a-cell-name">
                    {p.user_id === user?.id ? "Tú" : "Miembro"}
                  </span>
                  <span className="a-cell-sub">{user?.email}</span>
                </span>
              </span>
              <span className="chip chip-neutral">{ROLES[p.role] ?? p.role}</span>
            </div>
          ))}
          <div className="a-panel-body">
            <p className="a-hint">
              Invitar a otros entrenadores o delegados todavía no está montado. De momento
              cada cuenta lleva sus propios equipos.
            </p>
          </div>
        </div>
      </div>

      <div className="a-panel">
        <div className="a-panel-head">
          <span className="a-panel-title">Equipos del club</span>
        </div>
        {equipos.map((t) => (
          <div
            key={t.id}
            className="a-row"
            style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}
          >
            <span style={{ minWidth: 0 }}>
              <span className="a-cell-name">{t.name}</span>
              <span className="a-cell-sub">
                {t.category ?? "Sin categoría"} · {t.season ?? "—"}
              </span>
            </span>
            {t.id === equipo?.id && <span className="chip chip-blue">Activo</span>}
          </div>
        ))}
      </div>
    </>
  );
}
