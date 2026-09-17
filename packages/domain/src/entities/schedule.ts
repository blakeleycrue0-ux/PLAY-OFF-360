import type { AircraftId, Instant, Minutes, RouteId, ScheduleId } from '@airline/shared';

/**
 * Plantilla de programación: "lunes, miércoles y viernes a las 18:20 con este
 * avión". El jugador configura la plantilla una vez y el sistema genera los
 * vuelos, que es lo que hace llevadero el tiempo real 1:1 (docs/03 §3.1).
 */
export interface FlightSchedule {
  readonly id: ScheduleId;
  readonly routeId: RouteId;
  readonly aircraftId: AircraftId;
  /** Máscara de bits de días de la semana: bit 0 = domingo … bit 6 = sábado. */
  readonly daysOfWeek: number;
  /** Minutos desde medianoche UTC. */
  readonly departureMinuteUtc: Minutes;
  readonly flightNumber: string;
  readonly validFrom: Instant;
  readonly validTo: Instant | null;
  readonly isActive: boolean;
}

export const DAY_BITS = [1, 2, 4, 8, 16, 32, 64] as const;

export function daysOfWeekMask(days: readonly number[]): number {
  let mask = 0;
  for (const day of days) {
    const bit = DAY_BITS[day];
    if (bit === undefined) throw new Error(`Día de la semana fuera de rango: ${day}`);
    mask |= bit;
  }
  return mask;
}

export function scheduleCoversDay(schedule: FlightSchedule, dayOfWeek: number): boolean {
  const bit = DAY_BITS[dayOfWeek];
  return bit !== undefined && (schedule.daysOfWeek & bit) !== 0;
}

/** Frecuencias semanales de una plantilla; entra en el logit como log(1+f). */
export function weeklyFrequency(schedule: FlightSchedule): number {
  let count = 0;
  for (const bit of DAY_BITS) if ((schedule.daysOfWeek & bit) !== 0) count += 1;
  return count;
}
