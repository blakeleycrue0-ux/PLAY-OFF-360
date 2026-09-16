"use client";

import { useState } from "react";
import { useSesion } from "@/lib/app/sesion";
import { crearMensaje, listarMensajes, listarTutores } from "@/lib/app/datos";
import { mensajeDeError } from "@/lib/supabase/client";
import type { Mensaje, TipoMensaje, Tutor } from "@/lib/supabase/types";
import { haceTiempo } from "@/lib/app/fechas";
import { IconPlus, IconSend } from "@/components/ui/Icon";
import { AvisoError, Cajon, Cargando, Vacio, useDatos } from "@/components/app/piezas";

const TIPOS: Array<[TipoMensaje, string]> = [
  ["aviso", "Aviso al equipo"],
  ["cambio", "Cambio de horario"],
  ["recordatorio", "Recordatorio"],
  ["convocatoria", "Convocatoria"],
];

const CHIP: Record<TipoMensaje, string> = {
  convocatoria: "chip chip-blue",
  aviso: "chip chip-neutral",
  cambio: "chip chip-wait",
  recordatorio: "chip chip-ok",
};

export default function Comunicaciones() {
  const { equipo } = useSesion();
  const equipoId = equipo?.id ?? "";

  const { datos, cargando, error, refrescar } = useDatos(
    async () =>
      equipoId
        ? {
            mensajes: await listarMensajes(equipoId),
            tutores: await listarTutores(equipoId),
          }
        : { mensajes: [] as Mensaje[], tutores: [] as Tutor[] },
    [equipoId],
  );
  const mensajes = datos?.mensajes ?? [];
  const tutores = datos?.tutores ?? [];

  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoMensaje>("aviso");
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState<Mensaje | null>(null);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    if (!equipoId) return;
    setEnviando(true);
    setFallo(null);
    try {
      await crearMensaje({
        team_id: equipoId,
        kind: tipo,
        subject: asunto.trim(),
        body: cuerpo.trim(),
        audience: "Familias del equipo",
        recipients_count: tutores.length,
      });
      setAbierto(false);
      setAsunto("");
      setCuerpo("");
      await refrescar();
    } catch (err) {
      setFallo(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="a-head">
        <div>
          <h1 className="a-title">Comunicaciones</h1>
          <p className="a-sub">Todo lo que se ha mandado al equipo, en un solo hilo.</p>
        </div>
        <div className="a-head-actions">
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              setFallo(null);
              setAbierto(true);
            }}
          >
            <IconPlus size={14} /> Redactar
          </button>
        </div>
      </div>

      <div className="a-alert a-alert-wait" style={{ marginBottom: 16 }}>
        El envío a WhatsApp y correo todavía no está conectado. De momento aquí queda el
        registro de qué se redactó, para quién y cuándo.
      </div>

      <div className="a-panel">
        {cargando ? (
          <Cargando />
        ) : error ? (
          <AvisoError mensaje={error} />
        ) : mensajes.length === 0 ? (
          <Vacio
            titulo="Nada enviado todavía"
            texto="Cuando publiques una convocatoria o redactes un aviso, aparecerá aquí."
            accion={{ etiqueta: "Redactar un aviso", onClick: () => setAbierto(true) }}
          />
        ) : (
          mensajes.map((m) => (
            <div
              key={m.id}
              className="a-row a-row-click"
              style={{ gridTemplateColumns: "minmax(0,1fr) auto auto" }}
              onClick={() => setLeyendo(m)}
            >
              <span style={{ minWidth: 0 }}>
                <span className="a-cell-name">{m.subject}</span>
                <span className="a-cell-sub">
                  {m.audience} · {m.recipients_count} destinatarios
                </span>
              </span>
              <span className={CHIP[m.kind]}>
                {TIPOS.find(([v]) => v === m.kind)?.[1] ?? m.kind}
              </span>
              <span className="a-cell-sub">{haceTiempo(m.created_at)}</span>
            </div>
          ))
        )}
      </div>

      <Cajon
        titulo="Redactar"
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        pie={
          <>
            <button className="btn btn-sm btn-primary" form="f-msj" disabled={enviando}>
              <IconSend size={14} /> {enviando ? "Guardando…" : "Registrar"}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
          </>
        }
      >
        <form id="f-msj" className="a-form" onSubmit={registrar}>
          <div className="a-field">
            <label className="a-label" htmlFor="ti">
              Tipo
            </label>
            <select
              id="ti"
              className="a-select"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoMensaje)}
            >
              {TIPOS.map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="a-field">
            <label className="a-label" htmlFor="as">
              Asunto
            </label>
            <input
              id="as"
              className="a-input"
              required
              minLength={2}
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="El jueves entrenamos a las 19:00"
            />
          </div>
          <div className="a-field">
            <label className="a-label" htmlFor="cu">
              Mensaje
            </label>
            <textarea
              id="cu"
              className="a-textarea"
              required
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              placeholder="Hola. El entrenamiento del jueves pasa a las 19:00 en el Campo 2."
            />
          </div>
          <p className="a-hint">
            Se registrará para {tutores.length} familias del equipo.
          </p>
          {fallo && <div className="a-alert a-alert-error">{fallo}</div>}
        </form>
      </Cajon>

      <Cajon
        titulo={leyendo?.subject ?? ""}
        abierto={Boolean(leyendo)}
        onCerrar={() => setLeyendo(null)}
        pie={
          <button className="btn btn-sm btn-ghost" onClick={() => setLeyendo(null)}>
            Cerrar
          </button>
        }
      >
        {leyendo && (
          <>
            <div className="a-cell-sub" style={{ marginBottom: 14 }}>
              {leyendo.audience} · {leyendo.recipients_count} destinatarios ·{" "}
              {haceTiempo(leyendo.created_at)}
            </div>
            <div className="a-panel">
              <div
                className="a-panel-body"
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.65,
                  fontSize: "0.9375rem",
                }}
              >
                {leyendo.body}
              </div>
            </div>
          </>
        )}
      </Cajon>
    </>
  );
}
