import {
  addDays,
  addMinutes,
  MS_PER_DAY,
  startOfUtcDay,
  utcDayOfWeek,
  type Instant,
} from '@airline/shared';
import { scheduleCoversDay, type FlightSchedule } from '../entities/schedule.js';

/**
 * Convierte una plantilla de programación en salidas concretas dentro de una
 * ventana temporal.
 *
 * El jugador configura "lunes, miércoles y viernes a las 18:20" una vez y el
 * sistema genera los vuelos indefinidamente. Es la pieza que hace llevadero el
 * tiempo real 1:1 (docs/03 §3.1): sin ella, jugar sería programar vuelos a
 * mano todos los días.
 *
 * La función es pura y acotada: genera la ventana que se le pide, de modo que
 * el worker puede materializar sólo unos días por delante en vez de inundar la
 * base de datos con meses de vuelos que quizá se cancelen.
 */
export function expandSchedule(
  schedule: FlightSchedule,
  windowStart: Instant,
  windowEnd: Instant,
): readonly Instant[] {
  if (!schedule.isActive || windowEnd <= windowStart) return [];

  const departures: Instant[] = [];
  const maxDays = Math.ceil((windowEnd - windowStart) / MS_PER_DAY) + 1;

  let day = startOfUtcDay(windowStart);

  for (let i = 0; i <= maxDays; i++, day = addDays(day, 1)) {
    if (!scheduleCoversDay(schedule, utcDayOfWeek(day))) continue;

    const departure = addMinutes(day, schedule.departureMinuteUtc);
    if (departure < windowStart || departure >= windowEnd) continue;
    if (departure < schedule.validFrom) continue;
    if (schedule.validTo !== null && departure > schedule.validTo) continue;

    departures.push(departure);
  }

  return departures;
}
