"use client";

import { useCallback, useEffect, useState } from "react";
import { useSesion } from "@/lib/app/sesion";
import {
  asistenciaDe,
  borrarEntrenamiento,
  fijarAsistencia,
  guardarEntrenamiento,
  listarEntrenamientos,
  listarJugadores,
} from "@/lib/app/datos";
import { mensajeDeError } from "@/lib/supabase/client";
import type { Disponibilidad, Entrenamiento, Jugador } from "@/lib/supabase/types";
import { desdeInput, fechaLarga, hora, paraInput, esFuturo } from "@/lib/app/fechas";
import Avatar from "@/components/ui/Avatar";
import { IconPlus } from "@/components/ui/Icon";
import {
  AvisoError,
  Cajon,
  Cargando,
  Selector,
  Vacio,
  useDatos,
} from "@/components/app/piezas";

export default function Entrenamientos() {
  const { equipo } = useSesion();
  const equipoId = equipo?.id ?? "";

  const { datos, cargando, error, refrescar } = useDatos(
    async () =>
      equipoId
        ? {
            entrenos: await listarEntrenamientos(equipoId),
            jugadores: await listarJugadores(equipoId),
          }
        : { entrenos: [] as Entrenamiento[], jugadores: [] as Jugador[] },
    [equipoId],
  );

  const entrenos = datos?.entrenos ?? [];
  const jugadores = datos?.jugadores ?? [];

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Entrenamiento | null>(null);
  const [cuando, setCuando] = useState("");
  const [campo, setCampo] = useState("");
  const [fallo, setFallo] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [lista, setLista] = useState<Entrenamiento | null>(null);
  const [estados, setEstados] = useState<Record<string, Disponibilidad>>({});

  const abrirLista = useCallback(async (e: Entrenamiento) => {
    setLista(e);
    const filas = await asistenciaDe(e.id);
    setEstados(Object.fromEntries(filas.map((f) => [f.player_id, f.status])));
  }, []);

  function nuevo() {
    setEditando(null);
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    setCuando(paraInput(d.toISOString()));
    setCampo("");
    setFallo(null);
    setAbierto(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!equipoId) return;
    setGuardando(true);
    setFallo(null);
    try {
      await guardarEntrenamiento({
        id: editando?.id,
        team_id: equipoId,
        starts_at: desdeInput(cuando) ?? new Date().toISOString(),
        pitch: campo.trim() || null,
      });
      setAbierto(false);
      await refrescar();
    } catch (err) {
      setFallo(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function marcar(jugadorId: string, valor: Disponibilidad) {
    if (!lista) return;
    setEstados((e) => ({ ...e, [jugadorId]: valor })); // respuesta inmediata
    try {
      await fijarAsistencia(lista.id, jugadorId, valor);
    } catch (err) {
      setFallo(mensajeDeError(err));
    }
  }

  const cuenta = (v: Disponibilidad) =>
    jugadores.filter((j) => (estados[j.id] ?? "pending") === v).length;

  return (
    <>
      <div className="a-head">
        <div>
          <h1 className="a-title">Entrenamientos</h1>
          <p className="a-sub">Cada sesión abre su propia lista de asistencia.</p>
        </div>
        <div className="a-head-actions">
          <button className="btn btn-sm btn-primary" onClick={nuevo}>
            <IconPlus size={14} /> Nuevo entrenamiento
          </button>
        </div>
      </div>

      <div className="a-panel">
        {cargando ? (
          <Cargando />
        ) : error ? (
          <AvisoError mensaje={error} />
        ) : entrenos.length === 0 ? (
          <Vacio
            titulo="Sin entrenamientos"
            texto="Crea el primero y podrás pasar lista con un toque por jugador."
            accion={{ etiqueta: "Crear entrenamiento", onClick: nuevo }}
          />
        ) : (
          entrenos.map((e) => (
            <div
              key={e.id}
              className="a-row a-row-click"
              style={{ gridTemplateColumns: "minmax(0,1fr) auto auto" }}
              onClick={() => abrirLista(e)}
            >
              <span style={{ minWidth: 0 }}>
                <span className="a-cell-name">{fechaLarga(e.starts_at)}</span>
                <span className="a-cell-sub">{e.pitch ?? "Sin campo asignado"}</span>
              </span>
              <span
                className={esFuturo(e.starts_at) ? "chip chip-blue" : "chip chip-neutral"}
              >
                {esFuturo(e.starts_at) ? "Próximo" : "Pasado"}
              </span>
              <span className="a-num" style={{ fontWeight: 620, fontSize: "1.05rem" }}>
                {hora(e.starts_at)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* alta / edición */}
      <Cajon
        titulo={editando ? "Editar entrenamiento" : "Nuevo entrenamiento"}
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        pie={
          <>
            <button className="btn btn-sm btn-primary" form="f-ent" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
          </>
        }
      >
        <form id="f-ent" className="a-form" onSubmit={guardar}>
          <div className="a-field">
            <label className="a-label" htmlFor="c">
              Día y hora
            </label>
            <input
              id="c"
              className="a-input"
              type="datetime-local"
              required
              value={cuando}
              onChange={(e) => setCuando(e.target.value)}
            />
          </div>
          <div className="a-field">
            <label className="a-label" htmlFor="ca">
              Campo
            </label>
            <input
              id="ca"
              className="a-input"
              value={campo}
              onChange={(e) => setCampo(e.target.value)}
              placeholder="Campo 2 · Césped artificial"
            />
          </div>
          {fallo && <div className="a-alert a-alert-error">{fallo}</div>}
        </form>
      </Cajon>

      {/* pasar lista */}
      <Cajon
        titulo={lista ? fechaLarga(lista.starts_at) : ""}
        abierto={Boolean(lista)}
        onCerrar={() => setLista(null)}
        pie={
          <>
            <button className="btn btn-sm btn-ghost" onClick={() => setLista(null)}>
              Cerrar
            </button>
            {lista && (
              <button
                className="btn btn-sm btn-ghost"
                style={{ marginLeft: "auto", color: "var(--no)" }}
                onClick={async () => {
                  if (!confirm("¿Borrar este entrenamiento?")) return;
                  await borrarEntrenamiento(lista.id);
                  setLista(null);
                  await refrescar();
                }}
              >
                Borrar
              </button>
            )}
          </>
        }
      >
        {lista && (
          <>
            <div className="a-alert a-alert-info" style={{ marginBottom: 14 }}>
              <b>{cuenta("yes")} vienen</b> · {cuenta("no")} no pueden ·{" "}
              {cuenta("pending")} sin responder
            </div>
            {jugadores.length === 0 ? (
              <Vacio
                titulo="No hay jugadores"
                texto="Añade la plantilla y podrás pasar lista aquí."
              />
            ) : (
              <div className="a-panel">
                {jugadores.map((j) => (
                  <div
                    key={j.id}
                    className="a-row"
                    style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}
                  >
                    <span className="a-cell-main">
                      <Avatar name={j.full_name} size={28} />
                      <span className="a-cell-name">{j.full_name}</span>
                    </span>
                    <Selector
                      valor={estados[j.id] ?? "pending"}
                      onCambio={(v) => marcar(j.id, v)}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Cajon>
    </>
  );
}
