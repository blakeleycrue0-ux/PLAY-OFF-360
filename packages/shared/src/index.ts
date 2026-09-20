export type { Brand } from './brand.js';
export { DomainError, InvariantError, invariant } from './errors.js';
export { type Result, ok, err, isOk, unwrap } from './result.js';

export {
  type WorldId,
  type AccountId,
  type AirlineId,
  type AircraftId,
  type RouteId,
  type ScheduleId,
  type FlightId,
  type JobId,
  type AirportCode,
  type AircraftTypeCode,
  type CountryCode,
  worldId,
  accountId,
  airlineId,
  aircraftId,
  routeId,
  scheduleId,
  flightId,
  airportCode,
  countryCode,
  aircraftTypeCode,
} from './ids.js';

export {
  type Money,
  ZERO_MONEY,
  money,
  moneyFromEuros,
  toEuros,
  addMoney,
  subMoney,
  negateMoney,
  mulMoney,
  sumMoney,
  compareMoney,
  isNegative,
  formatMoney,
} from './money.js';

export {
  type Rng,
  seedFrom,
  createRng,
  nextInt,
  nextFloat,
  bernoulli,
  weightedPick,
  nextGaussian,
} from './rng/seeded-rng.js';

export {
  type Instant,
  type Millis,
  type Minutes,
  type Hours,
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  instant,
  instantFromISO,
  toISO,
  toDate,
  minutes,
  hours,
  minutesToMillis,
  millisToMinutes,
  minutesToHours,
  addMillis,
  addMinutes,
  addDays,
  diffMinutes,
  isBefore,
  maxInstant,
  minInstant,
  startOfUtcDay,
  utcDateKey,
  utcMonthKey,
  utcDayOfWeek,
  utcMonth,
  utcMinuteOfDay,
} from './time/instant.js';

export type { Clock } from './time/clock.js';
export { SystemClock, systemClock } from './time/system-clock.js';
export { ManualClock } from './time/manual-clock.js';

export { clamp, lerp, sum, round, mean } from './math.js';
