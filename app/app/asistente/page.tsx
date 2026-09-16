"use client";

import { useRef, useState } from "react";
import { useSesion } from "@/lib/app/sesion";
import {
  abrirConvocatoria,
  crearMensaje,
  disponibilidadDe,
  fijarConvocados,
  guardarEntrenamiento,
  guardarJugador,
  listarJugadores,
  listarPartidos,
  publicarConvocatoria,
} from "@/lib/app/datos";
import { mensajeDeError } from "@/lib/supabase/client";
import { fechaLarga, hora } from "@/lib/app/fechas";
import { Mark } from "@/components/brand/Logo";
import { IconArrow } from "@/components/ui/Icon";

type Turno = { de: "tu" | "sistema"; texto: string; detalle?: string[] };

const EJEMPLOS = [
  "¿Quién ha confirmado para el próximo partido?",
  "Prepara la convocatoria del próximo partido",
  "Recuerda a los que no han contestado",
  "Crea un entrenamiento el jueves a las 19:00",
  "Añade a Marcos Vidal con el dorsal 2",
];

const DIAS: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miércoles: 3,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
  sabado: 6,
};

/** Próxima fecha para un día de la semana y una hora dados. */
function proximaFecha(dia: number, h: number, m: number) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  const salto = (dia - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + salto);
  return d.toISOString();
}

