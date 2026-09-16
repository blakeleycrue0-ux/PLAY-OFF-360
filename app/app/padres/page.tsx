"use client";

import { useState } from "react";
import { useSesion } from "@/lib/app/sesion";
import {
  borrarTutor,
  guardarTutor,
  listarJugadores,
  listarTutores,
  listarVinculos,
  vincular,
} from "@/lib/app/datos";
import { mensajeDeError } from "@/lib/supabase/client";
import type { Jugador, Tutor } from "@/lib/supabase/types";
import Avatar from "@/components/ui/Avatar";
import { IconCheck, IconPlus } from "@/components/ui/Icon";
import { AvisoError, Cajon, Cargando, Vacio, useDatos } from "@/components/app/piezas";

const VACIO = { full_name: "", relation: "Madre", email: "", phone: "" };

export default function Padres() {
  const { equipo } = useSesion();
  const equipoId = equipo?.id ?? "";

  const { datos, cargando, error, refrescar } = useDatos(
    async () =>
      equipoId
        ? {
            tutores: await listarTutores(equipoId),
            jugadores: await listarJugadores(equipoId),
            vinculos: await listarVinculos(equipoId),
          }
        : {
            tutores: [] as Tutor[],
            jugadores: [] as Jugador[],
            vinculos: [] as { player_id: string; guardian_id: string }[],
          },
    [equipoId],
  );

  const tutores = datos?.tutores ?? [];
  const jugadores = datos?.jugadores ?? [];
  const vinculos = datos?.vinculos ?? [];

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Tutor | null>(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  const hijosDe = (tutorId: string) =>
    vinculos.filter((v) => v.guardian_id === tutorId).map((v) => v.player_id);

  function nuevo() {
    setEditando(null);
    setForm(VACIO);
    setFallo(null);
    setAbierto(true);
  }

  function editar(t: Tutor) {
    setEditando(t);
    setForm({
      full_name: t.full_name,
      relation: t.relation ?? "Madre",
      email: t.email ?? "",
      phone: t.phone ?? "",
    });
    setFallo(null);
    setAbierto(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!equipoId) return;
    setGuardando(true);
    setFallo(null);
    try {
      await guardarTutor({
        id: editando?.id,
        team_id: equipoId,
        full_name: form.full_name.trim(),
        relation: form.relation,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
      });
      setAbierto(false);
      await refrescar();
    } catch (err) {
      setFallo(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function alternarHijo(jugadorId: string) {
    if (!editando) return;
    const unido = hijosDe(editando.id).includes(jugadorId);
    try {
      await vincular(jugadorId, editando.id, !unido);
      await refrescar();
    } catch (err) {
      setFallo(mensajeDeError(err));
    }
  }

  return (
    <>
      <div className="a-head">
        <div>
          <h1 className="a-title">Padres y tutores</h1>
          <p className="a-sub">
            Quién responde por cada jugador. {tutores.length} registrados.
          </p>
        </div>
        <div className="a-head-actions">
          <button className="btn btn-sm btn-primary" onClick={nuevo}>
            <IconPlus size={14} /> Añadir tutor
          </button>
        </div>
      </div>

      <div className="a-panel">
        {cargando ? (
          <Cargando />
        ) : error ? (
          <AvisoError mensaje={error} />
        ) : tutores.length === 0 ? (
          <Vacio
            titulo="Sin familias registradas"
            texto="Añade a los padres, madres o tutores y podrás vincularlos con sus hijos."
            accion={{ etiqueta: "Añadir el primero", onClick: nuevo }}
          />
        ) : (
          tutores.map((t) => {
            const hijos = hijosDe(t.id)
              .map((id) => jugadores.find((j) => j.id === id)?.full_name)
              .filter(Boolean);
            return (
              <div
                key={t.id}
                className="a-row a-row-click"
                style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto" }}
                onClick={() => editar(t)}
              >
                <span className="a-cell-main">
                  <Avatar name={t.full_name} size={30} />
                  <span style={{ minWidth: 0 }}>
                    <span className="a-cell-name">{t.full_name}</span>
                    <span className="a-cell-sub">
                      {t.email ?? t.phone ?? "Sin contacto"}
                    </span>
                  </span>
                </span>
                <span className="a-cell-sub">
                  {hijos.length ? hijos.join(", ") : "Sin jugador vinculado"}
                </span>
                <span className="chip chip-neutral">{t.relation ?? "Tutor/a"}</span>
              </div>
            );
          })
        )}
      </div>

      <Cajon
        titulo={editando ? editando.full_name : "Nuevo tutor"}
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        pie={
          <>
            <button className="btn btn-sm btn-primary" form="f-tut" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            {editando && (
              <button
                className="btn btn-sm btn-ghost"
                style={{ marginLeft: "auto", color: "var(--no)" }}
                onClick={async () => {
                  if (!confirm(`¿Quitar a ${editando.full_name}?`)) return;
                  await borrarTutor(editando.id);
                  setAbierto(false);
                  await refrescar();
                }}
              >
                Quitar
              </button>
            )}
          </>
        }
      >
        <form id="f-tut" className="a-form" onSubmit={guardar}>
          <div className="a-field">
            <label className="a-label" htmlFor="tn">
              Nombre y apellidos
            </label>
            <input
              id="tn"
              className="a-input"
              required
              minLength={2}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="a-row-2">
            <div className="a-field">
              <label className="a-label" htmlFor="tr">
                Relación
              </label>
              <select
                id="tr"
                className="a-select"
                value={form.relation}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
              >
                <option>Madre</option>
                <option>Padre</option>
                <option>Tutor/a legal</option>
                <option>Otro familiar</option>
              </select>
            </div>
            <div className="a-field">
              <label className="a-label" htmlFor="tp">
                Teléfono
              </label>
              <input
                id="tp"
                className="a-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="a-field">
            <label className="a-label" htmlFor="te">
              Correo
            </label>
            <input
              id="te"
              className="a-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          {fallo && <div className="a-alert a-alert-error">{fallo}</div>}
        </form>

        {editando && (
          <div className="a-panel" style={{ marginTop: 18 }}>
            <div className="a-panel-head">
              <span className="a-panel-title">Jugadores a su cargo</span>
            </div>
            {jugadores.length === 0 ? (
              <Vacio titulo="No hay jugadores" texto="Añade la plantilla primero." />
            ) : (
              jugadores.map((j) => {
                const unido = hijosDe(editando.id).includes(j.id);
                return (
                  <div
                    key={j.id}
                    className="a-row a-row-click"
                    style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}
                    onClick={() => alternarHijo(j.id)}
                  >
                    <span className="a-cell-main">
                      <Avatar name={j.full_name} size={26} />
                      <span className="a-cell-name">{j.full_name}</span>
                    </span>
                    <span className={unido ? "chip chip-ok" : "chip chip-neutral"}>
                      {unido ? (
                        <>
                          <IconCheck size={11} /> Vinculado
                        </>
                      ) : (
                        "Vincular"
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Cajon>
    </>
  );
}
