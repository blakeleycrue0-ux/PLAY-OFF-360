/**
 * Reglas de normalización del conjunto de aeropuertos (etapa 2 de ADR-011).
 *
 * Aquí viven todas las derivaciones que convierten hechos de OurAirports en
 * parámetros de juego. Está separado del script para poder testearlo.
 *
 * AVISO IMPORTANTE. OurAirports no publica tráfico de pasajeros, y el modelo de
 * gravedad necesita un tamaño de mercado por aeropuerto. Todo lo que hay debajo
 * de `marketWeight`, `businessIndex` y `leisureIndex` es **provisional** y está
 * registrado como pendientes C-1 y C-6 en docs/decisions.md. Son derivaciones
 * transparentes de hechos observables, no estimaciones de tráfico real: ordenan
 * bien los aeropuertos pero comprimen las distancias (un gran hub europeo
 * mueve dos órdenes de magnitud más pasajeros que un regional, y aquí la
 * diferencia sale de una decena). Sustituir esto por tráfico real (Eurostat
 * avia_paoa, abierto) es la primera tarea de calibración del proyecto.
 */

export const NORMALISER_VERSION = '1.1.0';

/** Países del espacio Schengen a fecha del conjunto de datos. Hecho, no estimación. */
export const SCHENGEN_COUNTRIES: ReadonlySet<string> = new Set([
  'AT',
  'BE',
  'BG',
  'CH',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'HU',
  'IS',
  'IT',
  'LI',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
]);

/**
 * Regiones ISO 3166-2 de vocación marcadamente turística. Se usan para separar
 * mercado de ocio de mercado de negocios (pendiente C-6).
 */
const LEISURE_REGIONS: ReadonlySet<string> = new Set([
  'ES-IB', // Baleares
  'ES-CN', // Canarias
  'ES-AN', // Andalucía
  'ES-VC', // Comunidad Valenciana
  'ES-MC', // Murcia
  'PT-30', // Madeira
  'PT-20', // Azores
  'PT-08', // Algarve
  'GR-M', // Creta
  'GR-L', // Egeo meridional
  'GR-F', // Islas Jónicas
  'HR-17',
  'HR-19', // Split-Dalmacia y Dubrovnik-Neretva
  'IT-75',
  'IT-88',
  'IT-82',
  'IT-72', // Apulia, Cerdeña, Sicilia, Campania
  'FR-PAC',
  'FR-COR', // Costa Azul y Córcega
  'CY-04',
  'CY-06', // Lárnaca y Pafos
  'MT-25',
  'TR-07',
  'TR-48', // Antalya y Muğla
]);

/** Regiones insulares: su estacionalidad es aún más acusada. */
const ISLAND_REGIONS: ReadonlySet<string> = new Set([
  'ES-IB',
  'ES-CN',
  'PT-20',
  'PT-30',
  'GR-M',
  'GR-L',
  'GR-F',
  'IT-88',
  'IT-82',
  'MT-25',
  'CY-04',
  'CY-06',
  'FR-COR',
]);

/** Capitales y grandes centros financieros: mercado de negocios alto. */
const BUSINESS_HUB_CITIES: ReadonlySet<string> = new Set([
  'London',
  'Paris',
  'Frankfurt',
  'Munich',
  'Zurich',
  'Geneva',
  'Amsterdam',
  'Brussels',
  'Milan',
  'Rome',
  'Madrid',
  'Barcelona',
  'Dublin',
  'Luxembourg',
  'Copenhagen',
  'Stockholm',
  'Oslo',
  'Helsinki',
  'Vienna',
  'Warsaw',
  'Prague',
  'Lisbon',
  'Hamburg',
  'Dusseldorf',
  'Düsseldorf',
  'Berlin',
  'Athens',
  'Spata-Artemida', // el municipio de Atenas en la fuente
  'Roissy-en-France', // el municipio de París-Charles de Gaulle en la fuente
  'Schwechat', // el municipio de Viena
  'Kloten', // el municipio de Zúrich
]);

