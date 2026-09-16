/**
 * One fictional club, used consistently across every interface on the page.
 * The same names, the same match, the same week — so the product reads as
 * a real system rather than a set of unrelated mockups.
 */

export const CLUB = {
  name: "CD Son Ferrer",
  short: "SFE",
  teamName: "Infantil A",
  season: "2025/26",
  coach: "Dani Moreno",
  coachFirst: "Dani",
};

export type Player = {
  name: string;
  pos: "PT" | "DF" | "MC" | "DL";
  num: number;
  status: "ok" | "wait" | "no";
  note?: string;
};

export const SQUAD: Player[] = [
  { name: "Biel Company", pos: "PT", num: 1, status: "ok" },
  { name: "Marc Vidal", pos: "DF", num: 2, status: "ok" },
  { name: "Aitor Ramis", pos: "DF", num: 3, status: "ok" },
  { name: "Guillem Mas", pos: "DF", num: 4, status: "wait" },
  { name: "Nico Tous", pos: "DF", num: 5, status: "ok" },
  { name: "Sergi Munar", pos: "MC", num: 6, status: "ok" },
  { name: "Pau Server", pos: "MC", num: 8, status: "ok", note: "Capitán" },
  { name: "Hugo Nadal", pos: "MC", num: 10, status: "ok" },
  { name: "Lluc Amengual", pos: "MC", num: 11, status: "no", note: "Examen" },
  { name: "Iker Salas", pos: "DL", num: 7, status: "ok" },
  { name: "Álvaro Ferrer", pos: "DL", num: 9, status: "ok" },
  { name: "Martí Riera", pos: "DL", num: 14, status: "wait" },
  { name: "Jan Oliver", pos: "DF", num: 15, status: "ok" },
  { name: "Toni Bennàsar", pos: "MC", num: 16, status: "ok" },
  { name: "Adrián Pons", pos: "PT", num: 13, status: "ok" },
  { name: "Diego Cabrer", pos: "DF", num: 17, status: "ok" },
  { name: "Óscar Palou", pos: "MC", num: 18, status: "ok" },
  { name: "Bruno Sastre", pos: "DL", num: 19, status: "wait" },
];

export const SQUAD_NAMES = SQUAD.map((p) => p.name);

export const STAFF = [
  { name: "Dani Moreno", role: "Entrenador", meta: "Infantil A" },
  { name: "Rafel Coll", role: "Segundo entrenador", meta: "Infantil A" },
  { name: "Chema Ruiz", role: "Delegado", meta: "Actas y campo" },
  { name: "Neus Bauzá", role: "Coordinadora", meta: "Fútbol base" },
];

export const FAMILIES = [
  { name: "Marta Soler", role: "Madre de Marc Vidal", status: "ok" as const },
  { name: "Jaume Server", role: "Padre de Pau Server", status: "ok" as const },
  { name: "Carla Tous", role: "Madre de Nico Tous", status: "wait" as const },
  { name: "Andreu Nadal", role: "Padre de Hugo Nadal", status: "ok" as const },
  { name: "Rosa Amengual", role: "Madre de Lluc Amengual", status: "no" as const },
];

export const MATCH = {
  day: "Sábado",
  date: "14 de marzo",
  time: "11:30",
  home: "CE Constància",
  away: "CD Son Ferrer",
  venue: "Camp Municipal des Cos",
  city: "Inca",
  competition: "Liga Infantil · Jornada 21",
  meeting: "10:15 en el club",
  travel: "38 min en coche",
  kit: "Equipación visitante",
};

export const TRAINING = {
  day: "Jueves",
  date: "12 de marzo",
  time: "18:00",
  pitch: "Campo 2 · Césped artificial",
  total: 18,
  confirmed: 15,
  pending: 2,
  unavailable: 1,
};

export const TEAMS = [
  {
    name: "Infantil A",
    players: 18,
    coach: "Dani Moreno",
    state: "Convocatoria enviada",
    tone: "ok" as const,
  },
  {
    name: "Cadete B",
    players: 20,
    coach: "Rafel Coll",
    state: "3 sin responder",
    tone: "wait" as const,
  },
  {
    name: "Alevín A",
    players: 14,
    coach: "Neus Bauzá",
    state: "Al día",
    tone: "ok" as const,
  },
  {
    name: "Benjamín C",
    players: 16,
    coach: "Chema Ruiz",
    state: "Falta el acta",
    tone: "no" as const,
  },
  {
    name: "Juvenil A",
    players: 22,
    coach: "Sara Vives",
    state: "Al día",
    tone: "ok" as const,
  },
  {
    name: "Prebenjamín",
    players: 12,
    coach: "Tomeu Llull",
    state: "Al día",
    tone: "ok" as const,
  },
];
