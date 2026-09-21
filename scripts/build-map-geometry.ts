import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import land110m from 'world-atlas/land-110m.json' with { type: 'json' };
import countries110m from 'world-atlas/countries-110m.json' with { type: 'json' };

/**
 * Genera la geometría del mundo en coordenadas geográficas: la masa de tierra y
 * las fronteras interiores, en grados, sin proyectar.
 *
 * Antes esto salía ya proyectado a rutas SVG de una Mercator europea. Eso servía
 * para un mapa plano y fijo, y sólo para ése: un globo que se gira no puede usar
 * puntos proyectados, porque la proyección cambia en cada fotograma. Las
 * coordenadas viajan en crudo y quien proyecta es el cliente.
 *
 * El mapa no usa teselas de un servidor externo. Se dibuja como vector por tres
 * razones, y ninguna es estética: no depende de que un proveedor esté
 * disponible ni de una clave de API, pesa una fracción de lo que pesan las
 * teselas —lo que importa en móvil—, y permite el aspecto que queremos sin
 * pelearse con el estilo de nadie.
 *
 * Tierra y fronteras van por separado a propósito: la tierra se rellena y las
 * fronteras sólo se trazan, así que un país no puede pintarse encima del mar de
 * su vecino.
 */

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_FILE = path.join(ROOT, 'data', 'world-map.json');

/**
 * Decimales que se conservan de cada coordenada.
 *
 * Dos décimas de grado son unos 2 km, por debajo del detalle real que trae la
 * fuente a escala 1:110M, y bastante más fino que un píxel con el globo al
 * máximo de acercamiento. Redondear aquí recorta el fichero a la mitad sin que
 * se note en pantalla.
 */
const DECIMALS = 2;
const FACTOR = 10 ** DECIMALS;

/**
 * Un punto tal y como lo entrega GeoJSON: una lista de números, no una tupla.
 * La fuente puede traer una tercera coordenada, y podría traer menos de dos, así
 * que se comprueba en vez de darlo por hecho con una aserción de tipo.
 */
type Point = readonly number[];

function roundPoint(point: Point): [number, number] {
  const longitude = point[0];
  const latitude = point[1];
  if (longitude === undefined || latitude === undefined) {
    throw new Error('La fuente trae un punto sin longitud o sin latitud.');
  }
  return [Math.round(longitude * FACTOR) / FACTOR, Math.round(latitude * FACTOR) / FACTOR];
}

/**
 * Redondea una secuencia de puntos y descarta los que el redondeo ha dejado
 * repetidos. Sin este segundo paso el ahorro sería sólo de dígitos, no de
 * puntos, que es donde está el peso.
 */
function roundRing(ring: readonly Point[], closed: boolean): [number, number][] {
  const out: [number, number][] = [];

  for (const point of ring) {
    const rounded = roundPoint(point);
    const previous = out[out.length - 1];
    if (previous?.[0] === rounded[0] && previous?.[1] === rounded[1]) continue;
    out.push(rounded);
  }

  // Un anillo tiene que cerrar: si el redondeo separó el último punto del
  // primero, se fuerza el cierre en vez de dejar un polígono abierto.
  const first = out[0];
  const last = out[out.length - 1];
  if (closed && first !== undefined && last?.[0] !== undefined) {
    if (first[0] !== last[0] || first[1] !== last[1]) out.push([first[0], first[1]]);
  }

  return out;
}

/** Un anillo con menos de cuatro puntos no encierra área: se descarta entero. */
function roundPolygon(polygon: readonly (readonly Point[])[]): [number, number][][] {
  return polygon.map((ring) => roundRing(ring, true)).filter((ring) => ring.length >= 4);
}

/**
 * Aplana la tierra a una lista de polígonos.
 *
 * topojson devuelve una colección de piezas que pueden ser Polygon o
 * MultiPolygon según cuántos anillos tenga cada una; al globo le da igual la
 * diferencia, así que se normalizan a una sola forma.
 */
function collectPolygons(collection: ReturnType<typeof feature>): (readonly Point[])[][] {
  const features = collection.type === 'FeatureCollection' ? collection.features : [collection];
  const polygons: (readonly Point[])[][] = [];

  for (const item of features) {
    const geometry = item.geometry;
    if (geometry.type === 'Polygon') {
      polygons.push(geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon') {
      for (const polygon of geometry.coordinates) polygons.push(polygon);
    }
  }

  return polygons;
}

function countPoints(geometry: readonly unknown[]): number {
  return JSON.stringify(geometry).split('],[').length;
}

async function main(): Promise<void> {
  const landTopology = land110m as unknown as Topology;
  const landObject = landTopology.objects['land'];
  if (landObject === undefined) throw new Error('El topology de tierra no trae el objeto "land".');
  const landPolygons = collectPolygons(feature(landTopology, landObject));

  const countryTopology = countries110m as unknown as Topology;
  const countryObject = countryTopology.objects['countries'];
  if (countryObject === undefined) {
    throw new Error('El topology de países no trae el objeto "countries".');
  }
  const borders = mesh(countryTopology, countryObject as GeometryCollection, (a, b) => a !== b);

  const land = landPolygons
    .map((polygon) => roundPolygon(polygon))
    .filter((polygon) => polygon.length > 0);

  const borderLines = borders.coordinates
    .map((line) => roundRing(line, false))
    .filter((line) => line.length >= 2);

  const dataset = {
    $schema: 'https://airline-sim.invalid/schemas/world-map-v2.json',
    provenance: {
      source: 'Natural Earth vía el paquete world-atlas (land-110m y countries-110m)',
      license: 'Dominio público',
      coordinates: 'WGS84 en grados decimales, sin proyectar',
      decimals: DECIMALS,
      builtAt: new Date().toISOString(),
    },
    // Geometrías GeoJSON listas para dibujar con cualquier proyección.
    land: { type: 'MultiPolygon' as const, coordinates: land },
    borders: { type: 'MultiLineString' as const, coordinates: borderLines },
  };

  const json = `${JSON.stringify(dataset)}\n`;
  await writeFile(OUT_FILE, json);

  console.log(
    `Tierra: ${land.length} polígonos, ${countPoints(land)} puntos · ` +
      `fronteras: ${borderLines.length} líneas, ${countPoints(borderLines)} puntos`,
  );
  console.log(
    `Escrito en ${path.relative(ROOT, OUT_FILE)} (${(json.length / 1024).toFixed(0)} KB)`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
