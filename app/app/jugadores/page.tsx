"use client";

import { useMemo, useState } from "react";
import { useSesion } from "@/lib/app/sesion";
import { borrarJugador, guardarJugador, listarJugadores } from "@/lib/app/datos";
import { mensajeDeError } from "@/lib/supabase/client";
import type { Jugador, Posicion } from "@/lib/supabase/types";
import Avatar from "@/components/ui/Avatar";
import { IconPlus, IconSearch } from "@/components/ui/Icon";
import { AvisoError, Cajon, Cargando, Vacio, useDatos } from "@/components/app/piezas";

const POSICIONES: Array<[Posicion, string]> = [
  ["PT", "Portero"],
  ["DF", "Defensa"],
  ["MC", "Centrocampista"],
  ["DL", "Delantero"],
];

const VACIO = {
  full_name: "",
  shirt_number: "",
  position: "" as Posicion | "",
  notes: "",
};

export default function Jugadores() {
  const { equipo } = useSesion();
  const equipoId = equipo?.id ?? "";
  const { datos, cargando, error, refrescar } = useDatos(
    () => (equipoId ? listarJugadores(equipoId) : Promise.resolve([])),
    [equipoId],
  );

  const [busca, setBusca] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Jugador | null>(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  const jugadores = datos ?? [];
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? jugadores.filter((j) => j.full_name.toLowerCase().includes(q)) : jugadores;
  }, [jugadores, busca]);

  function nuevo() {
    setEditando(null);
    setForm(VACIO);
    setFallo(null);
    setAbierto(true);
  }

  function editar(j: Jugador) {
    setEditando(j);
    setForm({
      full_name: j.full_name,
      shirt_number: j.shirt_number?.toString() ?? "",
      position: j.position ?? "",
      notes: j.notes ?? "",
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
      await guardarJugador({
        id: editando?.id,
        team_id: equipoId,
        full_name: form.full_name.trim(),
        shirt_number: form.shirt_number ? Number(form.shirt_number) : null,
        position: form.position || null,
        notes: form.notes.trim() || null,
      });
      setAbierto(false);
      await refrescar();
    } catch (err) {
      setFallo(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!editando) return;
    if (!confirm(`¿Quitar a ${editando.full_name} de la plantilla?`)) return;
    setGuardando(true);
    try {
      await borrarJugador(editando.id);
      setAbierto(false);
      await refrescar();
    } catch (err) {
      setFallo(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className="a-head">
        <div>
          <h1 className="a-title">Jugadores</h1>
          <p className="a-sub">
            {jugadores.length} en la plantilla de {equipo?.name ?? "tu equipo"}
          </p>
        </div>
        <div className="a-head-actions">
          <span className="a-team" style={{ maxWidth: 240 }}>
            <IconSearch size={14} />
            <input
              className="a-input"
              style={{ border: 0, minHeight: 0, padding: 0, background: "none" }}
              placeholder="Buscar"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </span>
          <button className="btn btn-sm btn-primary" onClick={nuevo}>
            <IconPlus size={14} /> Añadir jugador
          </button>
        </div>
      </div>

      <div className="a-panel">
        {cargando ? (
          <Cargando />
        ) : error ? (
          <AvisoError mensaje={error} />
        ) : lista.length === 0 ? (
          <Vacio
            titulo={busca ? "Nadie con ese nombre" : "Todavía no hay plantilla"}
            texto={
              busca
                ? "Prueba con otro nombre o borra la búsqueda."
                : "Añade a tus jugadores y el resto de pantallas se llenarán solas."
            }
            accion={busca ? undefined : { etiqueta: "Añadir el primero", onClick: nuevo }}
          />
        ) : (
          <>
            <div
              className="a-row a-row-head"
              style={{ gridTemplateColumns: "minmax(0,1fr) 62px 96px" }}
            >
              <span>Jugador</span>
              <span>Dorsal</span>
              <span>Posición</span>
            </div>
            {lista.map((j) => (
              <div
                key={j.id}
                className="a-row a-row-click"
                style={{ gridTemplateColumns: "minmax(0,1fr) 62px 96px" }}
                onClick={() => editar(j)}
              >
                <span className="a-cell-main">
                  <Avatar name={j.full_name} size={30} />
                  <span style={{ minWidth: 0 }}>
                    <span className="a-cell-name">{j.full_name}</span>
                    {j.notes && <span className="a-cell-sub">{j.notes}</span>}
                  </span>
                </span>
                <span className="a-num" style={{ fontWeight: 600 }}>
                  {j.shirt_number ?? "—"}
                </span>
                <span className="chip chip-neutral">
                  {POSICIONES.find(([v]) => v === j.position)?.[1] ?? "Sin posición"}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      <Cajon
        titulo={editando ? "Editar jugador" : "Nuevo jugador"}
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        pie={
          <>
            <button
              className="btn btn-sm btn-primary"
              form="f-jugador"
              disabled={guardando}
            >
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            {editando && (
              <button
                className="btn btn-sm btn-ghost"
                style={{ marginLeft: "auto", color: "var(--no)" }}
                onClick={eliminar}
                disabled={guardando}
              >
                Quitar
              </button>
            )}
          </>
        }
      >
        <form id="f-jugador" className="a-form" onSubmit={guardar}>
          <div className="a-field">
            <label className="a-label" htmlFor="n">
              Nombre y apellidos
            </label>
            <input
              id="n"
              className="a-input"
              required
              minLength={2}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Pablo Serrano"
            />
          </div>
          <div className="a-row-2">
            <div className="a-field">
              <label className="a-label" htmlFor="d">
                Dorsal
              </label>
              <input
                id="d"
                className="a-input"
                type="number"
                min={1}
                max={99}
                value={form.shirt_number}
                onChange={(e) => setForm({ ...form, shirt_number: e.target.value })}
              />
            </div>
            <div className="a-field">
              <label className="a-label" htmlFor="p">
                Posición
              </label>
              <select
                id="p"
                className="a-select"
                value={form.position}
                onChange={(e) =>
                  setForm({ ...form, position: e.target.value as Posicion })
                }
              >
                <option value="">Sin definir</option>
                {POSICIONES.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="a-field">
            <label className="a-label" htmlFor="o">
              Notas
            </label>
            <input
              id="o"
              className="a-input"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Capitán, lesionado, se incorpora en enero…"
            />
          </div>
          {fallo && <div className="a-alert a-alert-error">{fallo}</div>}
        </form>
      </Cajon>
    </>
  );
}
