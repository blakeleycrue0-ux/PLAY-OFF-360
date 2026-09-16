"use client";

import { useState } from "react";
import { useSesion } from "@/lib/app/sesion";
import {
  borrarPartido,
  disponibilidadDe,
  fijarDisponibilidad,
  guardarPartido,
  listarJugadores,
  listarPartidos,
} from "@/lib/app/datos";
import { mensajeDeError } from "@/lib/supabase/client";
import type { Disponibilidad, Jugador, Partido } from "@/lib/supabase/types";
import { desdeInput, esFuturo, fechaLarga, hora, paraInput } from "@/lib/app/fechas";
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

const VACIO = {
  opponent: "",
  is_home: "false",
  kickoff_at: "",
  venue: "",
  competition: "",
  meeting_at: "",
  kit: "",
};

export default function Partidos() {
  const { equipo } = useSesion();
  const equipoId = equipo?.id ?? "";

  const { datos, cargando, error, refrescar } = useDatos(
    async () =>
      equipoId
        ? {
            partidos: await listarPartidos(equipoId),
            jugadores: await listarJugadores(equipoId),
          }
        : { partidos: [] as Partido[], jugadores: [] as Jugador[] },
    [equipoId],
  );
  const partidos = datos?.partidos ?? [];
  const jugadores = datos?.jugadores ?? [];

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Partido | null>(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  const [detalle, setDetalle] = useState<Partido | null>(null);
  const [estados, setEstados] = useState<Record<string, Disponibilidad>>({});

  function nuevo() {
    setEditando(null);
    const d = new Date();
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    d.setHours(11, 30, 0, 0);
    setForm({ ...VACIO, kickoff_at: paraInput(d.toISOString()) });
    setFallo(null);
    setAbierto(true);
  }

  function editar(p: Partido) {
    setEditando(p);
    setForm({
      opponent: p.opponent,
      is_home: String(p.is_home),
      kickoff_at: paraInput(p.kickoff_at),
      venue: p.venue ?? "",
      competition: p.competition ?? "",
      meeting_at: paraInput(p.meeting_at),
      kit: p.kit ?? "",
    });
    setFallo(null);
    setAbierto(true);
  }

  async function abrirDetalle(p: Partido) {
    setDetalle(p);
    const filas = await disponibilidadDe(p.id);
    setEstados(Object.fromEntries(filas.map((f) => [f.player_id, f.status])));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!equipoId) return;
    setGuardando(true);
    setFallo(null);
    try {
      await guardarPartido({
        id: editando?.id,
        team_id: equipoId,
        opponent: form.opponent.trim(),
        is_home: form.is_home === "true",
        kickoff_at: desdeInput(form.kickoff_at) ?? new Date().toISOString(),
        venue: form.venue.trim() || null,
        competition: form.competition.trim() || null,
        meeting_at: desdeInput(form.meeting_at),
        kit: form.kit.trim() || null,
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
    if (!detalle) return;
    setEstados((e) => ({ ...e, [jugadorId]: valor }));
    try {
      await fijarDisponibilidad(detalle.id, jugadorId, valor);
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
          <h1 className="a-title">Partidos</h1>
          <p className="a-sub">Quién puede venir, dónde se juega y a qué hora se sale.</p>
        </div>
        <div className="a-head-actions">
          <button className="btn btn-sm btn-primary" onClick={nuevo}>
            <IconPlus size={14} /> Nuevo partido
          </button>
        </div>
      </div>

      <div className="a-panel">
        {cargando ? (
          <Cargando />
        ) : error ? (
          <AvisoError mensaje={error} />
        ) : partidos.length === 0 ? (
          <Vacio
            titulo="Sin partidos"
            texto="Crea el próximo y podrás preguntar disponibilidad y preparar la convocatoria."
            accion={{ etiqueta: "Crear partido", onClick: nuevo }}
          />
        ) : (
          partidos.map((p) => (
            <div
              key={p.id}
              className="a-row a-row-click"
              style={{ gridTemplateColumns: "minmax(0,1fr) auto auto auto" }}
              onClick={() => abrirDetalle(p)}
            >
              <span style={{ minWidth: 0 }}>
                <span className="a-cell-name">
                  {p.is_home
                    ? `${equipo?.name} — ${p.opponent}`
                    : `${p.opponent} — ${equipo?.name}`}
                </span>
                <span className="a-cell-sub">
                  {p.competition ?? "Amistoso"}
                  {p.venue ? ` · ${p.venue}` : ""}
                </span>
              </span>
              <span className="chip chip-neutral">{p.is_home ? "Casa" : "Fuera"}</span>
              <span
                className={
                  esFuturo(p.kickoff_at) ? "chip chip-blue" : "chip chip-neutral"
                }
              >
                {fechaLarga(p.kickoff_at)}
              </span>
              <span className="a-num" style={{ fontWeight: 620, fontSize: "1.05rem" }}>
                {hora(p.kickoff_at)}
              </span>
            </div>
          ))
        )}
      </div>

      <Cajon
        titulo={editando ? "Editar partido" : "Nuevo partido"}
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        pie={
          <>
            <button className="btn btn-sm btn-primary" form="f-par" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
          </>
        }
      >
        <form id="f-par" className="a-form" onSubmit={guardar}>
          <div className="a-field">
            <label className="a-label" htmlFor="riv">
              Rival
            </label>
            <input
              id="riv"
              className="a-input"
              required
              minLength={2}
              value={form.opponent}
              onChange={(e) => setForm({ ...form, opponent: e.target.value })}
              placeholder="CF Alcorada"
            />
          </div>
          <div className="a-row-2">
            <div className="a-field">
              <label className="a-label" htmlFor="loc">
                Dónde
              </label>
              <select
                id="loc"
                className="a-select"
                value={form.is_home}
                onChange={(e) => setForm({ ...form, is_home: e.target.value })}
              >
                <option value="true">En casa</option>
                <option value="false">Fuera</option>
              </select>
            </div>
            <div className="a-field">
              <label className="a-label" htmlFor="ko">
                Día y hora
              </label>
              <input
                id="ko"
                className="a-input"
                type="datetime-local"
                required
                value={form.kickoff_at}
                onChange={(e) => setForm({ ...form, kickoff_at: e.target.value })}
              />
            </div>
          </div>
          <div className="a-field">
            <label className="a-label" htmlFor="ven">
              Campo
            </label>
            <input
              id="ven"
              className="a-input"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              placeholder="Campo Municipal de Alcorada"
            />
          </div>
          <div className="a-row-2">
            <div className="a-field">
              <label className="a-label" htmlFor="cit">
                Citación
              </label>
              <input
                id="cit"
                className="a-input"
                type="datetime-local"
                value={form.meeting_at}
                onChange={(e) => setForm({ ...form, meeting_at: e.target.value })}
              />
            </div>
            <div className="a-field">
              <label className="a-label" htmlFor="kit">
                Equipación
              </label>
              <input
                id="kit"
                className="a-input"
                value={form.kit}
                onChange={(e) => setForm({ ...form, kit: e.target.value })}
                placeholder="Visitante"
              />
            </div>
          </div>
          <div className="a-field">
            <label className="a-label" htmlFor="comp">
              Competición
            </label>
            <input
              id="comp"
              className="a-input"
              value={form.competition}
              onChange={(e) => setForm({ ...form, competition: e.target.value })}
              placeholder="Liga Infantil · Jornada 21"
            />
          </div>
          {fallo && <div className="a-alert a-alert-error">{fallo}</div>}
        </form>
      </Cajon>

      <Cajon
        titulo={detalle ? `Contra ${detalle.opponent}` : ""}
        abierto={Boolean(detalle)}
        onCerrar={() => setDetalle(null)}
        pie={
          detalle ? (
            <>
              <button className="btn btn-sm btn-primary" onClick={() => editar(detalle)}>
                Editar datos
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => setDetalle(null)}>
                Cerrar
              </button>
              <button
                className="btn btn-sm btn-ghost"
                style={{ marginLeft: "auto", color: "var(--no)" }}
                onClick={async () => {
                  if (!confirm("¿Borrar este partido?")) return;
                  await borrarPartido(detalle.id);
                  setDetalle(null);
                  await refrescar();
                }}
              >
                Borrar
              </button>
            </>
          ) : undefined
        }
      >
        {detalle && (
          <>
            <div className="a-panel" style={{ marginBottom: 14 }}>
              <div className="a-panel-body" style={{ display: "grid", gap: 8 }}>
                <div className="a-cell-name" style={{ fontSize: "1.05rem" }}>
                  {fechaLarga(detalle.kickoff_at)} · {hora(detalle.kickoff_at)}
                </div>
                <div className="a-cell-sub">
                  {detalle.venue ?? "Campo sin asignar"} ·{" "}
                  {detalle.is_home ? "En casa" : "Fuera"}
                </div>
                {detalle.meeting_at && (
                  <div className="a-cell-sub">
                    Citación a las {hora(detalle.meeting_at)}
                  </div>
                )}
              </div>
            </div>

            <div className="a-alert a-alert-info" style={{ marginBottom: 14 }}>
              <b>{cuenta("yes")} disponibles</b> · {cuenta("no")} no pueden ·{" "}
              {cuenta("pending")} sin responder
            </div>

            {jugadores.length === 0 ? (
              <Vacio titulo="No hay jugadores" texto="Añade la plantilla primero." />
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
