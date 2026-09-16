"use client";

import { useState } from "react";
import { useSesion } from "@/lib/app/sesion";
import {
  abrirConvocatoria,
  convocados,
  crearMensaje,
  disponibilidadDe,
  fijarConvocados,
  listarConvocatorias,
  listarJugadores,
  listarPartidos,
  publicarConvocatoria,
} from "@/lib/app/datos";
import { mensajeDeError } from "@/lib/supabase/client";
import type { Convocatoria, Jugador, Partido } from "@/lib/supabase/types";
import { fechaLarga, hora } from "@/lib/app/fechas";
import Avatar from "@/components/ui/Avatar";
import { IconCheck, IconSend } from "@/components/ui/Icon";
import { AvisoError, Cajon, Cargando, Vacio, useDatos } from "@/components/app/piezas";

/** Borrador razonable para que el entrenador solo tenga que retocar. */
function redactar(p: Partido, equipo: string, cuantos: number) {
  const donde = p.venue ? ` en ${p.venue}` : "";
  const cita = p.meeting_at ? ` Salimos a las ${hora(p.meeting_at)}.` : "";
  return (
    `Convocatoria del ${equipo} para el partido contra ${p.opponent}.\n\n` +
    `${fechaLarga(p.kickoff_at)} a las ${hora(p.kickoff_at)}${donde}.${cita}\n\n` +
    `Somos ${cuantos} convocados. Confirmad, por favor.`
  );
}

