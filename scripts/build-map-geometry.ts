import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { geoMercator, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import land110m from 'world-atlas/land-110m.json' with { type: 'json' };
import countries110m from 'world-atlas/countries-110m.json' with { type: 'json' };
import { fitProjection, type MapBounds } from './lib/projection.js';

/**
 * Genera la geometría del mapa como dos rutas SVG ya proyectadas: la masa de
 * tierra y las fronteras interiores.
 *
 * El mapa no usa teselas de un servidor externo. Se dibuja como vector por tres
 * razones, y ninguna es estética: no depende de que un proveedor esté
 * disponible ni de una clave de API, pesa una fracción de lo que pesan las
 * teselas —lo que importa en móvil—, y permite el aspecto que queremos sin
 * pelearse con el estilo de nadie.
 *
 * Tierra y fronteras van por separado a propósito. Rellenar país por país
 * parece equivalente y no lo es: al recortar el encuadre, los anillos de los
 * países que se salen cambian de sentido y el relleno deja agujeros —Escandinavia
 * entera desaparecía—. Una sola masa de tierra rellena no puede tener ese
 * problema, y las fronteras, que sólo se trazan, tampoco.
 */

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_FILE = path.join(ROOT, 'data', 'map-europe.json');

// Encuadre del mundo del MVP: Europa con Canarias y el Egeo dentro.
const BOUNDS: MapBounds = { west: -32, east: 46, south: 26, north: 71 };

// El alto lo fija la proyección, no un número elegido a ojo: en una proyección
// conforme, ancho y alto están ligados por la escala.
const PROJECTION = fitProjection(BOUNDS, 1600);
const VIEW = { width: PROJECTION.width, height: PROJECTION.height };

const MARGIN = 60;

/**
 * Redondea las coordenadas de una ruta a un decimal. A esta escala la décima de
 * píxel no se ve y recorta el fichero a una fracción de su tamaño.
 */
function roundPath(d: string): string {
  return d.replace(/-?\d+\.\d+/g, (match) => String(Math.round(Number(match) * 10) / 10));
}

async function main(): Promise<void> {
  const projection = geoMercator()
    .scale(PROJECTION.scale)
    .translate([PROJECTION.translateX, PROJECTION.translateY])
    .center([0, 0])
    .rotate([0, 0, 0])
    // Recorte al encuadre: sin esto, un país que envuelve el antimeridiano se
    // proyecta como una banda de miles de unidades de ancho.
    .clipExtent([
      [-MARGIN, -MARGIN],
      [VIEW.width + MARGIN, VIEW.height + MARGIN],
    ])
    .precision(0.3);

  const toPath = geoPath(projection);

  const landTopology = land110m as unknown as Topology;
  const landObject = landTopology.objects['land'];
  if (landObject === undefined) throw new Error('El topology de tierra no trae el objeto "land".');
  const landFeature = feature(landTopology, landObject);

  const countryTopology = countries110m as unknown as Topology;
  const countryObject = countryTopology.objects['countries'];
  if (countryObject === undefined) {
    throw new Error('El topology de países no trae el objeto "countries".');
  }
  const borders = mesh(countryTopology, countryObject as GeometryCollection, (a, b) => a !== b);

  const dataset = {
    $schema: 'https://airline-sim.invalid/schemas/map-v1.json',
    provenance: {
      source: 'Natural Earth vía el paquete world-atlas (land-110m y countries-110m)',
      license: 'Dominio público',
      projection: 'Mercator ajustada al encuadre europeo',
      builtAt: new Date().toISOString(),
    },
    view: VIEW,
    bounds: BOUNDS,
    // Parámetros de la proyección, para que el cliente pueda situar un punto
    // —un aeropuerto, un avión en movimiento— sin volver a preguntar.
    projection: PROJECTION,
    land: roundPath(toPath(landFeature) ?? ''),
    borders: roundPath(toPath(borders) ?? ''),
  };

  const json = `${JSON.stringify(dataset)}\n`;
  await writeFile(OUT_FILE, json);

  console.log(
    `Mapa ${VIEW.width}×${VIEW.height} · tierra ${(dataset.land.length / 1024).toFixed(0)} KB · ` +
      `fronteras ${(dataset.borders.length / 1024).toFixed(0)} KB`,
  );
  console.log(`Escrito en ${path.relative(ROOT, OUT_FILE)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
