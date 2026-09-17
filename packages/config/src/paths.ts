/**
 * Enumera las hojas de un objeto de configuración como rutas con punto
 * (`fleet.checks.A.intervalHours`). Un array se considera una hoja: es un
 * único parámetro con varios valores, no varios parámetros.
 */
export function leafPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return prefix === '' ? [] : [prefix];
  }

  const paths: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    paths.push(...leafPaths(child, prefix === '' ? key : `${prefix}.${key}`));
  }
  return paths;
}
