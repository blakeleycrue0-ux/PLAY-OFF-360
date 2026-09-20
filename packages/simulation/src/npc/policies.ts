import type { AircraftCategory, BusinessModel, NpcStrategy } from '@airline/domain';

/**
 * Política de una aerolínea artificial.
 *
 * Una NPC **no** tiene reglas propias (ADR-003): produce las mismas intenciones
 * que un jugador —abrir una ruta, fijar un precio, programar un vuelo— y pasan
 * por las mismas validaciones y la misma liquidación. Lo único que la distingue
 * es qué decide, y eso es exactamente lo que hay en este fichero.
 *
 * Que las siete estrategias sean distintas importa para el diseño: si una
 * dominara siempre, el juego estaría roto, y el arnés de simulación lo mide
 * (docs/04 §4.10).
 */
export interface NpcPolicy {
  readonly strategy: NpcStrategy;
  readonly businessModel: BusinessModel;
  /** Multiplicador sobre el precio de referencia del mercado. */
  readonly priceFactor: number;
  readonly serviceLevel: number;
  /** Fracción de plazas dedicadas a business, 0..0,12. */
  readonly businessSeatShare: number;
  /** Fracción del espacio del tipo que se instala: 1 es alta densidad. */
  readonly densityFactor: number;
  readonly preferredCategories: readonly AircraftCategory[];
  readonly minRouteDistanceKm: number;
  readonly maxRouteDistanceKm: number;
  readonly weeklyFrequency: number;
  readonly targetFleetSize: number;
  /** Cuánto concentra su red en el hub, 0..1. */
  readonly hubFocus: number;
  /** Cuántas rutas abre respecto a las que su flota puede sostener. */
  readonly networkAmbition: number;
  /**
   * Demanda diaria máxima del par que la política acepta.
   *
   * Es el nicho del avión regional: mercados demasiado finos para que un
   * narrowbody los llene. Sin este filtro, las políticas regionales compiten
   * de frente contra 180 plazas con 70, y pierden siempre.
   */
  readonly maxDailyDemand?: number;
  /** Demanda diaria mínima: por debajo, la ruta no sostiene el avión. */
  readonly minDailyDemand?: number;
  /**
   * Margen extra entre tramos, además del turnaround.
   *
   * Es la tensión de docs/03 §3.6 convertida en decisión: cero margen maximiza
   * la utilización de la flota y convierte el primer retraso del día en una
   * cadena de cancelaciones; mucho margen desperdicia avión pero aguanta.
   */
  readonly rotationBufferMinutes: number;
}

