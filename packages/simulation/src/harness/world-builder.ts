import { randomUUID } from 'node:crypto';
import {
  airlineId as toAirlineId,
  aircraftId as toAircraftId,
  minutes,
  money,
  moneyFromEuros,
  routeId as toRouteId,
  scheduleId as toScheduleId,
  worldId as toWorldId,
  type Instant,
  type Minutes,
  type Money,
} from '@airline/shared';
import {
  calculateFlightDuration,
  daysOfWeekMask,
  greatCircleDistanceKm,
  type Aircraft,
  type AircraftType,
  type Airline,
  type Airport,
  type World,
} from '@airline/domain';
import {
  aircraftRepo,
  airlinesRepo,
  idempotencyKey,
  postLedgerEntries,
  routesRepo,
  schedulesRepo,
  worldsRepo,
  type Pool,
  type PoolClient,
} from '@airline/db';
import { withTransaction } from '@airline/db';
import type { BalanceConfig } from '@airline/config';
import { NPC_POLICIES, NPC_STRATEGY_ORDER, type NpcPolicy } from '../npc/policies.js';
import {
  buildCabinConfig,
  buildPrices,
  chooseAircraftType,
  pairKey,
  rankRouteCandidates,
  type RouteCandidate,
} from '../npc/planner.js';

/** Capital inicial de una aerolínea (docs: 50.000.000 €). */
export const FOUNDING_CAPITAL: Money = moneyFromEuros(50_000_000);

export interface ScenarioOptions {
  readonly name: string;
  readonly seed: number;
  readonly startAt: Instant;
  readonly airlineCount: number;
  /** Aeropuertos considerados, ordenados por tamaño de mercado. */
  readonly airportPoolSize: number;
  readonly configVersion: string;
  readonly fuelPriceCentsPerKg: number;
}

export interface ScenarioResult {
  readonly world: World;
  readonly airlines: readonly Airline[];
  readonly aircraftCount: number;
  readonly routeCount: number;
  readonly scheduleCount: number;
}

export interface BuildInput {
  readonly pool: Pool;
  readonly config: BalanceConfig;
  readonly airports: readonly Airport[];
  readonly aircraftTypes: readonly AircraftType[];
  readonly options: ScenarioOptions;
}

/**
 * Construye un escenario reproducible: un mundo, sus aerolíneas artificiales,
 * sus flotas, sus rutas y sus plantillas de programación.
 *
 * Las compañías se crean **en secuencia y viendo lo que ya existe**: la quinta
 * en entrar encuentra los mejores pares ya servidos y tiene que buscarse la
 * vida en otro sitio, igual que un jugador que llega tarde a un mundo. Eso
 * produce una red variada sin necesidad de repartir nada a mano.
 */
export async function buildScenario(input: BuildInput): Promise<ScenarioResult> {
  const { pool, config, options } = input;

  const pool_ = input.airports
    .slice()
    .sort((a, b) => b.marketWeight - a.marketWeight)
    .slice(0, options.airportPoolSize);

  const world = await withTransaction(pool, (tx) =>
    worldsRepo.insertWorld(tx, {
      id: toWorldId(randomUUID()),
      name: options.name,
      seed: options.seed,
      timeScale: 1,
      startedAt: options.startAt,
      configVersion: options.configVersion,
      fuelPriceCentsPerKg: options.fuelPriceCentsPerKg,
      status: 'open',
    }),
  );

  const competitorsByPair = new Map<string, number>();
  const airlines: Airline[] = [];
  let aircraftCount = 0;
  let routeCount = 0;
  let scheduleCount = 0;

  for (let index = 0; index < options.airlineCount; index++) {
    const strategy = NPC_STRATEGY_ORDER[index % NPC_STRATEGY_ORDER.length] ?? 'lowcost';
    const policy = NPC_POLICIES[strategy];
    const hub = pool_[index % Math.min(pool_.length, Math.max(6, options.airlineCount))];
    if (hub === undefined) break;

    const built = await withTransaction(pool, (tx) =>
      buildAirline({
        tx,
        world,
        config,
        policy,
        hub,
        index,
        airports: pool_,
        aircraftTypes: input.aircraftTypes,
        competitorsByPair,
      }),
    );

    airlines.push(built.airline);
    aircraftCount += built.aircraft;
    routeCount += built.routes;
    scheduleCount += built.schedules;
  }

  return { world, airlines, aircraftCount, routeCount, scheduleCount };
}

