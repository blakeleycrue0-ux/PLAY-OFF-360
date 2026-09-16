/**
 * One fictional club, used consistently across every interface on the page.
 * The same names, the same match, the same week — so the product reads as
 * a real system rather than a set of unrelated mockups.
 */

export const CLUB = {
  name: "CD Valmorán",
  short: "VAL",
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
  { name: "Rubén Cabrera", pos: "PT", num: 1, status: "ok" },
  { name: "Marcos Vidal", pos: "DF", num: 2, status: "ok" },
  { name: "Aitor Nieto", pos: "DF", num: 3, status: "ok" },
  { name: "Gonzalo Mena", pos: "DF", num: 4, status: "wait" },
  { name: "Nico Duarte", pos: "DF", num: 5, status: "ok" },
  { name: "Sergio Prieto", pos: "MC", num: 6, status: "ok" },
  { name: "Pablo Serrano", pos: "MC", num: 8, status: "ok", note: "Capitán" },
  { name: "Hugo Peña", pos: "MC", num: 10, status: "ok" },
  { name: "Lucas Arriaga", pos: "MC", num: 11, status: "no", note: "Examen" },
  { name: "Iker Salas", pos: "DL", num: 7, status: "ok" },
  { name: "Álvaro Herrero", pos: "DL", num: 9, status: "ok" },
  { name: "Mateo Rivas", pos: "DL", num: 14, status: "wait" },
  { name: "Iván Oliva", pos: "DF", num: 15, status: "ok" },
  { name: "Antonio Cuevas", pos: "MC", num: 16, status: "ok" },
  { name: "Adrián Pozo", pos: "PT", num: 13, status: "ok" },
  { name: "Diego Carrión", pos: "DF", num: 17, status: "ok" },
  { name: "Óscar Bravo", pos: "MC", num: 18, status: "ok" },
  { name: "Bruno Salgado", pos: "DL", num: 19, status: "wait" },
];

export const SQUAD_NAMES = SQUAD.map((p) => p.name);

export const STAFF = [
  { name: "Dani Moreno", role: "Entrenador", meta: "Infantil A" },
  { name: "Rafa Gallego", role: "Segundo entrenador", meta: "Infantil A" },
  { name: "Chema Ruiz", role: "Delegado", meta: "Actas y campo" },
  { name: "Nuria Vega", role: "Coordinadora", meta: "Fútbol base" },
];

export const FAMILIES = [
  { name: "Marta Soler", role: "Madre de Marcos Vidal", status: "ok" as const },
  { name: "Javier Serrano", role: "Padre de Pablo Serrano", status: "ok" as const },
  { name: "Carla Duarte", role: "Madre de Nico Duarte", status: "wait" as const },
  { name: "Andrés Peña", role: "Padre de Hugo Peña", status: "ok" as const },
  { name: "Rosa Arriaga", role: "Madre de Lucas Arriaga", status: "no" as const },
];

export const MATCH = {
  day: "Sábado",
  date: "14 de marzo",
  time: "11:30",
  home: "CF Alcorada",
  away: "CD Valmorán",
  venue: "Campo Municipal de Alcorada",
  city: "Alcorada",
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
    coach: "Rafa Gallego",
    state: "3 sin responder",
    tone: "wait" as const,
  },
  {
    name: "Alevín A",
    players: 14,
    coach: "Nuria Vega",
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
    coach: "Sara Bermejo",
    state: "Al día",
    tone: "ok" as const,
  },
  {
    name: "Prebenjamín",
    players: 12,
    coach: "Tomás Gil",
    state: "Al día",
    tone: "ok" as const,
  },
];
