/**
 * Resultado explícito. Se usa donde hace falta acumular varios fallos a la vez
 * —la validación de un vuelo devuelve todas las reglas incumplidas, no la
 * primera— y donde el fallo es esperable y forma parte del dominio.
 * Para fallos de programación se lanza `InvariantError`.
 */
export type Result<T, E> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(r: Result<T, E>): r is { readonly ok: true; readonly value: T } {
  return r.ok;
}

export function unwrap<T, E>(r: Result<T, E>): T {
  if (!r.ok) {
    throw new Error(`unwrap() sobre un Result fallido: ${JSON.stringify(r.error)}`);
  }
  return r.value;
}
