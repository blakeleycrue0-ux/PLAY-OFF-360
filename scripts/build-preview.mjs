import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Construye la consola inyectando la instantánea de datos en la plantilla.
 *
 * Está escrito en JavaScript plano y **sin una sola dependencia** a propósito.
 * Es lo que ejecuta Netlify, y cualquier cosa que necesite instalar antes
 * —TypeScript, tsx, el workspace entero— es una forma nueva de que el
 * despliegue falle. Con esto basta `node`, que siempre está.
 *
 *   node scripts/build-preview.mjs
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = path.join(ROOT, 'apps', 'web', 'preview', 'template.html');
const SNAPSHOT = path.join(ROOT, 'data', 'ui-snapshot.json');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'index.html');

async function main() {
  const [template, snapshot] = await Promise.all([
    readFile(TEMPLATE, 'utf8'),
    readFile(SNAPSHOT, 'utf8'),
  ]);

  if (!template.includes('__SNAPSHOT__')) {
    throw new Error('La plantilla no contiene el marcador __SNAPSHOT__.');
  }

  // El JSON viaja dentro de una etiqueta <script type="application/json">, así
  // que lo único que hay que neutralizar es un cierre de etiqueta literal.
  const safe = snapshot.trim().replace(/<\//g, '<\\/');
  const html = template.replace('__SNAPSHOT__', safe);

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT, html);

  console.log(
    `Consola construida: ${(html.length / 1024).toFixed(0)} KB → ${path.relative(ROOT, OUT)}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
