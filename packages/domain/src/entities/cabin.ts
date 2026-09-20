import type { BalanceConfig, CabinClass } from '@airline/config';

/** Asientos instalados por clase. La suma no puede superar `maxSeats` del tipo. */
export type CabinConfig = Readonly<Record<CabinClass, number>>;

export function totalSeats(cabin: CabinConfig): number {
  return cabin.economy + cabin.business;
}

/**
 * Espacio que ocupa una cabina, en unidades de plaza de turista.
 *
 * Una plaza de business ocupa más que una de turista, así que la capacidad de
 * un tipo no se mide en plazas sino en espacio. El factor vive en los
 * parámetros de balance, no aquí: es un número del juego, no una regla.
 */
export function occupiedSpace(cabin: CabinConfig, config: BalanceConfig): number {
  const factor = config.fleet.cabinSpaceFactor;
  return cabin.economy * factor.economy + cabin.business * factor.business;
}