/** Quita acentos y normaliza para comparar nombres de ciudad de forma estable. */
function normaliseCityName(city: string): string {
  return city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * El municipio de la fuente no siempre es el nombre corto de la ciudad
 * ("Frankfurt am Main", "Spata-Artemida"), así que se compara por prefijo
 * normalizado en vez de por igualdad exacta.
 */
function isBusinessHubCity(city: string): boolean {
  const normalised = normaliseCityName(city);
  for (const hub of BUSINESS_HUB_CITIES) {
    if (normalised.startsWith(normaliseCityName(hub))) return true;
  }
  return false;
}

/**
 * A qué ciudad sirve cada aeropuerto, cuando no es la del municipio.
 *
 * Muchos aeropuertos grandes están en un pueblo de las afueras: Atenas está en
 * Spata-Artemida, Bruselas en Zaventem, Lyon en Colombier-Saugnieu. El municipio
 * es correcto y es lo que publica la fuente, pero nadie dice que vuela a
 * Rheinmünster: dice que vuela a Karlsruhe.
 *
 * Es una lista escrita a mano, y por eso está incompleta a propósito: sólo
 * entran los casos en los que el municipio es una pedanía y la ciudad servida
 * no admite discusión. Lo que no esté aquí se queda con su municipio, que es
 * preferible a inventar. Añadir una entrada es un dato comprobable, no una
 * opinión.
 */
const CITY_SERVED: ReadonlyMap<string, string> = new Map([
  ['ACE', 'Lanzarote'],
  ['ADB', 'İzmir'],
  ['ATH', 'Athens'],
  ['BGY', 'Bergamo'],
  ['BNX', 'Banja Luka'],
  ['BRU', 'Brussels'],
  ['BSL', 'Basel'],
  ['CHQ', 'Chania'],
  ['COV', 'Adana'],
  ['EDI', 'Edinburgh'],
  ['FKB', 'Karlsruhe'],
  ['FMO', 'Münster'],
  ['FUE', 'Fuerteventura'],
  ['GRZ', 'Graz'],
  ['HDF', 'Heringsdorf'],
  ['IOM', 'Isle of Man'],
  ['KRK', 'Kraków'],
  ['KSF', 'Kassel'],
  ['KZR', 'Kütahya'],
  ['LEJ', 'Leipzig'],
  ['LEN', 'León'],
  ['LGG', 'Liège'],
  ['LIL', 'Lille'],
  ['LIN', 'Milan'],
  ['LJU', 'Ljubljana'],
  ['LYS', 'Lyon'],
  ['MRS', 'Marseille'],
  ['MXP', 'Milan'],
  ['NOC', 'Knock'],
  ['OSR', 'Ostrava'],
  ['OST', 'Ostend'],
  ['OTP', 'Bucharest'],
  ['OVD', 'Asturias'],
  ['PAD', 'Paderborn'],
  ['PRN', 'Pristina'],
  ['PXO', 'Porto Santo'],
  ['RMU', 'Murcia'],
  ['SAW', 'Istanbul'],
  ['SCR', 'Sälen'],
  ['SKP', 'Skopje'],
  ['TER', 'Terceira'],
  ['TIA', 'Tirana'],
  ['TRN', 'Turin'],
  ['TRS', 'Trieste'],
  ['TZL', 'Tuzla'],
  ['VIT', 'Vitoria-Gasteiz'],
  ['VRN', 'Verona'],
  ['WMI', 'Warsaw'],
  ['ZAG', 'Zagreb'],
]);

/**
 * Nombre corto de la ciudad, para enseñar.
 *
 * La fuente publica el municipio administrativo, que a veces no es un nombre de
 * ciudad sino una dirección: «Paris (Roissy-en-France, Val-d'Oise)»,
 * «Newcastle upon Tyne, Tyne and Wear», «Kristiansand(Kjevik)». Puesto en una
 * pantalla ocupa tres líneas y no dice nada más que la primera palabra.
 *
 * Se corta por el primer paréntesis, coma o barra: en este conjunto de datos la
 * parte que queda delante es siempre la ciudad reconocible. Si el corte dejara
 * la cadena vacía se devuelve el original, porque un nombre feo es mejor que
 * ninguno.
 *
 * Ojo: esto es **sólo** para enseñar. El índice de negocio sigue mirando el
 * municipio de la fuente, que es donde están los casos como «Spata-Artemida»
 * o «Kloten», y que no debe cambiar por un retoque de presentación.
 */
export function displayCity(municipality: string, iata?: string): string {
  const served = iata === undefined ? undefined : CITY_SERVED.get(iata);
  if (served !== undefined) return served;

  const cut = municipality.split(/[(,/]/)[0]?.trim() ?? '';
  return cut === '' ? municipality.trim() : cut;
}

export interface RawAirport {
  readonly iata: string;
  readonly icao: string;
  readonly name: string;
  readonly city: string;
  readonly country: string;
  readonly region: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly elevationFt: number;
  readonly type: 'large_airport' | 'medium_airport';
  readonly runwayCount: number;
  readonly longestRunwayFt: number;
}

/**
 * Tamaño de mercado a partir de hechos observables: categoría del aeropuerto,
 * longitud de la pista mayor y número de pistas.
 *
 * La longitud de pista entra con exponente porque un aeropuerto capaz de operar
 * largo radio mueve mucho más que uno limitado a regionales, y el número de
 * pistas porque sólo se construye la segunda cuando la primera se queda corta.
 * PROVISIONAL: pendiente C-1.
 */
export function provisionalMarketWeight(airport: RawAirport): number {
  const typeBase = airport.type === 'large_airport' ? 100 : 32;
  const runwayFactor = Math.min(2.2, Math.max(0.45, (airport.longestRunwayFt / 9_000) ** 1.6));
  const countFactor = 1 + 0.35 * Math.min(3, airport.runwayCount - 1);

  return Math.round(typeBase * runwayFactor * countFactor * 100) / 100;
}

/** PROVISIONAL: pendiente C-6. */
export function provisionalLeisureIndex(airport: RawAirport): number {
  const base = LEISURE_REGIONS.has(airport.region) ? 0.92 : 0.45;
  const island = ISLAND_REGIONS.has(airport.region) ? 0.05 : 0;
  return Math.min(0.98, Math.round((base + island) * 100) / 100);
}

/** PROVISIONAL: pendiente C-6. */
export function provisionalBusinessIndex(airport: RawAirport): number {
  const hub = isBusinessHubCity(airport.city) ? 0.75 : 0.35;
  const size = airport.type === 'large_airport' ? 0.1 : 0;
  const leisurePenalty = LEISURE_REGIONS.has(airport.region) ? -0.15 : 0;
  return Math.min(0.95, Math.max(0.1, Math.round((hub + size + leisurePenalty) * 100) / 100));
}

/**
 * Curva estacional de referencia de un destino de ocio mediterráneo. La curva
 * de cada aeropuerto interpola entre ésta y una curva plana según su índice de
 * ocio, de modo que Mallorca en julio es otro mercado que Mallorca en febrero
 * y Fráncfort es casi igual todo el año (docs/04 §4.1).
 * PROVISIONAL: pendiente C-5.
 */
const LEISURE_SEASON: readonly number[] = [
  0.55, 0.55, 0.7, 0.95, 1.3, 1.9, 2.6, 2.55, 1.7, 1.05, 0.6, 0.6,
];

/** Índice de ocio a partir del cual la estacionalidad empieza a notarse. */
const SEASONALITY_FLOOR = 0.35;

export function provisionalSeasonality(leisureIndex: number): readonly number[] {
  // Un aeropuerto de negocios no es "algo estacional": es casi plano. Por eso
  // la fuerza estacional no es el índice de ocio directamente, sino cuánto
  // supera el suelo por debajo del cual no hay temporada que valga.
  const strength = Math.min(
    1,
    Math.max(0, (leisureIndex - SEASONALITY_FLOOR) / (0.98 - SEASONALITY_FLOOR)),
  );
  return LEISURE_SEASON.map((value) => Math.round((1 + strength * (value - 1)) * 100) / 100);
}

/** Clase de tamaño a partir del peso de mercado. Gobierna las tasas. */
export function sizeClassFor(marketWeight: number): 1 | 2 | 3 | 4 | 5 {
  if (marketWeight >= 210) return 5;
  if (marketWeight >= 150) return 4;
  if (marketWeight >= 90) return 3;
  if (marketWeight >= 45) return 2;
  return 1;
}

/**
 * Tasas aeroportuarias por clase de tamaño. Calibradas para reproducir el
 * desglose del P&L de ejemplo de docs/04 §4.9 en PMI-LGW.
 * PROVISIONAL: pendiente C-7.
 */
const FEES: Readonly<Record<number, { landing: number; pax: number; handling: number }>> = {
  1: { landing: 350, pax: 150, handling: 8_000 },
  2: { landing: 500, pax: 220, handling: 12_000 },
  3: { landing: 700, pax: 280, handling: 16_000 },
  4: { landing: 900, pax: 350, handling: 19_000 },
  5: { landing: 1_100, pax: 600, handling: 30_000 },
};

const DEFAULT_FEES = { landing: 700, pax: 280, handling: 16_000 } as const;

export function feesFor(sizeClass: number): { landing: number; pax: number; handling: number } {
  return FEES[sizeClass] ?? DEFAULT_FEES;
}

/**
 * Desfase horario estándar respecto a UTC, en minutos.
 *
 * Se calcula una sola vez al construir el conjunto de datos, con una fecha de
 * invierno, para que el dominio no dependa de `Intl` en tiempo de ejecución
 * (importa en React Native). Se ignora el horario de verano: la curva de
 * preferencia horaria tiene varias horas de anchura y ±60 min no la altera.
 */
export function utcOffsetMinutes(
  timezone: string,
  reference = new Date('2026-01-15T12:00:00Z'),
): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    });
    const part =
      formatter.formatToParts(reference).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
    const match = /GMT([+-])(\d{2}):(\d{2})/.exec(part);
    if (match === null) return 0;
    const [, sign, hours, minutes] = match;
    const total = Number(hours) * 60 + Number(minutes);
    return sign === '-' ? -total : total;
  } catch {
    return 0;
  }
}

