/**
 * Aleatoriedad determinista y reproducible (ADR-010).
 *
 * `Math.random()` está prohibido por lint en todo el repositorio. Todo sorteo
 * se siembra con datos estables (semilla del mundo, identificador de la
 * entidad, tipo de suceso), de modo que el resultado puede recalcularse más
 * tarde para auditarlo y no depende del momento en que se ejecute el cálculo.
 */
export type Rng = () => number;

/** xmur3: mezcla una cadena en una semilla de 32 bits. */
function hashString(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** Semilla estable de 32 bits a partir de cualquier combinación de partes. */
export function seedFrom(...parts: readonly (string | number)[]): number {
  return hashString(parts.map(String).join('|'));
}

/** mulberry32: generador rápido, de buena calidad y reproducible entre plataformas. */
export function createRng(...parts: readonly (string | number)[]): Rng {
  let state = seedFrom(...parts);
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entero uniforme en [min, max], ambos incluidos. */
export function nextInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Real uniforme en [min, max). */
export function nextFloat(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function bernoulli(rng: Rng, probability: number): boolean {
  return rng() < probability;
}

/** Elige un elemento según pesos relativos. Los pesos no tienen que sumar 1. */
export function weightedPick<T>(rng: Rng, entries: readonly (readonly [T, number])[]): T {
  let total = 0;
  for (const [, weight] of entries) total += weight;
  if (total <= 0) {
    throw new Error('weightedPick requiere al menos un peso positivo');
  }
  let threshold = rng() * total;
  for (const [value, weight] of entries) {
    threshold -= weight;
    if (threshold <= 0) return value;
  }
  // Sólo alcanzable por error de redondeo en coma flotante.
  const last = entries[entries.length - 1];
  if (last === undefined) throw new Error('weightedPick sobre una lista vacía');
  return last[0];
}

/** Ruido normal estándar (Box-Muller), determinista sobre el mismo `rng`. */
export function nextGaussian(rng: Rng): number {
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
