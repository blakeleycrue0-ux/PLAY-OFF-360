/**
 * Tipos *branded*: un `string` que representa un identificador de aerolínea no
 * debe poder pasarse donde se espera el de un avión. El coste en tiempo de
 * ejecución es cero; toda la comprobación ocurre al compilar.
 */
declare const brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [brand]: B };