/**
 * Zona horaria por país.
 *
 * OurAirports no publica zona horaria. En Europa la correspondencia país→huso
 * es prácticamente uno a uno, con las excepciones insulares que se listan
 * aparte. Son hechos, no estimaciones.
 */
const COUNTRY_TIMEZONE: Readonly<Record<string, string>> = {
  AL: 'Europe/Tirane',
  AD: 'Europe/Andorra',
  AT: 'Europe/Vienna',
  BY: 'Europe/Minsk',
  BE: 'Europe/Brussels',
  BA: 'Europe/Sarajevo',
  BG: 'Europe/Sofia',
  HR: 'Europe/Zagreb',
  CY: 'Asia/Nicosia',
  CZ: 'Europe/Prague',
  DK: 'Europe/Copenhagen',
  EE: 'Europe/Tallinn',
  FO: 'Atlantic/Faroe',
  FI: 'Europe/Helsinki',
  FR: 'Europe/Paris',
  DE: 'Europe/Berlin',
  GI: 'Europe/Gibraltar',
  GR: 'Europe/Athens',
  GG: 'Europe/Guernsey',
  HU: 'Europe/Budapest',
  IS: 'Atlantic/Reykjavik',
  IE: 'Europe/Dublin',
  IM: 'Europe/Isle_of_Man',
  IT: 'Europe/Rome',
  JE: 'Europe/Jersey',
  XK: 'Europe/Belgrade',
  LV: 'Europe/Riga',
  LI: 'Europe/Vaduz',
  LT: 'Europe/Vilnius',
  LU: 'Europe/Luxembourg',
  MT: 'Europe/Malta',
  MD: 'Europe/Chisinau',
  MC: 'Europe/Monaco',
  ME: 'Europe/Podgorica',
  NL: 'Europe/Amsterdam',
  MK: 'Europe/Skopje',
  NO: 'Europe/Oslo',
  PL: 'Europe/Warsaw',
  PT: 'Europe/Lisbon',
  RO: 'Europe/Bucharest',
  RS: 'Europe/Belgrade',
  SK: 'Europe/Bratislava',
  SI: 'Europe/Ljubljana',
  ES: 'Europe/Madrid',
  SE: 'Europe/Stockholm',
  CH: 'Europe/Zurich',
  TR: 'Europe/Istanbul',
  UA: 'Europe/Kyiv',
  GB: 'Europe/London',
  SJ: 'Arctic/Longyearbyen',
};

/** Excepciones insulares, por región ISO 3166-2. */
const REGION_TIMEZONE: Readonly<Record<string, string>> = {
  'ES-CN': 'Atlantic/Canary',
  'PT-20': 'Atlantic/Azores',
  'PT-30': 'Atlantic/Madeira',
};

export function timezoneFor(country: string, region: string): string | null {
  return REGION_TIMEZONE[region] ?? COUNTRY_TIMEZONE[country] ?? null;
}