interface BuildAirlineInput {
  readonly tx: PoolClient;
  readonly world: World;
  readonly config: BalanceConfig;
  readonly policy: NpcPolicy;
  readonly hub: Airport;
  readonly index: number;
  readonly airports: readonly Airport[];
  readonly aircraftTypes: readonly AircraftType[];
  readonly competitorsByPair: Map<string, number>;
}

async function buildAirline(
  input: BuildAirlineInput,
): Promise<{ airline: Airline; aircraft: number; routes: number; schedules: number }> {
  const { tx, world, config, policy, hub, index } = input;

  const airline = await airlinesRepo.insertAirline(tx, {
    id: toAirlineId(randomUUID()),
    worldId: world.id,
    accountId: null,
    name: airlineName(hub, policy),
    iataCode: codeFor(index, 2),
    icaoCode: codeFor(index, 3),
    country: hub.country,
    hub: hub.iata,
    businessModel: policy.businessModel,
    controller: 'npc',
    npcStrategy: policy.strategy,
    cash: money(0),
    reputation: config.reputation.initial,
    onTimeRate: 90,
    foundedAt: world.startedAt,
    isActive: true,
  });

  // El capital inicial entra por el ledger, como cualquier otro movimiento: no
  // hay dinero que aparezca sin su asiento (ADR-007).
  await postLedgerEntries(tx, [
    {
      worldId: world.id,
      airlineId: airline.id,
      occurredAt: world.startedAt,
      category: 'founding_capital',
      amount: FOUNDING_CAPITAL,
      idempotencyKey: idempotencyKey.foundingCapital(airline.id),
      description: 'Capital fundacional',
    },
  ]);

  const referenceType = chooseAircraftType(policy, input.aircraftTypes, 1_500, config);
  if (referenceType === null) {
    return { airline, aircraft: 0, routes: 0, schedules: 0 };
  }

  const candidates = rankRouteCandidates(
    {
      policy,
      hub,
      candidates: input.airports,
      type: referenceType,
      at: world.startedAt,
      fuelPriceCentsPerKg: world.fuelPriceCentsPerKg,
      competitorsByPair: input.competitorsByPair,
    },
    config,
  ).filter((candidate) => candidate.expectedProfitPerFlight > 0);

  return buildFleet({ ...input, airline, candidates, referenceType });
}

interface BuildFleetInput extends BuildAirlineInput {
  readonly airline: Airline;
  readonly candidates: readonly RouteCandidate[];
  readonly referenceType: AircraftType;
}

/** Compra la flota, abre sus rutas y programa sus rotaciones. */
async function buildFleet(
  input: BuildFleetInput,
): Promise<{ airline: Airline; aircraft: number; routes: number; schedules: number }> {
  const { tx, world, config, policy, index, airline, candidates, referenceType } = input;

  const fleetSize = policy.targetFleetSize;
  const pairsPerAircraft = policy.networkAmbition >= 1.2 ? 2 : 1;
  const wanted = Math.min(candidates.length, fleetSize * pairsPerAircraft);

  let aircraftBuilt = 0;
  let routes = 0;
  let schedules = 0;

  for (let i = 0; i < fleetSize; i++) {
    const assigned = candidates.slice(i * pairsPerAircraft, (i + 1) * pairsPerAircraft);
    const first = assigned[0];
    if (first === undefined || i * pairsPerAircraft >= wanted) break;

    const type =
      chooseAircraftType(policy, input.aircraftTypes, first.distanceKm, config) ?? referenceType;
    const aircraft = await createAircraft(
      tx,
      world,
      airline,
      type,
      policy,
      config,
      `${index}-${i}`,
    );
    aircraftBuilt += 1;

    const rotation = buildRotation(assigned, type, policy, config, index * 7 + i);

    for (const leg of rotation) {
      const created = await createRouteAndSchedule(tx, {
        world,
        airline,
        aircraft,
        policy,
        config,
        origin: leg.origin,
        destination: leg.destination,
        departureMinute: leg.departureMinute,
        flightNumber: `${airline.icaoCode}${(routes + 1).toString().padStart(3, '0')}`,
      });
      routes += created.routes;
      schedules += created.schedules;

      const key = pairKey(leg.origin.iata, leg.destination.iata);
      input.competitorsByPair.set(key, (input.competitorsByPair.get(key) ?? 0) + 1);
    }
  }

  return { airline, aircraft: aircraftBuilt, routes, schedules };
}

