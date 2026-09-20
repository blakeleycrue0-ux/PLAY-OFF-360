import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Etapa 1 de la importación de aeropuertos (ADR-011): descarga.
 *
 * Los CSV de origen ocupan unos 16 MB y NO se versionan. Lo que se versiona es
 * el snapshot normalizado que produce la etapa 2, para que la construcción sea
 * reproducible sin depender de que la red esté disponible ni de que el fichero
 * remoto no haya cambiado.
 *
 *   pnpm data:fetch-airports
 */

const SOURCE = {
  name: 'OurAirports',
  license: 'Dominio público (Unlicense)',
  homepage: 'https://ourairports.com/data/',
  files: [
    {
      key: 'airports',
      url: 'https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv',
    },
    {
      key: 'runways',
      url: 'https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/runways.csv',
    },
  ],
} as const;

const OUT_DIR = path.resolve(import.meta.dirname, '..', 'data', 'source');

async function download(
  url: string,
  destination: string,
): Promise<{ bytes: number; sha256: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar ${url}: HTTP ${response.status}`);
  }

  const body = Buffer.from(await response.arrayBuffer());
  await writeFile(destination, body);

  return { bytes: body.byteLength, sha256: createHash('sha256').update(body).digest('hex') };
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const manifest = {
    source: SOURCE.name,
    license: SOURCE.license,
    homepage: SOURCE.homepage,
    downloadedAt: new Date().toISOString(),
    files: {} as Record<string, { url: string; bytes: number; sha256: string }>,
  };

  for (const file of SOURCE.files) {
    const destination = path.join(OUT_DIR, `${file.key}.csv`);
    process.stdout.write(`Descargando ${file.key}… `);
    const result = await download(file.url, destination);
    console.log(`${(result.bytes / 1024 / 1024).toFixed(1)} MB`);
    manifest.files[file.key] = { url: file.url, ...result };
  }

  await writeFile(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nDescarga completa en ${OUT_DIR}`);
  console.log('Siguiente paso: pnpm data:build-airports');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
