export type Rol = "owner" | "coach" | "delegate" | "coordinator";
export type Posicion = "PT" | "DF" | "MC" | "DL";
export type Disponibilidad = "yes" | "no" | "pending";
export type EstadoConvocatoria = "draft" | "published";
export type TipoMensaje = "convocatoria" | "aviso" | "cambio" | "recordatorio";

export type Club = { id: string; name: string; created_by: string; created_at: string };

export type Equipo = {
  id: string;
  club_id: string;
  name: string;
  category: string | null;
  season: string | null;
  created_at: string;
};

export type Pertenencia = {
  id: string;
  club_id: string;
  user_id: string;
  role: Rol;
  display_name: string | null;
  created_at: string;
};

export type Jugador = {
  id: string;
  team_id: string;
  full_name: string;
  shirt_number: number | null;
  position: Posicion | null;
  birth_date: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
};

export type Tutor = {
  id: string;
  team_id: string;
  full_name: string;
  relation: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
};

export type Entrenamiento = {
  id: string;
  team_id: string;
  starts_at: string;
  pitch: string | null;
  notes: string | null;
  created_at: string;
};

export type Partido = {
  id: string;
  team_id: string;
  opponent: string;
  is_home: boolean;
  kickoff_at: string;
  venue: string | null;
  competition: string | null;
  meeting_at: string | null;
  kit: string | null;
  created_at: string;
};

export type AsistenciaEntreno = {
  id: string;
  training_id: string;
  player_id: string;
  status: Disponibilidad;
  note: string | null;
  updated_at: string;
};

export type DisponibilidadPartido = {
  id: string;
  match_id: string;
  player_id: string;
  status: Disponibilidad;
  note: string | null;
  updated_at: string;
};

export type Convocatoria = {
  id: string;
  match_id: string;
  team_id: string;
  status: EstadoConvocatoria;
  message: string | null;
  published_at: string | null;
  created_at: string;
};

export type Mensaje = {
  id: string;
  team_id: string;
  kind: TipoMensaje;
  subject: string;
  body: string;
  audience: string;
  recipients_count: number;
  created_by: string | null;
  created_at: string;
};
