import { clamp, type Money } from '@airline/shared';
import {
  DEMAND_SEGMENTS,
  type BalanceConfig,
  type CabinClass,
  type DemandSegment,
} from '@airline/config';
import type { PaxByCabin } from '../entities/flight.js';
import type { DemandBySegment } from './base-demand.js';
import type { FlightOption, MarketContext } from './market.js';

/** Cabina que compra cada segmento, si la oferta la tiene instalada. */
function cabinFor(segment: DemandSegment, option: FlightOption): CabinClass {
  return segment === 'business' && option.seats.business > 0 ? 'business' : 'economy';
}

/**
 * Conveniencia del horario para un segmento, 0..1.
 *
 * Se evalúa en hora local del origen —al pasajero le importa salir a las siete
 * de la mañana, no a las cinco UTC— y decae como una campana alrededor de las
 * horas punta del segmento. Un vuelo a las 03:00 puede ser barato y aun así no
 * vender: ésa es la idea.
 */
export function timeOfDayScore(
  departureMinuteUtc: number,
  originUtcOffsetMinutes: number,
  segment: DemandSegment,
  config: BalanceConfig,
): number {
  const localHour = ((((departureMinuteUtc + originUtcOffsetMinutes) / 60) % 24) + 24) % 24;
  const width = config.demand.peakWidthHours;

  let best = 0;
  for (const peak of config.demand.peakDepartureHours[segment]) {
    // Distancia circular: las 23:30 están a media hora de las 00:00.
    const raw = Math.abs(localHour - peak);
    const delta = Math.min(raw, 24 - raw);
    best = Math.max(best, Math.exp(-0.5 * (delta / width) ** 2));
  }
  return best;
}

/**
 * Utilidad de una oferta para un segmento (docs/04 §4.2).
 *
 * El precio entra en logaritmo sobre el precio de referencia, de modo que el
 * coeficiente es una elasticidad: duplicar el precio resta siempre lo mismo,
 * valga el billete 40 € o 400 €. La frecuencia también entra en logaritmo, y
 * ése es el detalle del que depende que el juego no se gane con dinero: la
 * décima frecuencia aporta muchísimo menos que la segunda, mientras que los
 * asientos que añade cuestan igual.
 */
export function calculateUtility(
  option: FlightOption,
  segment: DemandSegment,
  market: MarketContext,
  config: BalanceConfig,
): number {
  const coefficients = config.logit[segment];
  const cabin = cabinFor(segment, option);

  const price = Math.max(1, option.prices[cabin]);
  const reference = Math.max(1, market.referenceFares[cabin]);

  return (
    coefficients.price * Math.log(price / reference) +
    coefficients.timeOfDay *
      timeOfDayScore(option.departureMinuteUtc, option.originUtcOffsetMinutes, segment, config) +
    coefficients.frequency * Math.log(1 + option.weeklyFrequency) +
    coefficients.reputation * (clamp(option.reputation, 0, 100) / 100) +
    coefficients.punctuality * (clamp(option.onTimeRate, 0, 100) / 100) +
    coefficients.product * clamp(option.productScore, 0, 1) +
    coefficients.loyalty * clamp(option.loyalty, 0, 1) -
    coefficients.stops * option.stops
  );
}

export interface OptionAllocation {
  readonly key: string;
  readonly pax: PaxByCabin;
  readonly bySegment: DemandBySegment;
  readonly loadFactor: number;
}

export interface AllocationResult {
  readonly byOption: ReadonlyMap<string, OptionAllocation>;
  /** Demanda que eligió no volar: la opción exterior del logit. */
  readonly noFlyDemand: number;
  /** Demanda que quiso volar y no encontró asiento tras el derrame. */
  readonly unservedDemand: number;
}

const MAX_SPILL_PASSES = 6;

/**
 * Reparte la demanda de un par origen-destino entre las ofertas disponibles
 * (docs/04 §4.2), con derrame hacia los competidores.
 *
 * Tres propiedades importan más que el código:
 *
 * 1. **La capacidad no crea demanda.** La cuota sale de la utilidad relativa,
 *    no de los asientos ofrecidos. Añadir aviones a una ruta saturada baja la
 *    ocupación de todos, empezando por quien los añade.
 * 2. **"No volar" está en el denominador.** Si todo el mercado sube precios, el
 *    pasaje se queda en casa en vez de pagar. No hay forma de exprimir un
 *    mercado indefinidamente.
 * 3. **El derrame crea nichos.** Cuando el operador dominante llena sus aviones,
 *    el resto de la demanda va a los demás, y el pequeño empieza a ganar
 *    dinero. El mercado se autorregula sin ninguna regla especial.
 */
