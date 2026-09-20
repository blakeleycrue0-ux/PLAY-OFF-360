import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Inyecta la instantánea de datos en la plantilla de la consola y deja el
 * resultado en `dist/`, que es lo que publica Netlify.
 *
 * La vista previa se construye, no se escribe a mano: los datos que enseña son
 * siempre los que produjo la última simulación, y nadie tiene que acordarse de
 * copiarlos. Por eso `dist/` no se versiona y la plantilla y la instantánea sí.
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const TEMPLATE = path.join(ROOT, 'apps', 'web', 'preview', 'template.html');
const SNAPSHOT = path.join(ROOT, 'data', 'ui-snapshot.json');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'index.html');

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

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT, html);
  console.log(
    `Vista previa construida: ${(html.length / 1024).toFixed(0)} KB → ${path.relative(ROOT, OUT)}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