interface RotationLeg {
  readonly origin: Airport;
  readonly destination: Airport;
  readonly departureMinute: Minutes;
}

/**
 * Ventana operativa de un avión, en **hora local de su base**.
 *
 * Que sea local y no UTC no es un detalle de presentación: una aerolínea con
 * base en Bucarest abre el día tres horas antes, en UTC, que una con base en
 * Lisboa, y las dos abren a las seis de la mañana para su pasaje. Cuando esto
 * se medía en UTC, todo el mundo despegaba a la misma hora absoluta y la
 * operación del mundo cabía en una franja artificialmente estrecha.
 */
const ROTATION_START_HOUR = 6;
const ROTATION_LAST_HOUR = 22;
/** Franjas de arranque distintas para escalonar la flota a lo largo del día. */
const ROTATION_SLOTS = 6;
const ROTATION_SLOT_HOURS = 2;

/**
 * Encadena ida y vuelta de cada destino asignado a un avión.
 *
 * Un avión que vuela a Londres está en Londres: el tramo de vuelta no es un
 * adorno, es lo que hace que la programación sea físicamente posible. El
 * manejador de salida cancela los vuelos cuyo avión no está en el origen, así
 * que una rotación mal construida se ve inmediatamente en los resultados.
 */
function buildRotation(
  assigned: readonly {
    readonly origin: Airport;
    readonly destination: Airport;
    readonly distanceKm: number;
  }[],
  type: AircraftType,
  policy: NpcPolicy,
  config: BalanceConfig,
  aircraftIndex: number,
): readonly RotationLeg[] {
  const legs: RotationLeg[] = [];

  // El horario se construye en hora local de la base y se pasa a UTC al final,
  // que es como lo publica una aerolínea de verdad.
  const hub = assigned[0]?.origin;
  const hubOffsetMinutes = hub === undefined ? 0 : hub.utcOffsetMinutes;

  // Una flota no despega entera al amanecer. Cada avión arranca su rotación en
  // una franja distinta, de modo que la operación cubre el día completo en vez
  // de agotarse a media tarde. De paso reparte la presión sobre los
  // aeropuertos, que es lo que hará falta cuando existan los slots.
  let cursor = (ROTATION_START_HOUR + (aircraftIndex % ROTATION_SLOTS) * ROTATION_SLOT_HOURS) * 60;

  for (const candidate of assigned) {
    const block = calculateFlightDuration(candidate.distanceKm, type, config);
    const turnaround = type.turnaroundMinutes + policy.rotationBufferMinutes;

    if (cursor + (block + turnaround) * 2 > ROTATION_LAST_HOUR * 60) break;

    legs.push({
      origin: candidate.origin,
      destination: candidate.destination,
      departureMinute: toUtcMinute(cursor, hubOffsetMinutes),
    });
    cursor += block + turnaround;

    legs.push({
      origin: candidate.destination,
      destination: candidate.origin,
      departureMinute: toUtcMinute(cursor, hubOffsetMinutes),
    });
    cursor += block + turnaround;
  }

  return legs;
}

/**
 * Pasa un minuto del día local de la base a minuto del día UTC.
 *
 * Con la ventana operativa (06:00–22:00 locales) y los husos que hay en el
 * conjunto de datos (de UTC−1 a UTC+3) el resultado siempre cae dentro del
 * mismo día, pero se normaliza igualmente: la alternativa es que un huso nuevo
 * meta un minuto negativo en la base sin que nadie se entere.
 */
export function toUtcMinute(localMinute: number, offsetMinutes: number): Minutes {
  const utc = localMinute - offsetMinutes;
  return minutes(((utc % 1440) + 1440) % 1440);
}

