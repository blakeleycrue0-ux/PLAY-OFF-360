import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Inyecta la instantánea de datos en la plantilla de la consola.
 *
 * La vista previa se construye, no se escribe a mano: así los datos que enseña
 * son siempre los que produjo la última simulación, y nadie tiene que acordarse
 * de copiarlos.
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const TEMPLATE = path.join(ROOT, 'apps', 'web', 'preview', 'template.html');
const SNAPSHOT = path.join(ROOT, 'data', 'ui-snapshot.json');
const OUT = path.join(ROOT, 'apps', 'web', 'preview', 'index.html');

async function main(): Promise<void> {
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

  await writeFile(OUT, html);
  console.log(
    `Vista previa construida: ${(html.length / 1024).toFixed(0)} KB → ${path.relative(ROOT, OUT)}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
