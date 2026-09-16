"use client";

import { supabase } from "@/lib/supabase/client";
import type {
  AsistenciaEntreno,
  Convocatoria,
  Disponibilidad,
  DisponibilidadPartido,
  Entrenamiento,
  Jugador,
  Mensaje,
  Partido,
  TipoMensaje,
  Tutor,
} from "@/lib/supabase/types";

/** Lanza si la consulta falló, para que el llamante solo maneje datos. */
function ok<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return (r.data ?? []) as T;
}

// ------------------------------------------------------------- jugadores --
export async function listarJugadores(equipoId: string) {
  return ok<Jugador[]>(
    await supabase()
      .from("players")
      .select("*")
      .eq("team_id", equipoId)
      .order("shirt_number", { ascending: true, nullsFirst: false })
      .returns<Jugador[]>(),
  );
}

export async function guardarJugador(
  j: Partial<Jugador> & { team_id: string; full_name: string },
) {
  const sb = supabase();
  if (j.id) {
    const { id, ...resto } = j;
    return ok<Jugador[]>(
      await sb.from("players").update(resto).eq("id", id).select().returns<Jugador[]>(),
    );
  }
  return ok<Jugador[]>(await sb.from("players").insert(j).select().returns<Jugador[]>());
}

export async function borrarJugador(id: string) {
  const { error } = await supabase().from("players").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------- tutores --
export async function listarTutores(equipoId: string) {
  return ok<Tutor[]>(
    await supabase()
      .from("guardians")
      .select("*")
      .eq("team_id", equipoId)
      .order("full_name")
      .returns<Tutor[]>(),
  );
}

export async function guardarTutor(
  t: Partial<Tutor> & { team_id: string; full_name: string },
) {
  const sb = supabase();
  if (t.id) {
    const { id, ...resto } = t;
    return ok<Tutor[]>(
      await sb.from("guardians").update(resto).eq("id", id).select().returns<Tutor[]>(),
    );
  }
  return ok<Tutor[]>(await sb.from("guardians").insert(t).select().returns<Tutor[]>());
}

export async function borrarTutor(id: string) {
  const { error } = await supabase().from("guardians").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listarVinculos(equipoId: string) {
  const { data, error } = await supabase()
    .from("player_guardians")
    .select("player_id, guardian_id, players!inner(team_id)")
    .eq("players.team_id", equipoId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((v) => ({
    player_id: v.player_id as string,
    guardian_id: v.guardian_id as string,
  }));
}

export async function vincular(playerId: string, guardianId: string, unir: boolean) {
  const sb = supabase();
  if (unir) {
    const { error } = await sb
      .from("player_guardians")
      .upsert({ player_id: playerId, guardian_id: guardianId });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb
      .from("player_guardians")
      .delete()
      .eq("player_id", playerId)
      .eq("guardian_id", guardianId);
    if (error) throw new Error(error.message);
  }
}

// --------------------------------------------------------- entrenamientos --
export async function listarEntrenamientos(equipoId: string) {
  return ok<Entrenamiento[]>(
    await supabase()
      .from("trainings")
      .select("*")
      .eq("team_id", equipoId)
      .order("starts_at", { ascending: false })
      .returns<Entrenamiento[]>(),
  );
}

export async function guardarEntrenamiento(
  e: Partial<Entrenamiento> & { team_id: string; starts_at: string },
) {
  const sb = supabase();
  if (e.id) {
    const { id, ...resto } = e;
    return ok<Entrenamiento[]>(
      await sb
        .from("trainings")
        .update(resto)
        .eq("id", id)
        .select()
        .returns<Entrenamiento[]>(),
    );
  }
  return ok<Entrenamiento[]>(
    await sb.from("trainings").insert(e).select().returns<Entrenamiento[]>(),
  );
}

export async function borrarEntrenamiento(id: string) {
  const { error } = await supabase().from("trainings").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function asistenciaDe(entrenamientoId: string) {
  return ok<AsistenciaEntreno[]>(
    await supabase()
      .from("training_attendance")
      .select("*")
      .eq("training_id", entrenamientoId)
      .returns<AsistenciaEntreno[]>(),
  );
}

export async function fijarAsistencia(
  entrenamientoId: string,
  jugadorId: string,
  estado: Disponibilidad,
) {
  const { error } = await supabase()
    .from("training_attendance")
    .upsert(
      { training_id: entrenamientoId, player_id: jugadorId, status: estado },
      { onConflict: "training_id,player_id" },
    );
  if (error) throw new Error(error.message);
}

// ----------------------------------------------------------------- partidos --
export async function listarPartidos(equipoId: string) {
  return ok<Partido[]>(
    await supabase()
      .from("matches")
      .select("*")
      .eq("team_id", equipoId)
      .order("kickoff_at", { ascending: false })
      .returns<Partido[]>(),
  );
}

export async function guardarPartido(
  p: Partial<Partido> & { team_id: string; opponent: string; kickoff_at: string },
) {
  const sb = supabase();
  if (p.id) {
    const { id, ...resto } = p;
    return ok<Partido[]>(
      await sb.from("matches").update(resto).eq("id", id).select().returns<Partido[]>(),
    );
  }
  return ok<Partido[]>(await sb.from("matches").insert(p).select().returns<Partido[]>());
}

export async function borrarPartido(id: string) {
  const { error } = await supabase().from("matches").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function disponibilidadDe(partidoId: string) {
  return ok<DisponibilidadPartido[]>(
    await supabase()
      .from("match_availability")
      .select("*")
      .eq("match_id", partidoId)
      .returns<DisponibilidadPartido[]>(),
  );
}

export async function fijarDisponibilidad(
  partidoId: string,
  jugadorId: string,
  estado: Disponibilidad,
) {
  const { error } = await supabase()
    .from("match_availability")
    .upsert(
      { match_id: partidoId, player_id: jugadorId, status: estado },
      { onConflict: "match_id,player_id" },
    );
  if (error) throw new Error(error.message);
}

// ------------------------------------------------------------ convocatorias --
export async function listarConvocatorias(equipoId: string) {
  return ok<Convocatoria[]>(
    await supabase()
      .from("call_ups")
      .select("*")
      .eq("team_id", equipoId)
      .order("created_at", { ascending: false })
      .returns<Convocatoria[]>(),
  );
}

export async function convocados(convocatoriaId: string) {
  const { data, error } = await supabase()
    .from("call_up_players")
    .select("player_id")
    .eq("call_up_id", convocatoriaId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.player_id as string);
}

export async function abrirConvocatoria(equipoId: string, partidoId: string) {
  const sb = supabase();
  const { data: existente } = await sb
    .from("call_ups")
    .select("*")
    .eq("match_id", partidoId)
    .maybeSingle();
  if (existente) return existente as Convocatoria;
  const filas = ok<Convocatoria[]>(
    await sb
      .from("call_ups")
      .insert({ team_id: equipoId, match_id: partidoId, status: "draft" })
      .select()
      .returns<Convocatoria[]>(),
  );
  return filas[0];
}

export async function fijarConvocados(convocatoriaId: string, jugadorIds: string[]) {
  const sb = supabase();
  const { error: e1 } = await sb
    .from("call_up_players")
    .delete()
    .eq("call_up_id", convocatoriaId);
  if (e1) throw new Error(e1.message);
  if (jugadorIds.length) {
    const { error: e2 } = await sb
      .from("call_up_players")
      .insert(jugadorIds.map((id) => ({ call_up_id: convocatoriaId, player_id: id })));
    if (e2) throw new Error(e2.message);
  }
}

export async function publicarConvocatoria(convocatoriaId: string, mensaje: string) {
  const { error } = await supabase()
    .from("call_ups")
    .update({
      status: "published",
      message: mensaje,
      published_at: new Date().toISOString(),
    })
    .eq("id", convocatoriaId);
  if (error) throw new Error(error.message);
}

// ------------------------------------------------------------- mensajes ----
export async function listarMensajes(equipoId: string) {
  return ok<Mensaje[]>(
    await supabase()
      .from("messages")
      .select("*")
      .eq("team_id", equipoId)
      .order("created_at", { ascending: false })
      .returns<Mensaje[]>(),
  );
}

export async function crearMensaje(m: {
  team_id: string;
  kind: TipoMensaje;
  subject: string;
  body: string;
  audience: string;
  recipients_count: number;
}) {
  const { data: u } = await supabase().auth.getUser();
  return ok<Mensaje[]>(
    await supabase()
      .from("messages")
      .insert({ ...m, created_by: u.user?.id ?? null })
      .select()
      .returns<Mensaje[]>(),
  );
}

// ------------------------------------------------------------- ejemplo -----
const PLANTILLA_EJEMPLO: Array<[string, number, "PT" | "DF" | "MC" | "DL"]> = [
  ["Rubén Cabrera", 1, "PT"],
  ["Marcos Vidal", 2, "DF"],
  ["Aitor Nieto", 3, "DF"],
  ["Gonzalo Mena", 4, "DF"],
  ["Nico Duarte", 5, "DF"],
  ["Sergio Prieto", 6, "MC"],
  ["Iker Salas", 7, "DL"],
  ["Pablo Serrano", 8, "MC"],
  ["Álvaro Herrero", 9, "DL"],
  ["Hugo Peña", 10, "MC"],
  ["Lucas Arriaga", 11, "MC"],
  ["Adrián Pozo", 13, "PT"],
  ["Mateo Rivas", 14, "DL"],
  ["Iván Oliva", 15, "DF"],
  ["Antonio Cuevas", 16, "MC"],
  ["Diego Carrión", 17, "DF"],
  ["Óscar Bravo", 18, "MC"],
  ["Bruno Salgado", 19, "DL"],
];

const TUTORES_EJEMPLO: Array<[string, string, string]> = [
  ["Marta Soler", "Madre", "Marcos Vidal"],
  ["Javier Serrano", "Padre", "Pablo Serrano"],
  ["Carla Duarte", "Madre", "Nico Duarte"],
  ["Andrés Peña", "Padre", "Hugo Peña"],
  ["Rosa Arriaga", "Madre", "Lucas Arriaga"],
];

/** Fecha del próximo día de la semana pedido, a la hora indicada. */
function proximo(diaSemana: number, hora: number, minuto = 0) {
  const d = new Date();
  d.setHours(hora, minuto, 0, 0);
  const salto = (diaSemana - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + salto);
  return d.toISOString();
}

/**
 * Deja el equipo con datos con los que se pueda trastear desde el primer
 * minuto: plantilla, familias, un entrenamiento y el partido del sábado con
 * media respuesta dada, que es el caso interesante.
 */
export async function sembrarEjemplo(equipoId: string) {
  const sb = supabase();

  const jugadores = ok<Jugador[]>(
    await sb
      .from("players")
      .insert(
        PLANTILLA_EJEMPLO.map(([full_name, shirt_number, position]) => ({
          team_id: equipoId,
          full_name,
          shirt_number,
          position,
        })),
      )
      .select()
      .returns<Jugador[]>(),
  );

  const tutores = ok<Tutor[]>(
    await sb
      .from("guardians")
      .insert(
        TUTORES_EJEMPLO.map(([full_name, relation]) => ({
          team_id: equipoId,
          full_name,
          relation,
          email: `${full_name.split(" ")[0].toLowerCase()}@ejemplo.com`,
        })),
      )
      .select()
      .returns<Tutor[]>(),
  );

  const porNombre = new Map(jugadores.map((j) => [j.full_name, j.id]));
  const vinculos = TUTORES_EJEMPLO.map(([nombre, , hijo], i) => ({
    guardian_id: tutores[i]?.id,
    player_id: porNombre.get(hijo),
  })).filter((v): v is { guardian_id: string; player_id: string } =>
    Boolean(v.guardian_id && v.player_id),
  );
  if (vinculos.length) await sb.from("player_guardians").insert(vinculos);

  const entrenos = ok<Entrenamiento[]>(
    await sb
      .from("trainings")
      .insert([
        {
          team_id: equipoId,
          starts_at: proximo(4, 18),
          pitch: "Campo 2 · Césped artificial",
        },
        {
          team_id: equipoId,
          starts_at: proximo(2, 18),
          pitch: "Campo 2 · Césped artificial",
        },
      ])
      .select()
      .returns<Entrenamiento[]>(),
  );

  const partidos = ok<Partido[]>(
    await sb
      .from("matches")
      .insert({
        team_id: equipoId,
        opponent: "CF Alcorada",
        is_home: false,
        kickoff_at: proximo(6, 11, 30),
        venue: "Campo Municipal de Alcorada",
        competition: "Liga Infantil · Jornada 21",
        meeting_at: proximo(6, 10, 15),
        kit: "Equipación visitante",
      })
      .select()
      .returns<Partido[]>(),
  );

  // Doce sí, tres no, tres sin contestar: el reparto que hace útil la pantalla.
  const partido = partidos[0];
  if (partido) {
    await sb.from("match_availability").insert(
      jugadores.slice(0, 15).map((j, i) => ({
        match_id: partido.id,
        player_id: j.id,
        status: (i < 12 ? "yes" : "no") as Disponibilidad,
      })),
    );
  }

  const entreno = entrenos[0];
  if (entreno) {
    await sb.from("training_attendance").insert(
      jugadores.slice(0, 16).map((j, i) => ({
        training_id: entreno.id,
        player_id: j.id,
        status: (i < 15 ? "yes" : "no") as Disponibilidad,
      })),
    );
  }
}
