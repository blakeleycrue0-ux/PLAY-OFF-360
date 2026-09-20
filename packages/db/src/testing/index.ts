/**
 * Utilidades de prueba de la capa de datos.
 *
 * Viven en un punto de entrada aparte (`@airline/db/testing`) para que el
 * andamiaje de los tests no forme parte de la superficie pública del paquete:
 * nada de producción puede importar por descuido un constructor de escenarios.
 */
export { createTestPool, rebuildTestSchema, truncateGameData } from './test-db.js';
export {
  T0,
  makeWorld,
  makeAirline,
  makeAircraft,
  makeRoute,
  makeSchedule,
  makeFlight,
} from './factories.js';