export default function Convocatorias() {
  const { equipo } = useSesion();
  const equipoId = equipo?.id ?? "";

  const { datos, cargando, error, refrescar } = useDatos(
    async () =>
      equipoId
        ? {
            partidos: await listarPartidos(equipoId),
            convocatorias: await listarConvocatorias(equipoId),
            jugadores: await listarJugadores(equipoId),
          }
        : {
            partidos: [] as Partido[],
            convocatorias: [] as Convocatoria[],
            jugadores: [] as Jugador[],
          },
    [equipoId],
  );

  const partidos = datos?.partidos ?? [];
  const jugadores = datos?.jugadores ?? [];
  const porPartido = new Map((datos?.convocatorias ?? []).map((c) => [c.match_id, c]));

  const [partido, setPartido] = useState<Partido | null>(null);
  const [conv, setConv] = useState<Convocatoria | null>(null);
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  const [texto, setTexto] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  async function abrir(p: Partido) {
    setFallo(null);
    setHecho(null);
    setPartido(p);
    try {
      const c = await abrirConvocatoria(equipoId, p.id);
      setConv(c);
      const yaConvocados = await convocados(c.id);
      if (yaConvocados.length) {
        setElegidos(new Set(yaConvocados));
      } else {
        // Sin selección previa, se parte de quien ha dicho que puede venir.
        const disp = await disponibilidadDe(p.id);
        setElegidos(
          new Set(disp.filter((d) => d.status === "yes").map((d) => d.player_id)),
        );
      }
      setTexto(c.message ?? "");
    } catch (err) {
      setFallo(mensajeDeError(err));
    }
  }

  function alternar(id: string) {
    setElegidos((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function guardarBorrador() {
    if (!conv) return;
    setTrabajando(true);
    setFallo(null);
    try {
      await fijarConvocados(conv.id, [...elegidos]);
      setHecho("Borrador guardado.");
      await refrescar();
    } catch (err) {
      setFallo(mensajeDeError(err));
    } finally {
      setTrabajando(false);
    }
  }

  async function publicar() {
    if (!conv || !partido) return;
    setTrabajando(true);
    setFallo(null);
    try {
      const cuerpo =
        texto.trim() || redactar(partido, equipo?.name ?? "el equipo", elegidos.size);
      await fijarConvocados(conv.id, [...elegidos]);
      await publicarConvocatoria(conv.id, cuerpo);
      // Queda registrada en Comunicaciones. El envío real todavía no existe.
      await crearMensaje({
        team_id: equipoId,
        kind: "convocatoria",
        subject: `Convocatoria · ${partido.opponent}`,
        body: cuerpo,
        audience: "Familias de los convocados",
        recipients_count: elegidos.size,
      });
      setHecho(`Convocatoria publicada con ${elegidos.size} jugadores.`);
      await refrescar();
    } catch (err) {
      setFallo(mensajeDeError(err));
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <>
      <div className="a-head">
        <div>
          <h1 className="a-title">Convocatorias</h1>
          <p className="a-sub">Elige a los convocados y deja el mensaje preparado.</p>
        </div>
      </div>

      <div className="a-panel">
        {cargando ? (
          <Cargando />
        ) : error ? (
          <AvisoError mensaje={error} />
        ) : partidos.length === 0 ? (
          <Vacio
            titulo="No hay partidos"
            texto="Crea un partido y desde aquí podrás preparar su convocatoria."
          />
        ) : (
          partidos.map((p) => {
            const c = porPartido.get(p.id);
            return (
              <div
                key={p.id}
                className="a-row a-row-click"
                style={{ gridTemplateColumns: "minmax(0,1fr) auto auto" }}
                onClick={() => abrir(p)}
              >
                <span style={{ minWidth: 0 }}>
                  <span className="a-cell-name">Contra {p.opponent}</span>
                  <span className="a-cell-sub">
                    {fechaLarga(p.kickoff_at)} · {hora(p.kickoff_at)}
                  </span>
                </span>
                <span
                  className={
                    c?.status === "published"
                      ? "chip chip-ok"
                      : c
                        ? "chip chip-wait"
                        : "chip chip-neutral"
                  }
                >
                  {c?.status === "published"
                    ? "Publicada"
                    : c
                      ? "Borrador"
                      : "Sin preparar"}
                </span>
                <span className="btn btn-sm btn-ghost">Preparar</span>
              </div>
            );
          })
        )}
      </div>

      <Cajon
        titulo={partido ? `Convocatoria · ${partido.opponent}` : ""}
        abierto={Boolean(partido)}
        onCerrar={() => setPartido(null)}
        pie={
          <>
            <button
              className="btn btn-sm btn-primary"
              onClick={publicar}
              disabled={trabajando}
            >
              <IconSend size={14} /> {trabajando ? "Un momento…" : "Publicar"}
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={guardarBorrador}
              disabled={trabajando}
            >
              Guardar borrador
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setPartido(null)}>
              Cerrar
            </button>
          </>
        }
      >
        {partido && (
          <>
            <div className="a-alert a-alert-info" style={{ marginBottom: 14 }}>
              <b>{elegidos.size} convocados</b> de {jugadores.length} en plantilla
            </div>

            <div className="a-panel" style={{ marginBottom: 16 }}>
              <div className="a-panel-head">
                <span className="a-panel-title">Quién va</span>
                <span className="a-panel-meta">Toca para incluir o excluir</span>
              </div>
              {jugadores.map((j) => {
                const dentro = elegidos.has(j.id);
                return (
                  <div
                    key={j.id}
                    className="a-row a-row-click"
                    style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}
                    onClick={() => alternar(j.id)}
                  >
                    <span className="a-cell-main">
                      <Avatar
                        name={j.full_name}
                        size={28}
                        ring={dentro ? "ok" : undefined}
                      />
                      <span className="a-cell-name">{j.full_name}</span>
                    </span>
                    <span className={dentro ? "chip chip-ok" : "chip chip-neutral"}>
                      {dentro ? (
                        <>
                          <IconCheck size={11} /> Convocado
                        </>
                      ) : (
                        "Fuera"
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="a-field">
              <label className="a-label" htmlFor="msj">
                Mensaje para las familias
              </label>
              <textarea
                id="msj"
                className="a-textarea"
                value={texto}
                placeholder={redactar(
                  partido,
                  equipo?.name ?? "el equipo",
                  elegidos.size,
                )}
                onChange={(e) => setTexto(e.target.value)}
              />
              <span className="a-hint">
                Si lo dejas vacío se usa el texto de ejemplo que ves en gris.
              </span>
            </div>

            {fallo && <div className="a-alert a-alert-error">{fallo}</div>}
            {hecho && (
              <div className="a-alert a-alert-ok" style={{ marginTop: 12 }}>
                {hecho} Queda guardada en Comunicaciones. El envío real a WhatsApp o email
                todavía no está conectado.
              </div>
            )}
          </>
        )}
      </Cajon>
    </>
  );
}