export const NPC_POLICIES: Readonly<Record<NpcStrategy, NpcPolicy>> = {
  // Precio agresivo, cabina densa, sin extras de servicio: gana por coste
  // unitario y se hunde si alguien le quita la ocupación.
  lowcost: {
    strategy: 'lowcost',
    businessModel: 'lowcost',
    priceFactor: 0.78,
    serviceLevel: 0,
    businessSeatShare: 0,
    densityFactor: 1,
    preferredCategories: ['narrowbody'],
    minRouteDistanceKm: 400,
    maxRouteDistanceKm: 3_200,
    weeklyFrequency: 7,
    targetFleetSize: 8,
    hubFocus: 0.7,
    networkAmbition: 1.1,
    rotationBufferMinutes: 12,
  },

  // Tarifa alta, cabina cómoda, servicio completo: vive de la reputación y del
  // pasajero que paga por horario y producto.
  premium: {
    strategy: 'premium',
    businessModel: 'fullservice',
    priceFactor: 1.22,
    serviceLevel: 3,
    businessSeatShare: 0.1,
    densityFactor: 0.82,
    preferredCategories: ['narrowbody', 'widebody'],
    minRouteDistanceKm: 600,
    maxRouteDistanceKm: 6_500,
    weeklyFrequency: 7,
    targetFleetSize: 7,
    hubFocus: 0.85,
    networkAmbition: 0.9,
    rotationBufferMinutes: 30,
  },

  // Aviones pequeños en mercados finos que a un narrowbody no le salen.
  regional: {
    strategy: 'regional',
    businessModel: 'regional',
    // Tarifa alta: un avión de 70 plazas cuesta bastante más por asiento que
    // uno de 180, y su mercado —fino y sin alternativa— la acepta.
    priceFactor: 1.65,
    serviceLevel: 1,
    businessSeatShare: 0,
    densityFactor: 0.95,
    preferredCategories: ['regional'],
    minRouteDistanceKm: 250,
    maxRouteDistanceKm: 1_800,
    weeklyFrequency: 5,
    targetFleetSize: 6,
    hubFocus: 0.9,
    networkAmbition: 1,
    maxDailyDemand: 140,
    minDailyDemand: 18,
    rotationBufferMinutes: 25,
  },

  // Todo pasa por el hub: la red vale más que la suma de sus rutas.
  hub_and_spoke: {
    strategy: 'hub_and_spoke',
    businessModel: 'fullservice',
    priceFactor: 1.05,
    serviceLevel: 2,
    businessSeatShare: 0.06,
    densityFactor: 0.88,
    preferredCategories: ['narrowbody', 'regional'],
    minRouteDistanceKm: 300,
    maxRouteDistanceKm: 4_000,
    weeklyFrequency: 7,
    targetFleetSize: 9,
    hubFocus: 1,
    networkAmbition: 1.2,
    rotationBufferMinutes: 20,
  },

  // Sin hub: busca pares rentables donde estén, aunque no conecten entre sí.
  point_to_point: {
    strategy: 'point_to_point',
    businessModel: 'lowcost',
    priceFactor: 0.9,
    serviceLevel: 1,
    businessSeatShare: 0,
    densityFactor: 0.96,
    preferredCategories: ['narrowbody'],
    minRouteDistanceKm: 500,
    maxRouteDistanceKm: 3_500,
    weeklyFrequency: 6,
    targetFleetSize: 7,
    hubFocus: 0.35,
    networkAmbition: 1,
    rotationBufferMinutes: 15,
  },

  // Flota pequeña, pocas rutas, precios cómodos: difícil de arruinar y difícil
  // de que crezca. Es la referencia contra la que se mide el riesgo.
  conservative: {
    strategy: 'conservative',
    businessModel: 'regional',
    priceFactor: 1.5,
    serviceLevel: 2,
    businessSeatShare: 0.04,
    densityFactor: 0.85,
    preferredCategories: ['regional', 'narrowbody'],
    minRouteDistanceKm: 350,
    maxRouteDistanceKm: 2_500,
    weeklyFrequency: 4,
    targetFleetSize: 4,
    hubFocus: 0.95,
    networkAmbition: 0.65,
    maxDailyDemand: 190,
    minDailyDemand: 25,
    rotationBufferMinutes: 40,
  },

  // Mucha flota, mucha ruta, precio bajo. Crece rápido y es la que puede
  // quebrar: exactamente el comportamiento que el modelo debe castigar.
  aggressive: {
    strategy: 'aggressive',
    businessModel: 'lowcost',
    priceFactor: 0.72,
    serviceLevel: 0,
    businessSeatShare: 0,
    densityFactor: 1,
    preferredCategories: ['narrowbody'],
    minRouteDistanceKm: 300,
    maxRouteDistanceKm: 4_500,
    weeklyFrequency: 7,
    targetFleetSize: 12,
    hubFocus: 0.55,
    networkAmbition: 1.5,
    rotationBufferMinutes: 0,
  },
};

export const NPC_STRATEGY_ORDER: readonly NpcStrategy[] = [
  'lowcost',
  'premium',
  'regional',
  'hub_and_spoke',
  'point_to_point',
  'conservative',
  'aggressive',
];
