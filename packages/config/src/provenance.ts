/**
 * Procedencia de cada parámetro de balance.
 *
 * El encargo prohíbe inventar fórmulas económicas en silencio. Este registro
 * lo hace verificable: cada hoja de `DEFAULT_BALANCE` declara de dónde sale su
 * valor, y un test falla si se añade un parámetro sin declararlo.
 *
 * - `docs`        el valor aparece literalmente en los documentos de diseño.
 * - `derived`     se obtiene de un valor documentado mediante una regla que se
 *                 indica en la nota (por ejemplo, repartir un coste de flota
 *                 entre asientos, o reproducir el ejemplo de P&L de docs/04).
 * - `provisional` no tiene fuente todavía. Está pendiente de calibrar y
 *                 aparece en el registro de pendientes de `docs/decisions.md`.
 */
export type ProvenanceStatus = 'docs' | 'derived' | 'provisional';

export interface ParameterProvenance {
  readonly status: ProvenanceStatus;
  /** Referencia al documento de diseño, cuando la hay. */
  readonly ref?: string;
  /** Regla de derivación o qué falta para dejar de ser provisional. */
  readonly note: string;
  /** Identificador del pendiente en docs/decisions.md, si aplica. */
  readonly pending?: string;
}

const d = (ref: string, note: string): ParameterProvenance => ({ status: 'docs', ref, note });
const derived = (ref: string, note: string): ParameterProvenance => ({
  status: 'derived',
  ref,
  note,
});
const prov = (note: string, pending?: string): ParameterProvenance =>
  pending === undefined
    ? { status: 'provisional', note }
    : { status: 'provisional', note, pending };

