"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/lib/app/sesion";
import { sembrarEjemplo } from "@/lib/app/datos";
import { mensajeDeError, supabase } from "@/lib/supabase/client";
import { IconArrow, IconCheck } from "@/components/ui/Icon";
import { nombreCorto } from "@/lib/app/fechas";

const CATEGORIAS = [
  "Prebenjamín",
  "Benjamín",
  "Alevín",
  "Infantil",
  "Cadete",
  "Juvenil",
  "Senior",
  "Veteranos",
];

export default function Bienvenida() {
  const { recargar, equipo, user } = useSesion();
  const router = useRouter();

  const [club, setClub] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("Infantil");
  const [temporada, setTemporada] = useState("2025/26");
  const [ejemplo, setEjemplo] = useState(true);
  const [paso, setPaso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setPaso("Creando el club…");
      const { data, error } = await supabase().rpc("create_club_with_team", {
        p_club_name: club,
        p_team_name: nombre,
        p_category: categoria,
        p_season: temporada,
      });
      if (error) throw error;
      const equipoId = (data as { team_id: string }).team_id;

      if (ejemplo) {
        setPaso("Cargando el equipo de ejemplo…");
        await sembrarEjemplo(equipoId);
      }

      setPaso("Casi está…");
      await recargar();
      router.replace("/app/");
    } catch (err) {
      setError(mensajeDeError(err));
      setPaso(null);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: "clamp(20px, 6vh, 60px) auto 0" }}>
      <div className="a-head" style={{ display: "block" }}>
        <h1 className="a-title">
          {equipo ? "Añade otro equipo" : "Vamos a montar tu equipo"}
        </h1>
        <p className="a-sub">
          {equipo
            ? "Puedes llevar varios equipos desde la misma cuenta."
            : `Hola, ${nombreCorto(user)}. Dos datos y ya puedes empezar. Todo esto se puede cambiar luego.`}
        </p>
      </div>

      <div className="a-panel">
        <div className="a-panel-body">
          <form className="a-form" onSubmit={crear}>
            <div className="a-field">
              <label className="a-label" htmlFor="club">
                Nombre del club
              </label>
              <input
                id="club"
                className="a-input"
                required
                minLength={2}
                value={club}
                onChange={(e) => setClub(e.target.value)}
                placeholder="CD Valmorán"
              />
            </div>

            <div className="a-field">
              <label className="a-label" htmlFor="equipo">
                Nombre del equipo
              </label>
              <input
                id="equipo"
                className="a-input"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Infantil A"
              />
            </div>

            <div className="a-row-2">
              <div className="a-field">
                <label className="a-label" htmlFor="cat">
                  Categoría
                </label>
                <select
                  id="cat"
                  className="a-select"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="a-field">
                <label className="a-label" htmlFor="temp">
                  Temporada
                </label>
                <input
                  id="temp"
                  className="a-input"
                  value={temporada}
                  onChange={(e) => setTemporada(e.target.value)}
                />
              </div>
            </div>

            <label
              className="a-alert a-alert-info"
              style={{
                display: "flex",
                gap: 11,
                alignItems: "flex-start",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={ejemplo}
                onChange={(e) => setEjemplo(e.target.checked)}
                style={{ marginTop: 3, accentColor: "var(--electric)" }}
              />
              <span>
                <b>Cargar un equipo de ejemplo</b>
                <br />
                18 jugadores, algunas familias, un entrenamiento y el partido del sábado
                con media plantilla ya respondida. Puedes borrarlo cuando quieras.
              </span>
            </label>

            {error && <div className="a-alert a-alert-error">{error}</div>}

            <button className="btn btn-primary" disabled={Boolean(paso)}>
              {paso ?? (
                <>
                  Crear equipo <IconArrow size={15} />
                </>
              )}
            </button>

            <p className="a-hint">
              <IconCheck size={12} /> Los datos que crees aquí solo los ves tú: la base
              los filtra por tu cuenta.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
