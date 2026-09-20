export * from './entities/index.js';

export { EARTH_RADIUS_KM, greatCircleDistanceKm, initialBearing } from './geo/distance.js';
export {
  type FlightPhase,
  type FlightPosition,
  FLIGHT_PHASES,
  interpolateGreatCircle,
  altitudeProfile,
  phaseFor,
  calculateFlightPosition,
} from './geo/position.js';

export { worldTimeAt, realTimeFor, realDurationOf } from './time/world-clock.js';
export {
  calculateFlightDuration,
  effectiveDistanceKm,
  turnaroundMinutes,
} from './time/block-time.js';
export { expandSchedule } from './time/schedule-expansion.js';

export { calculateReferenceFare, calculateFare, priceFactorOf } from './economics/fare.js';
export { calculateFuelBurnKg, calculateFuelCost, canCoverDistance } from './economics/fuel.js';
export {
  type OperatingCost,
  type OperatingCostInput,
  calculateOperatingCost,
  calculateDailyFixedCost,
  requiredCabinCrew,
} from './economics/operating-cost.js';
export {
  type FlightEconomics,
  type FlightEconomicsInput,
  type FlightRevenue,
  calculateFlightEconomics,
} from './economics/flight-economics.js';
export {
  type RouteProfitForecast,
  type RouteResults,
  calculateRouteProfit,
  aggregateRouteResults,
} from './economics/route-profit.js';

export { seasonalityFor, dayOfWeekFactor } from './demand/seasonality.js';
export {
  type DemandBreakdown,
  type DemandBySegment,
  calculateDemand,
} from './demand/base-demand.js';
export {
  type FlightOption,
  type MarketContext,
  cabinQualityScore,
  priceFor,
} from './demand/market.js';
export {
  type AllocationResult,
  type OptionAllocation,
  allocateDemand,
  calculateUtility,
  timeOfDayScore,
  revenuePerAsk,
} from './demand/allocation.js';

export {
  type CheckDue,
  type MaintenanceOutcome,
  nextCheckFor,
  isCheckDue,
  checkCost,
  checkDurationDays,
  applyCheck,
  deferCheck,
} from './fleet/maintenance.js';
export { type WearOutcome, applyFlightWear } from './fleet/wear.js';
export { effectiveReliability } from './fleet/reliability.js';

export {
  type DelayBreakdown,
  type DelayInput,
  calculateDepartureDelay,
  isOnTime,
} from './operations/delay.js';
export {
  type Violation,
  type ViolationCode,
  type FlightPlanValidationInput,
  VIOLATION_CODES,
  validateFlightPlan,
} from './operations/validation.js';