export const PARAMETER_PROVENANCE: Readonly<Record<string, ParameterProvenance>> = {
  version: d('docs/01 §1.7', 'Etiqueta de versión del conjunto de parámetros.'),

  'time.defaultTimeScale': d('docs/03 §3.1', 'Mundo en tiempo real 1:1 (ADR-001).'),

  'flight.taxiOutMinutes': d('docs/03 §3.6', 'blockTime: taxiOut = 12.'),
  'flight.taxiInMinutes': d('docs/03 §3.6', 'blockTime: taxiIn = 7.'),
  'flight.climbDescentPenaltyMinutes': d(
    'docs/03 §3.6',
    'blockTime: penalización de subida y descenso = 14.',
  ),
  'flight.routeDistanceFactor': d('docs/03 §3.6', 'blockTime y fuelBurn usan distancia × 1,06.'),
  'flight.minimumBlockMinutes': prov(
    'Suelo de tiempo de bloque para rutas muy cortas; evita duraciones absurdas.',
  ),

  'fuel.taxiFuelHoursEquivalent': d('docs/03 §3.6', 'fuelBurn: taxiFuel = consumo horario × 0,2.'),
  'fuel.loadWeightFactorBase': d('docs/03 §3.6', 'fuelBurn: weightFactor = 0,82 + 0,18 × carga.'),
  'fuel.loadWeightFactorSpan': d('docs/03 §3.6', 'fuelBurn: weightFactor = 0,82 + 0,18 × carga.'),
  'fuel.defaultPriceCentsPerKg': derived(
    'docs/04 §4.9',
    'Ajustado para reproducir el gasto de combustible del P&L de ejemplo PMI-LGW (218.400 € en 42 vuelos con un Narrowbody 160).',
  ),
  'fuel.priceMeanReversion': d('docs/04 §4.5', 'Coeficiente de reversión a la media = 0,94.'),
  'fuel.priceSigma': prov(
    'Volatilidad del proceso del precio del combustible; docs/04 §4.5 da la forma pero no la sigma.',
  ),

  'demand.scale': prov(
    'Constante de escala del modelo de gravedad. Depende por completo de C-1.',
    'C-4',
  ),
  'demand.sizeExponent': d('docs/04 §4.1', 'baseDemand: pesos de mercado elevados a 0,68.'),
  'demand.shortHaulThresholdKm': d('docs/04 §4.1', 'baseDemand: umbral de 350 km.'),
  'demand.shortHaulFloor': d('docs/04 §4.1', 'baseDemand: suelo 0,25 por debajo del umbral.'),
  'demand.distanceDecayExponent': d('docs/04 §4.1', 'baseDemand: (dist/1000)^−0,42.'),
  'demand.domesticMultiplier': d('docs/04 §4.1', 'Mercado doméstico × 1,35.'),
  'demand.sameBlocMultiplier': d('docs/04 §4.1', 'Mismo bloque de libre circulación × 1,18.'),
  'demand.differentBlocMultiplier': d('docs/04 §4.1', 'Bloques distintos × 0,88.'),
  'demand.segmentShare.business': prov(
    'docs/04 §4.1 describe los tres segmentos pero no su proporción.',
    'C-8',
  ),
  'demand.segmentShare.leisure': prov(
    'docs/04 §4.1 describe los tres segmentos pero no su proporción.',
    'C-8',
  ),
  'demand.segmentShare.vfr': prov(
    'docs/04 §4.1 describe los tres segmentos pero no su proporción.',
    'C-8',
  ),
  'demand.noFlyUtility': prov(
    'docs/04 §4.2 exige la opción "no volar" en el denominador pero no le da valor.',
    'C-3',
  ),
  'demand.dayOfWeekProfile.business': prov(
    'docs/04 §4.1 dice que el segmento business hace pico en lunes y jueves, pero no da la curva semanal.',
    'C-5',
  ),
  'demand.dayOfWeekProfile.leisure': prov(
    'Perfil semanal de ocio sin fuente; pendiente de calibrar.',
    'C-5',
  ),
  'demand.dayOfWeekProfile.vfr': prov(
    'Perfil semanal de VFR sin fuente; pendiente de calibrar.',
    'C-5',
  ),
  'demand.peakDepartureHours.business': prov(
    'docs/04 §4.1 marca la conveniencia de horario como muy importante para business sin decir qué horas lo son.',
    'C-2',
  ),
  'demand.peakDepartureHours.leisure': prov(
    'Horas preferidas por el segmento de ocio, sin fuente.',
    'C-2',
  ),
  'demand.peakDepartureHours.vfr': prov('Horas preferidas por el segmento VFR, sin fuente.', 'C-2'),
  'demand.peakWidthHours': prov(
    'Anchura del pico horario; gobierna cuánto penaliza salir a mala hora.',
    'C-2',
  ),
  'demand.maxRangeKm': prov(
    'Corte por encima del cual no se modela demanda en la Fase 1 (alcance europeo).',
  ),

  'logit.business.price': d('docs/04 §4.1', 'Elasticidad de precio del segmento business: −0,8.'),
  'logit.leisure.price': d('docs/04 §4.1', 'Elasticidad de precio del segmento ocio: −1,9.'),
  'logit.vfr.price': d('docs/04 §4.1', 'Elasticidad de precio del segmento VFR: −1,5.'),

  'logit.business.timeOfDay': prov(
    'docs/04 §4.1 lo ordena como "muy alta" pero no lo cuantifica.',
    'C-2',
  ),
  'logit.business.frequency': prov(
    'docs/04 §4.1 lo ordena como "muy alta" pero no lo cuantifica.',
    'C-2',
  ),
  'logit.business.reputation': prov('Orden cualitativo conocido, magnitud por calibrar.', 'C-2'),
  'logit.business.punctuality': prov('Orden cualitativo conocido, magnitud por calibrar.', 'C-2'),
  'logit.business.product': prov('Orden cualitativo conocido, magnitud por calibrar.', 'C-2'),
  'logit.business.loyalty': prov(
    'docs/04 §4.2 menciona la ventaja del incumbente sin cuantificarla.',
    'C-2',
  ),
  'logit.business.stops': prov('docs/04 §4.2 penaliza la escala sin cuantificarla.', 'C-2'),
  'logit.leisure.timeOfDay': prov('Orden cualitativo conocido, magnitud por calibrar.', 'C-2'),
  'logit.leisure.frequency': prov(
    'docs/04 §4.1 lo ordena como "baja" pero no lo cuantifica.',
    'C-2',
  ),
  'logit.leisure.reputation': prov('Orden cualitativo conocido, magnitud por calibrar.', 'C-2'),
  'logit.leisure.punctuality': prov('Orden cualitativo conocido, magnitud por calibrar.', 'C-2'),
  'logit.leisure.product': prov('Orden cualitativo conocido, magnitud por calibrar.', 'C-2'),
  'logit.leisure.loyalty': prov('Orden cualitativo conocido, magnitud por calibrar.', 'C-2'),
  'logit.leisure.stops': prov('Orden cualitativo conocido, magnitud por calibrar.', 'C-2'),
  'logit.vfr.timeOfDay': prov('docs/04 §4.1 lo ordena como "baja" pero no lo cuantifica.', 'C-2'),
  'logit.vfr.frequency': prov('docs/04 §4.1 lo ordena como "baja" pero no lo cuantifica.', 'C-2'),
  'logit.vfr.reputation': prov('Orden cualitativo conocido, magnitud por calibrar.', 'C-2'),
  'logit.vfr.punctuality': prov('Orden cualitativo conocido, magnitud por calibrar.', 'C-2'),
  'logit.vfr.product': prov('Orden cualitativo conocido, magnitud por calibrar.', 'C-2'),
  'logit.vfr.loyalty': prov('Orden cualitativo conocido, magnitud por calibrar.', 'C-2'),
  'logit.vfr.stops': prov('Orden cualitativo conocido, magnitud por calibrar.', 'C-2'),

  'fares.baseCents.economy': derived(
    'docs/02 §2.5, docs/04 §4.9',
    'Ajustado para que el precio de referencia de PMI-LGW (1.317 km) caiga en ~92 €, el precio medio del ejemplo.',
  ),
  'fares.baseCents.business': derived(
    'docs/02 §2.5',
    'Ajustado para reproducir la tarifa business de ejemplo (249 €) en PMI-LGW.',
  ),
  'fares.perKmCents.economy': derived('docs/04 §4.9', 'Mismo ajuste que fares.baseCents.economy.'),
  'fares.perKmCents.business': derived(
    'docs/02 §2.5',
    'Mismo ajuste que fares.baseCents.business.',
  ),
  'fares.distanceExponent': d('docs/04 §4.3', 'referencePrice: distancia^0,87.'),
  'fares.minPriceFactor': prov(
    'Barrera de seguridad frente a precios absurdos; no es una regla de diseño documentada.',
  ),
  'fares.maxPriceFactor': prov(
    'Barrera de seguridad frente a precios absurdos; no es una regla de diseño documentada.',
  ),

  'costs.pilotHourlyCents': derived(
    'docs/04 §4.9',
    'Coste de tripulación del P&L de ejemplo (96.180 € en 42 vuelos) repartido entre 2 pilotos y 4 tripulantes por hora de bloque.',
  ),
  'costs.cabinCrewHourlyCents': derived(
    'docs/04 §4.9',
    'Mismo reparto que costs.pilotHourlyCents.',
  ),
  'costs.navFeeCentsPerKm': derived(
    'docs/04 §4.4',
    'docs/04 da la forma (distancia × tarifa × √(MTOW/referencia)); la tarifa unitaria toma la magnitud de las tasas de ruta europeas.',
  ),
  'costs.navMtowReferenceKg': d('docs/04 §4.4', 'navigation: √(MTOW / 50.000).'),
  'costs.cateringCentsPerPaxByServiceLevel': prov(
    'docs/04 §4.4 usa cateringCost(serviceLevel) sin dar la escala.',
  ),
  'costs.overheadCentsPerAircraftPerDay': prov(
    'docs/04 §4.4 lista el overhead corporativo como coste fijo sin cuantificarlo.',
  ),
  'costs.maintenanceConditionPenaltyMax': prov(
    'docs/04 §4.4 aplica conditionPenalty() sin definir su rango.',
  ),

  'ancillary.centsPerPaxByServiceLevel': derived(
    'docs/04 §4.3, §4.9',
    'La banda de 18-30 €/pax para bajo coste y los 5,42 €/pax del P&L de ejemplo fijan los extremos de la escala.',
  ),

  'fleet.cabinSpaceFactor.economy': d(
    'docs/02 §2.4',
    'La plaza de turista es la unidad de referencia de la cabina.',
  ),
  'fleet.cabinSpaceFactor.business': prov(
    'Espacio de una plaza business en unidades de turista. docs/02 §2.4 limita la cabina por capacidad del tipo pero no dice cuánto ocupa cada clase. 1,5 refleja la business europea de corto radio (misma butaca con la central bloqueada); una cabina de largo radio con butaca-cama pediría un factor mayor y probablemente un valor por categoría de avión.',
  ),
  'fleet.wearPerFlightHour': d('docs/03 §3.7', 'wear = horas × 0,010 + ciclos × 0,020.'),
  'fleet.wearPerCycle': d('docs/03 §3.7', 'wear = horas × 0,010 + ciclos × 0,020.'),
  'fleet.ageReliabilityOnsetYears': d(
    'docs/03 §3.7',
    'La fiabilidad decae "lentamente tras 15 años".',
  ),
  'fleet.ageReliabilityPerYear': prov(
    'docs/03 §3.7 describe la caída por edad sin dar la pendiente.',
  ),
  'fleet.conditionReliabilityFloor': d(
    'docs/03 §3.7',
    'reliability × (0,72 + 0,28 × condición/100).',
  ),
  'fleet.conditionReliabilitySpan': d(
    'docs/03 §3.7',
    'reliability × (0,72 + 0,28 × condición/100).',
  ),
  'fleet.deferredCheckPenalty': prov(
    'docs/03 §3.7 dice que diferir "penaliza fuerte" sin dar el coeficiente.',
  ),
  'fleet.deferGraceFactor': prov(
    'Cuánto margen gana un check al aplazarlo; docs/03 §3.7 permite diferir sin fijar la ventana.',
  ),
  'fleet.checks.A.intervalHours': d('docs/03 §3.7', 'Tabla de checks: A cada 600 h.'),
  'fleet.checks.A.durationDays': d('docs/03 §3.7', 'Tabla de checks: A dura 1 día.'),
  'fleet.checks.A.costPerSeatCents': derived(
    'docs/03 §3.7',
    'A = 12.000 € para un narrowbody de 180 plazas, expresado por asiento para escalar entre tipos.',
  ),
  'fleet.checks.A.conditionRestored': d('docs/03 §3.7', 'Tabla de checks: A recupera +8.'),
  'fleet.checks.B.intervalHours': d('docs/03 §3.7', 'Tabla de checks: B cada 3.000 h.'),
  'fleet.checks.B.durationDays': d('docs/03 §3.7', 'Tabla de checks: B dura 3 días.'),
  'fleet.checks.B.costPerSeatCents': derived(
    'docs/03 §3.7',
    'B = 45.000 € para 180 plazas, expresado por asiento.',
  ),
  'fleet.checks.B.conditionRestored': d('docs/03 §3.7', 'Tabla de checks: B recupera +20.'),
  'fleet.checks.C.intervalHours': d('docs/03 §3.7', 'Tabla de checks: C cada 12.000 h.'),
  'fleet.checks.C.durationDays': d('docs/03 §3.7', 'Tabla de checks: C dura 14 días.'),
  'fleet.checks.C.costPerSeatCents': derived(
    'docs/03 §3.7',
    'C = 380.000 € para 180 plazas, expresado por asiento.',
  ),
  'fleet.checks.C.conditionRestored': d('docs/03 §3.7', 'Tabla de checks: C recupera +45.'),
  'fleet.checks.D.intervalHours': d('docs/03 §3.7', 'Tabla de checks: D cada 24.000 h.'),
  'fleet.checks.D.durationDays': d('docs/03 §3.7', 'Tabla de checks: D dura 45 días.'),
  'fleet.checks.D.costPerSeatCents': derived(
    'docs/03 §3.7',
    'D = 2.100.000 € para 180 plazas, expresado por asiento.',
  ),
  'fleet.checks.D.conditionRestored': d(
    'docs/03 §3.7',
    'Tabla de checks: D restaura la condición a ~95.',
  ),

  'delays.technicalMaxMinutes': prov(
    'docs/03 §3.6 lista el retraso técnico como sumando sin dar su magnitud.',
  ),
  'delays.onTimeThresholdMinutes': d(
    'docs/03 §3.3',
    'Un vuelo se considera retrasado por encima de 15 minutos.',
  ),

  'reputation.initial': d('docs/02 §2.3', 'airlines.reputation por defecto 50.'),
  'reputation.onTimeSmoothing': prov(
    'Peso del último vuelo en la media móvil de puntualidad. docs/04 §4.8 pide que la reputación se mueva despacio, sin dar constantes.',
  ),
  'reputation.smoothing': prov(
    'Velocidad a la que la reputación persigue a la puntualidad. La Fase 1 sólo implementa el término de puntualidad de docs/04 §4.8; faltan ocupación, servicio, cancelaciones, incidentes y edad de flota.',
  ),
  'reputation.min': d('docs/02 §2.3', 'Rango 0..100.'),
  'reputation.max': d('docs/02 §2.3', 'Rango 0..100.'),
};

export interface ProvenanceSummary {
  readonly total: number;
  readonly byStatus: Readonly<Record<ProvenanceStatus, number>>;
  readonly provisional: readonly {
    readonly path: string;
    readonly note: string;
    readonly pending?: string;
  }[];
}

export function summarizeProvenance(): ProvenanceSummary {
  const byStatus: Record<ProvenanceStatus, number> = { docs: 0, derived: 0, provisional: 0 };
  const provisional: { path: string; note: string; pending?: string }[] = [];

  for (const [path, entry] of Object.entries(PARAMETER_PROVENANCE)) {
    byStatus[entry.status] += 1;
    if (entry.status === 'provisional') {
      provisional.push(
        entry.pending === undefined
          ? { path, note: entry.note }
          : { path, note: entry.note, pending: entry.pending },
      );
    }
  }

  return { total: Object.keys(PARAMETER_PROVENANCE).length, byStatus, provisional };
}
