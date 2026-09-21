import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Construye la vista previa inyectando en la plantilla la instantánea de datos
 * y las librerías empotradas.
 *
 * Está escrito en JavaScript plano y **sin una sola dependencia** a propósito.
 * Es lo que ejecuta Netlify, y cualquier cosa que necesite instalar antes
 * —TypeScript, tsx, el workspace entero— es una forma nueva de que el
 * despliegue falle. Con esto basta `node`, que siempre está.
 *
 * Todo acaba dentro de un único fichero: ni CDN, ni peticiones extra, ni una
 * segunda cosa que pueda no llegar.
 *
 *   node scripts/build-preview.mjs
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW = path.join(ROOT, 'apps', 'web', 'preview');
const TEMPLATE = path.join(PREVIEW, 'template.html');
const SNAPSHOT = path.join(ROOT, 'data', 'ui-snapshot.json');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'index.html');

// El orden importa: d3-geo espera encontrar ya en `d3` lo que toma de d3-array.
const VENDOR = ['vendor/d3-array-subset.js', 'vendor/d3-geo.min.js'];

/**
 * Ficheros que se copian tal cual junto a la página.
 *
 * La fotografía de la Tierra no se incrusta en el HTML: en base64 engordaría
 * 430 KB el documento y habría que volver a descargarla en cada visita. Como
 * fichero aparte, el navegador la cachea.
 */
const ASSETS = ['textures/earth-bmng-2048.jpg'];

/**
 * Lo único que puede romper un `<script>` o un `<script type="application/json">`
 * desde dentro es un cierre de etiqueta literal, así que es lo único que hay que
 * neutralizar. La barra escapada es equivalente en JavaScript y en JSON.
 *
 * @param {string} source
 * @returns {string}
 */
function inlineSafe(source) {
  return source.replace(/<\//g, '<\\/');
}

/**
 * @param {string} html
 * @param {string} marker
 * @param {string} value
 * @returns {string}
 */
function replaceOnce(html, marker, value) {
  if (!html.includes(marker)) throw new Error(`La plantilla no contiene el marcador ${marker}.`);
  // Se usa una función de reemplazo para que `$&` y compañía dentro del valor no
  // se interpreten como referencias del patrón.
  return html.replace(marker, () => value);
}

async function main() {
  /** @type {string[]} */
  const sources = await Promise.all([
    readFile(TEMPLATE, 'utf8'),
    readFile(SNAPSHOT, 'utf8'),
    ...VENDOR.map((file) => readFile(path.join(PREVIEW, file), 'utf8')),
  ]);
  const [template = '', snapshot = '', ...vendor] = sources;

  let html = replaceOnce(template, '__SNAPSHOT__', inlineSafe(snapshot.trim()));
  html = replaceOnce(html, '__VENDOR__', vendor.map(inlineSafe).join('\n;\n'));

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT, html);

  await Promise.all(
    ASSETS.map((asset) =>
      copyFile(path.join(PREVIEW, asset), path.join(OUT_DIR, path.basename(asset))),
    ),
  );

  console.log(
    `Vista previa construida: ${(html.length / 1024).toFixed(0)} KB → ${path.relative(ROOT, OUT)}`,
  );
  console.log(`Ficheros junto a ella: ${ASSETS.map((a) => path.basename(a)).join(', ')}`);
}

main().catch(
  /** @param {unknown} error */ (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  },
);
