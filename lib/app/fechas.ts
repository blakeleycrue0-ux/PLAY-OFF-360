const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function hora(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** «Sábado 14 de marzo» */
export function fechaLarga(iso: string) {
  const d = new Date(iso);
  return `${cap(DIAS[d.getDay()])} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** «sáb 14 mar · 11:30» */
export function fechaCorta(iso: string) {
  const d = new Date(iso);
  return `${DIAS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)} · ${hora(iso)}`;
}

export function fechaYHora(iso: string) {
  return `${fechaLarga(iso)} · ${hora(iso)}`;
}

/** «hace 4 min», «ayer», «hace 3 días» */
export function haceTiempo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ayer";
  if (d < 30) return `hace ${d} días`;
  return fechaLarga(iso);
}

export function esFuturo(iso: string) {
  return new Date(iso).getTime() > Date.now();
}

/** Valor para <input type="datetime-local"> a partir de un ISO. */
export function paraInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Lo contrario: el valor del input a ISO. */
export function desdeInput(valor: string) {
  return valor ? new Date(valor).toISOString() : null;
}

export function saludo() {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 14) return "Buenos días";
  if (h < 21) return "Buenas tardes";
  return "Buenas noches";
}

/** Nombre de pila para saludar: el que dio al registrarse, o el del correo. */
export function nombreCorto(
  user: { email?: string | null; user_metadata?: { nombre?: string | null } } | null,
) {
  const propio = user?.user_metadata?.nombre?.trim();
  if (propio) return propio.split(" ")[0];
  const alias = user?.email?.split("@")[0] ?? "";
  if (!alias) return "entrenador";
  const limpio = alias.replace(/[._-]+/g, " ").split(" ")[0];
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}