export default function Asistente() {
  const { equipo } = useSesion();
  const equipoId = equipo?.id ?? "";
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const fin = useRef<HTMLDivElement>(null);

  function responder(t: Turno) {
    setTurnos((v) => [...v, t]);
    requestAnimationFrame(() => fin.current?.scrollIntoView({ behavior: "smooth" }));
  }

  async function procesar(orden: string) {
    const q = orden.toLowerCase();
    const partidos = await listarPartidos(equipoId);
    const proximo =
      [...partidos]
        .reverse()
        .find((p) => new Date(p.kickoff_at).getTime() > Date.now()) ?? partidos[0];

    // --- quién ha confirmado ---
    if (/confirmad|quién puede|quien puede|disponib/.test(q)) {
      if (!proximo)
        return responder({
          de: "sistema",
          texto: "Todavía no hay ningún partido creado.",
        });
      const jugadores = await listarJugadores(equipoId);
      const disp = await disponibilidadDe(proximo.id);
      const mapa = new Map(disp.map((d) => [d.player_id, d.status]));
      const si = jugadores.filter((j) => mapa.get(j.id) === "yes");
      const no = jugadores.filter((j) => mapa.get(j.id) === "no");
      const sin = jugadores.filter(
        (j) => !mapa.has(j.id) || mapa.get(j.id) === "pending",
      );
      return responder({
        de: "sistema",
        texto: `Para el partido contra ${proximo.opponent} (${fechaLarga(proximo.kickoff_at)}, ${hora(proximo.kickoff_at)}): ${si.length} disponibles, ${no.length} no pueden y ${sin.length} sin responder.`,
        detalle: sin.length
          ? [`Sin responder: ${sin.map((j) => j.full_name).join(", ")}`]
          : undefined,
      });
    }

    // --- preparar convocatoria ---
    if (/convocatoria|convoca/.test(q)) {
      if (!proximo)
        return responder({
          de: "sistema",
          texto: "No hay ningún partido al que convocar.",
        });
      const disp = await disponibilidadDe(proximo.id);
      const disponibles = disp.filter((d) => d.status === "yes").map((d) => d.player_id);
      const c = await abrirConvocatoria(equipoId, proximo.id);
      await fijarConvocados(c.id, disponibles);
      const cuerpo =
        `Convocatoria para el partido contra ${proximo.opponent}.\n` +
        `${fechaLarga(proximo.kickoff_at)} a las ${hora(proximo.kickoff_at)}` +
        `${proximo.venue ? ` en ${proximo.venue}` : ""}.`;
      await publicarConvocatoria(c.id, cuerpo);
      await crearMensaje({
        team_id: equipoId,
        kind: "convocatoria",
        subject: `Convocatoria · ${proximo.opponent}`,
        body: cuerpo,
        audience: "Familias de los convocados",
        recipients_count: disponibles.length,
      });
      return responder({
        de: "sistema",
        texto: `Convocatoria publicada con ${disponibles.length} jugadores, los que habían dicho que podían venir.`,
        detalle: ["Puedes revisarla y retocarla en Convocatorias."],
      });
    }

    // --- recordatorio a los que faltan ---
    if (/recuerda|recordatorio|avisa a los que/.test(q)) {
      if (!proximo)
        return responder({ de: "sistema", texto: "No hay ningún partido pendiente." });
      const jugadores = await listarJugadores(equipoId);
      const disp = await disponibilidadDe(proximo.id);
      const mapa = new Map(disp.map((d) => [d.player_id, d.status]));
      const sin = jugadores.filter(
        (j) => !mapa.has(j.id) || mapa.get(j.id) === "pending",
      );
      if (!sin.length)
        return responder({ de: "sistema", texto: "No falta nadie por contestar." });
      await crearMensaje({
        team_id: equipoId,
        kind: "recordatorio",
        subject: `Recordatorio · ${proximo.opponent}`,
        body: `Quedáis por confirmar para el partido del ${fechaLarga(proximo.kickoff_at)}: ${sin.map((j) => j.full_name).join(", ")}.`,
        audience: "Familias sin respuesta",
        recipients_count: sin.length,
      });
      return responder({
        de: "sistema",
        texto: `Recordatorio preparado para ${sin.length} familias.`,
        detalle: [
          sin.map((j) => j.full_name).join(", "),
          "Queda registrado en Comunicaciones.",
        ],
      });
    }

    // --- crear entrenamiento ---
    if (/entrenamiento|entrena/.test(q)) {
      const dia = Object.keys(DIAS).find((d) => q.includes(d));
      const hm = q.match(/(\d{1,2})[:.](\d{2})/);
      const h = hm ? Number(hm[1]) : 18;
      const m = hm ? Number(hm[2]) : 0;
      const cuando = proximaFecha(dia ? DIAS[dia] : 4, h, m);
      await guardarEntrenamiento({ team_id: equipoId, starts_at: cuando });
      return responder({
        de: "sistema",
        texto: `Entrenamiento creado para el ${fechaLarga(cuando)} a las ${hora(cuando)}.`,
        detalle: ["Puedes pasar lista desde Entrenamientos."],
      });
    }

    // --- añadir jugador ---
    const alta = orden.match(/a[ñn]ade a ([^,]+?)(?: con el dorsal (\d{1,2}))?$/i);
    if (alta) {
      const nombre = alta[1].trim();
      await guardarJugador({
        team_id: equipoId,
        full_name: nombre,
        shirt_number: alta[2] ? Number(alta[2]) : null,
      });
      return responder({ de: "sistema", texto: `${nombre} añadido a la plantilla.` });
    }

    return responder({
      de: "sistema",
      texto: "Eso todavía no lo sé hacer.",
      detalle: ["Prueba con una de las frases de ejemplo de abajo."],
    });
  }

  async function enviar(orden: string) {
    if (!orden.trim() || !equipoId) return;
    responder({ de: "tu", texto: orden });
    setTexto("");
    setPensando(true);
    try {
      await procesar(orden.trim());
    } catch (err) {
      responder({ de: "sistema", texto: mensajeDeError(err) });
    } finally {
      setPensando(false);
    }
  }

  return (
    <>
      <div className="a-head">
        <div>
          <h1 className="a-title">Asistente</h1>
          <p className="a-sub">
            Pídele lo que necesitas y lo hace sobre tus datos reales.
          </p>
        </div>
      </div>

      <div className="a-alert a-alert-wait" style={{ marginBottom: 16 }}>
        <b>Cómo funciona hoy:</b> entiende un conjunto concreto de órdenes, no lenguaje
        libre. No hay ningún modelo de lenguaje detrás todavía, así que fuera de las
        frases de abajo no sabrá qué hacer. Lo que sí es real es lo que ejecuta: escribe
        en tu base de datos.
      </div>

      <div className="a-panel">
        <div
          className="a-panel-body"
          style={{ display: "grid", gap: 14, minHeight: 280 }}
        >
          {turnos.length === 0 && (
            <p className="a-cell-sub">
              Escribe abajo, o toca uno de los ejemplos para ver qué hace.
            </p>
          )}
          {turnos.map((t, i) =>
            t.de === "tu" ? (
              <div
                key={i}
                style={{
                  justifySelf: "end",
                  maxWidth: "80%",
                  background: "var(--ink)",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: "14px 14px 4px 14px",
                  fontSize: "0.9375rem",
                }}
              >
                {t.texto}
              </div>
            ) : (
              <div
                key={i}
                style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10 }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    display: "grid",
                    placeItems: "center",
                    background: "linear-gradient(145deg,#16295e,#2b48ff)",
                  }}
                >
                  <Mark size={15} tone="light" />
                </span>
                <div>
                  <p style={{ fontSize: "0.9375rem", lineHeight: 1.5 }}>{t.texto}</p>
                  {t.detalle?.map((d, k) => (
                    <p key={k} className="a-cell-sub" style={{ marginTop: 5 }}>
                      {d}
                    </p>
                  ))}
                </div>
              </div>
            ),
          )}
          {pensando && <p className="a-cell-sub">Un momento…</p>}
          <div ref={fin} />
        </div>

        <div
          className="a-panel-head"
          style={{ borderTop: "1px solid var(--line)", borderBottom: 0 }}
        >
          <form
            style={{ display: "flex", gap: 8, width: "100%" }}
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
          >
            <input
              className="a-input"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe lo que necesitas…"
            />
            <button
              className="btn btn-sm btn-primary"
              disabled={pensando || !texto.trim()}
            >
              <IconArrow size={15} />
            </button>
          </form>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {EJEMPLOS.map((e) => (
          <button key={e} className="btn btn-sm btn-ghost" onClick={() => enviar(e)}>
            {e}
          </button>
        ))}
      </div>
    </>
  );
}
