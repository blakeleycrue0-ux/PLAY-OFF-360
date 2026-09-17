/** Error de regla de negocio: la operación es inválida según el dominio. */
export class DomainError extends Error {
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, details: Readonly<Record<string, unknown>> = {}) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}

/** Invariante rota: indica un fallo de programación, no una entrada inválida. */
export class InvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvariantError';
  }
}

export function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) throw new InvariantError(message);
}