async function createAircraft(
  tx: PoolClient,
  world: World,
  airline: Airline,
  type: AircraftType,
  policy: NpcPolicy,
  config: BalanceConfig,
  suffix: string,
): Promise<Aircraft> {
  return aircraftRepo.insertAircraft(tx, {
    id: toAircraftId(randomUUID()),
    worldId: world.id,
    airlineId: airline.id,
    typeCode: type.code,
    registration: `${airline.icaoCode}-${suffix}`.toUpperCase(),
    ownership: 'leased',
    leaseRate: money(type.leaseRateMonthCents),
    purchasePrice: null,
    config: buildCabinConfig(policy, type, config),
    builtYear: 2022,
    flightHours: 0,
    cycles: 0,
    condition: 100,
    nextCheckType: 'A',
    nextCheckAtHours: config.fleet.checks.A.intervalHours,
    deferredChecks: 0,
    status: 'idle',
    currentAirport: airline.hub,
    availableAt: world.startedAt,
  });
}

interface CreateRouteInput {
  readonly world: World;
  readonly airline: Airline;
  readonly aircraft: Aircraft;
  readonly policy: NpcPolicy;
  readonly config: BalanceConfig;
  readonly origin: Airport;
  readonly destination: Airport;
  readonly departureMinute: Minutes;
  readonly flightNumber: string;
}

async function createRouteAndSchedule(
  tx: PoolClient,
  input: CreateRouteInput,
): Promise<{ routes: number; schedules: number }> {
  const distanceKm = Math.round(greatCircleDistanceKm(input.origin, input.destination));

  const route = await routesRepo.insertRoute(
    tx,
    {
      id: toRouteId(randomUUID()),
      worldId: input.world.id,
      airlineId: input.airline.id,
      origin: input.origin.iata,
      destination: input.destination.iata,
      distanceKm,
      prices: buildPrices(input.policy, distanceKm, input.config),
      serviceLevel: input.policy.serviceLevel,
      status: 'active',
    },
    input.world.startedAt,
  );

  await schedulesRepo.insertSchedule(
    tx,
    input.world.id,
    {
      id: toScheduleId(randomUUID()),
      routeId: route.id,
      aircraftId: input.aircraft.id,
      daysOfWeek: daysOfWeekMask(daysFor(input.policy.weeklyFrequency)),
      departureMinuteUtc: input.departureMinute,
      flightNumber: input.flightNumber,
      validFrom: input.world.startedAt,
      validTo: null,
      isActive: true,
    },
    input.world.startedAt,
  );

  return { routes: 1, schedules: 1 };
}

/** Reparte N frecuencias semanales por los días de la semana. */
function daysFor(weeklyFrequency: number): readonly number[] {
  const all = [1, 2, 3, 4, 5, 6, 0];
  return all.slice(0, Math.max(1, Math.min(7, weeklyFrequency)));
}

/**
 * Sufijo comercial por estrategia. Una compañía de bajo coste no se llama igual
 * que una de red, y el nombre es lo primero que ve el jugador en el ranking.
 */
const NAME_SUFFIX: Readonly<Record<NpcPolicy['strategy'], string>> = {
  lowcost: 'Express',
  premium: 'Airways',
  regional: 'Connect',
  hub_and_spoke: 'Lines',
  point_to_point: 'Air',
  conservative: 'Aviation',
  aggressive: 'Jet',
};

/**
 * Nombre comercial a partir de la ciudad del hub.
 *
 * El municipio que trae la fuente puede ser largo o compuesto
 * ("Colombier-Saugnieu, Rhône", "Frankfurt am Main"): se queda con la primera
 * parte legible para que el nombre quepa en una línea de tabla.
 */
function airlineName(hub: Airport, policy: NpcPolicy): string {
  // El nombre de la ciudad ya viene limpio del normalizador de aeropuertos
  // (`displayCity`). Volver a recortarlo aquí sería la misma regla escrita dos
  // veces, y dos copias de una regla acaban divergiendo.
  const base = hub.city.trim().length === 0 ? hub.iata : hub.city.trim();
  return `${base} ${NAME_SUFFIX[policy.strategy]}`;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Códigos IATA/ICAO sintéticos y únicos por índice de aerolínea. */
function codeFor(index: number, length: number): string {
  let value = index;
  let code = '';
  for (let i = 0; i < length; i++) {
    code = (LETTERS[value % 26] ?? 'A') + code;
    value = Math.floor(value / 26);
  }
  return code;
}