export function allocateDemand(
  options: readonly FlightOption[],
  demand: DemandBySegment,
  market: MarketContext,
  config: BalanceConfig,
): AllocationResult {
  const assigned = new Map<string, Record<DemandSegment, number>>();
  for (const option of options) {
    assigned.set(option.key, { business: 0, leisure: 0, vfr: 0 });
  }

  if (options.length === 0) {
    const total = demand.business + demand.leisure + demand.vfr;
    return { byOption: new Map(), noFlyDemand: total, unservedDemand: 0 };
  }

  const utilities = new Map<string, Record<DemandSegment, number>>();
  for (const option of options) {
    const perSegment = {} as Record<DemandSegment, number>;
    for (const segment of DEMAND_SEGMENTS) {
      perSegment[segment] = calculateUtility(option, segment, market, config);
    }
    utilities.set(option.key, perSegment);
  }

  const capacity = new Map(options.map((o) => [o.key, o.seats.economy + o.seats.business]));
  const remaining = { ...demand };
  const outsideOption = Math.exp(config.demand.noFlyUtility);
  let noFly = 0;
  let open = options.filter((o) => (capacity.get(o.key) ?? 0) > 0);

  for (let pass = 0; pass < MAX_SPILL_PASSES && open.length > 0; pass++) {
    const spilled: Record<DemandSegment, number> = { business: 0, leisure: 0, vfr: 0 };

    for (const segment of DEMAND_SEGMENTS) {
      const segmentDemand = remaining[segment];
      if (segmentDemand <= 0) continue;

      const weights = open.map((o) => Math.exp(utilities.get(o.key)?.[segment] ?? 0));
      const denominator = weights.reduce((a, b) => a + b, 0) + outsideOption;

      noFly += (segmentDemand * outsideOption) / denominator;
      remaining[segment] = 0;

      open.forEach((option, index) => {
        const share = (weights[index] ?? 0) / denominator;
        const wanted = segmentDemand * share;
        const bucket = assigned.get(option.key);
        if (bucket !== undefined) bucket[segment] += wanted;
      });
    }

    // Recorte por capacidad: lo que no cabe vuelve al mercado para la siguiente pasada.
    const stillOpen: FlightOption[] = [];
    for (const option of open) {
      const bucket = assigned.get(option.key);
      const seats = capacity.get(option.key) ?? 0;
      if (bucket === undefined) continue;

      const wanted = bucket.business + bucket.leisure + bucket.vfr;
      if (wanted <= seats) {
        stillOpen.push(option);
        continue;
      }

      const keepRatio = seats / wanted;
      for (const segment of DEMAND_SEGMENTS) {
        const kept = bucket[segment] * keepRatio;
        spilled[segment] += bucket[segment] - kept;
        bucket[segment] = kept;
      }
    }

    const spilledTotal = spilled.business + spilled.leisure + spilled.vfr;
    if (spilledTotal <= 1e-9 || stillOpen.length === 0) {
      remaining.business += spilled.business;
      remaining.leisure += spilled.leisure;
      remaining.vfr += spilled.vfr;
      open = [];
      break;
    }

    remaining.business = spilled.business;
    remaining.leisure = spilled.leisure;
    remaining.vfr = spilled.vfr;
    open = stillOpen;
  }

  const unserved = Math.max(0, remaining.business + remaining.leisure + remaining.vfr);
  return {
    byOption: buildAllocations(options, assigned),
    noFlyDemand: noFly,
    unservedDemand: unserved,
  };
}

/** Convierte demanda continua por segmento en pasajeros enteros por cabina. */
function buildAllocations(
  options: readonly FlightOption[],
  assigned: ReadonlyMap<string, Record<DemandSegment, number>>,
): ReadonlyMap<string, OptionAllocation> {
  const result = new Map<string, OptionAllocation>();

  for (const option of options) {
    const bucket = assigned.get(option.key) ?? { business: 0, leisure: 0, vfr: 0 };

    // El segmento business ocupa cabina business hasta agotarla; el resto baja a turista.
    const businessWanted = Math.round(bucket.business);
    const businessPax = Math.min(businessWanted, option.seats.business);
    const overflow = businessWanted - businessPax;
    const economyPax = Math.min(
      option.seats.economy,
      Math.round(bucket.leisure + bucket.vfr) + overflow,
    );

    const seats = option.seats.economy + option.seats.business;
    const pax: PaxByCabin = { economy: economyPax, business: businessPax };

    result.set(option.key, {
      key: option.key,
      pax,
      bySegment: bucket,
      loadFactor: seats > 0 ? (economyPax + businessPax) / seats : 0,
    });
  }

  return result;
}

/** Ingreso por asiento-kilómetro ofrecido: la métrica de eficiencia de docs/05 §5.6. */
export function revenuePerAsk(revenue: Money, seats: number, distanceKm: number): number {
  const ask = seats * distanceKm;
  return ask > 0 ? revenue / ask : 0;
}
