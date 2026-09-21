# Registro de decisiones (ADR)

Decisiones vinculantes del proyecto. Cada una indica su estado y, cuando
procede, la condición que obligaría a revisarla.

Formato: `ADR-NNN · título · estado`.
Estados: **cerrada** (no se rediscute), **vigente** (decidida, revisable con
datos), **pendiente** (hace falta decidir o calibrar).

---

## Decisiones cerradas por producto

### ADR-001 · Tiempo del mundo 1:1 · cerrada

El mundo avanza en tiempo real 1:1: un vuelo de 2 h 25 min tarda 2 h 25 min.

`worlds.time_scale numeric(6,3)` existe desde la primera migración con valor
por defecto `1.000`. **Ninguna** conversión de tiempo usa `Date.now()` suelto
ni asume 1:1: toda conversión entre tiempo real y tiempo del mundo pasa por
`packages/domain/src/time/world-clock.ts`. Cambiar la velocidad de un mundo es
cambiar una fila, no una refactorización.

Implicación de implementación: el dominio nunca lee el reloj del sistema. Las
funciones puras reciben el instante como parámetro; la infraestructura inyecta
un `Clock`. Esto es también lo que permite que el harness corra 12 meses en
segundos (ADR-010).

Referencia: `docs/03-simulacion-y-vuelos.md` §3.1, `docs/09` §9.2 nº 1.

### ADR-002 · Tipos de avión ficticios · cerrada

El MVP no usa nombres comerciales de fabricantes ni de modelos reales.

El catálogo usa designaciones funcionales por categoría y capacidad:

| Código | Nombre | Categoría |
|---|---|---|
| `REG70` | Regional 70 | regional |
| `REG100` | Regional 100 | regional |
| `NB160` | Narrowbody 160 | narrowbody |
| `NB190` | Narrowbody 190 | narrowbody |
| `LR250` | Long Range 250 | widebody |

Los parámetros internos (capacidad, alcance, velocidad, consumo, MTOW, pista
mínima, precio, cuota de leasing, coste de mantenimiento, fiabilidad,
turnaround) son realistas en magnitud y viven en datos, no en código.

Consecuencia: el catálogo se amplía añadiendo filas, no clases.

Referencia: `docs/09` §9.2 nº 2.

### ADR-003 · Aerolíneas NPC desde el primer día · cerrada

Todo mundo se puebla con aerolíneas artificiales. Riesgo que mitiga: el mundo
vacío (`docs/09` §9.1 nº 1).

Siete estrategias, cada una una **política pura** distinta:
`lowcost`, `premium`, `regional`, `hub_and_spoke`, `point_to_point`,
`conservative`, `aggressive`.

**Las NPC no tienen ventajas mágicas.** Regla arquitectónica, no de estilo: una
NPC no puede ejecutar ninguna operación que un jugador no pueda ejecutar. Se
garantiza estructuralmente — las NPC no tienen ruta de código propia: producen
las mismas *intenciones* (abrir ruta, programar vuelo, fijar precio) que pasan
por las mismas funciones de validación y liquidación que las de un jugador.
Lo único que las distingue es qué deciden, no qué se les permite.

`airlines.controller` (`'player' | 'npc'`) y `airlines.npc_strategy` sirven
únicamente para decidir quién toma las decisiones, nunca para modificar reglas
económicas.

### ADR-004 · Europa primero, con datos reales y reproducibles · cerrada

El MVP arranca con Europa, objetivo 250–300 aeropuertos con servicio comercial.

Los datos factuales (IATA, ICAO, coordenadas, elevación, pistas, país) proceden
de **OurAirports** (dominio público). El proceso es reproducible y está
versionado: descarga → normalización → *snapshot* versionado en `data/` →
importación a base de datos. Ver ADR-011.

La arquitectura no asume Europa en ningún punto: el filtro geográfico es un
parámetro del script de importación (`--continent`, `--countries`), y no existe
ninguna constante de continente en el dominio.

---

## Decisiones arquitectónicas de la Fase 1

### ADR-005 · Dominio puro, sin infraestructura · vigente

`packages/domain` no depende de Fastify, PostgreSQL, Redis, React, React Native,
Next.js ni de ninguna API externa. Sus únicas dependencias son
`packages/shared` y `packages/config`, ambas igualmente puras.

Se verifica **automáticamente**, no por disciplina: `eslint` aplica
`no-restricted-imports` sobre `packages/domain` y `packages/shared`, y la regla
falla el build si alguien importa `pg`, `fastify`, `ioredis`, `react`, `fs`,
`node:*` o cualquier paquete de aplicación.

Consecuencias:

- Las mismas funciones corren en servidor (decisión real) y en cliente
  (previsión antes de confirmar), sin duplicar lógica.
- Los tests del dominio no necesitan base de datos y corren en milisegundos.
- El harness puede simular sin levantar nada.

### ADR-006 · El dinero es un entero de céntimos · vigente

En TypeScript el dinero es `Money`, un entero de céntimos con tipo *branded*, y
toda su aritmética pasa por funciones explícitas (`addMoney`, `mulMoney`,
`moneyFromEuros`). No existe dinero en `number` suelto ni en coma flotante.

En base de datos, `ledger_entries.amount_cents` es `bigint`.

Esto **se aparta de `docs/02`**, que proponía `numeric(14,2)`. Motivo: `numeric`
viaja como *string* en el driver de PostgreSQL y obliga a convertir en cada
frontera, lo que es precisamente donde aparecen los errores de redondeo. Un
`bigint` de céntimos no puede redondear mal, es exacto en sumas y comparaciones,
y `±9,2·10^18` céntimos es techo de sobra. La consistencia financiera tiene
prioridad sobre la comodidad (regla del encargo).

Los importes se formatean a euros solo en la capa de presentación.

### ADR-007 · El ledger es la única fuente de verdad del dinero · vigente

Prohibido `UPDATE airlines SET cash = cash - X`. Todo movimiento es una fila
inmutable en `ledger_entries` con `idempotency_key`.

Mecanismo exacto (`packages/db/src/ledger/ledger.ts`):

```sql
INSERT INTO ledger_entries (...) VALUES ...
ON CONFLICT (world_id, idempotency_key) DO NOTHING
RETURNING airline_id, amount_cents;
```

`airlines.cash_cents` se ajusta **solo con las filas que la sentencia devuelve
como realmente insertadas**. Un reintento no devuelve filas, luego no mueve
caja. La idempotencia no la garantiza JavaScript: la garantiza una restricción
`UNIQUE` de PostgreSQL dentro de la misma transacción.

`cash_cents` es un saldo materializado por rendimiento. La verdad es
`SUM(amount_cents)`, y `reconcileAirlineCash()` compara ambos. Cualquier
divergencia es un error y debe ser cero, siempre.

Formato de las claves: `<dominio>:<id>:<concepto>[:<periodo>]`, por ejemplo
`flight:0f3a…:fuel`, `flight:0f3a…:ticket_revenue`, `lease:9c2b…:2026-04`.

### ADR-008 · Tablas calientes particionadas; política explícita de claves ajenas · vigente

`flights` se particiona por rango mensual sobre `scheduled_departure`, y
`ledger_entries` sobre `occurred_at`. Las particiones se crean por adelantado
con `sim_ensure_partitions(from, to)`, invocada por las migraciones, por el
worker y por el harness (que puede necesitar 12 meses de golpe).

PostgreSQL exige que la clave de partición forme parte de toda restricción
única, lo que condiciona las claves ajenas. Política:

- **Hacia fuera** (de tabla particionada a tabla normal): claves ajenas
  normales. `flights.airline_id → airlines(id)` está enforcada.
- **Hacia dentro** (a tabla particionada): sólo con clave compuesta.
  `flight_events → flights(id, scheduled_departure)` está enforcada, con
  `ON DELETE CASCADE`; `flight_events` duplica `flight_scheduled_departure`
  exactamente para eso.
- **`ledger_entries.flight_id` no lleva clave ajena, deliberadamente.**
  `docs/02` §2.12 archiva el detalle de vuelos a los 30 días, y el registro
  financiero debe sobrevivir a ese archivado. Una referencia blanda con índice
  es aquí lo correcto, no una concesión.

### ADR-009 · Cola de trabajos en PostgreSQL, no en Redis · vigente

`sim_jobs` vive en la misma base que el estado del mundo. El vuelo y su trabajo
de resolución se insertan **en la misma transacción**: es imposible que exista
un vuelo sin resolución pendiente. Con una cola externa ese estado sí es
alcanzable y produce vuelos fantasma.

Reclamación con `FOR UPDATE SKIP LOCKED`, que permite N workers sin coordinación.
`dedupe_key UNIQUE` impide programar dos veces el mismo trabajo.

**Recuperación tras caída** (requisito explícito): los trabajos se reclaman por
`run_at <= now() ORDER BY run_at`, y los manejadores calculan el resultado a
partir del **tiempo programado del trabajo**, nunca del reloj de pared. Un
worker que arranca tras 40 minutos parado procesa lo vencido en orden y produce
exactamente el mismo resultado que si hubiera estado vivo. Está cubierto por
test (`worker/recovery`).

Redis no se usa en la Fase 1. Entra cuando haya consultas de mapa y WebSocket
(Fase 2), que es donde `docs/01` lo justifica.

### ADR-010 · Un único motor, dos relojes · vigente

El worker de producción y el harness de simulación ejecutan **los mismos
manejadores**. Lo único que cambia es la implementación de `Clock`:

- `SystemClock` — tiempo real, usado por API y worker.
- `VirtualClock` — salta al `run_at` del siguiente trabajo pendiente, usado por
  el harness.

De ahí sale el requisito de "500 aerolíneas, 100.000 vuelos, 12 meses sin
levantar una app y sin `sleep`": el harness no espera, avanza. Y evita el riesgo
real de que el código simulado y el de producción diverjan.

### ADR-011 · Importación de aeropuertos en tres etapas · vigente

```
OurAirports (airports.csv + runways.csv)
        │  scripts/fetch-airports.ts     (descarga, registra fecha y hash)
        ▼
data/source/*.csv                        (no versionado: 16 MB)
        │  scripts/build-airport-dataset.ts  (filtra, normaliza, valida)
        ▼
data/airports.europe.json                (versionado: snapshot reproducible
        │                                 con source, url, fecha y hashes)
        │  pnpm db:seed
        ▼
tabla airports
```

Ningún aeropuerto está escrito a mano en TypeScript. El *snapshot* se versiona
(no el CSV crudo) para que la construcción sea reproducible sin depender de que
la red esté disponible ni de que el fichero remoto no haya cambiado.

`data/airports.europe.json` lleva cabecera de procedencia: fuente, URL, fecha de
descarga, SHA-256 de cada CSV de origen, criterios de filtrado y versión del
normalizador.

### ADR-012 · Alcance de tablas de la Fase 1 · vigente

Se crean: `worlds`, `accounts`, `airlines`, `airports`, `aircraft_types`,
`aircraft`, `routes`, `flight_schedules`, `flights`, `flight_events`,
`ledger_entries`, `sim_jobs`, `schema_migrations`.

Se **aplazan** conscientemente, con su justificación:

| Tabla | Aplazada a | Motivo |
|---|---|---|
| `slots` | Fase 2 | El MVP prueba primero si la red y la economía funcionan; los slots añaden un recurso compartido que sólo tiene sentido con jugadores concurrentes |
| `staff_pools` | Fase 2 | Restricción operativa, no económica; no cambia el núcleo |
| `world_events`, `incidents`, `news_items` | Fase 2 | Fuera del alcance declarado de esta fase |
| `alliances`, `codeshare_agreements` | Fase 4 | Fuera del alcance declarado |

El esquema no impide ninguna de ellas: `world_id` está en todas las tablas y en
todos los índices desde el principio, que es el error caro de corregir después
(`docs/09` §9.4).

### ADR-013 · La liquidación de un vuelo es atómica y guardada por estado · vigente

Cada manejador (`flight_departure`, `flight_arrival`) corre en una única
transacción y empieza comprobando el estado del vuelo. Si el vuelo ya no está en
el estado esperado, el manejador termina como *no-op* con éxito.

Doble protección: la guarda de estado evita el trabajo repetido; las claves de
idempotencia del ledger evitan el dinero duplicado aunque la guarda fallara.
Nunca se depende de una sola de las dos.

### ADR-014 · Asignación de demanda por vuelo, no por mercado diario · vigente, con deuda conocida

`docs/04` describe el reparto logit sobre el conjunto de ofertas de un par O&D.
La Fase 1 lo implementa **en el momento de la salida de cada vuelo**, contra una
instantánea de las ofertas competidoras de ese par y ese día.

Es una aproximación consciente, no un descuido. Diferencias frente al modelo
completo, documentadas para no olvidarlas:

- El primer vuelo del día se reparte contra ofertas que aún no han salido; el
  reparto es correcto en cuota, pero el derrame (*spill*) sólo puede
  redistribuirse hacia ofertas no resueltas todavía.
- No hay compensación retroactiva si un competidor cancela después.

Plan: pasar a un cierre de mercado diario (`market_clearing`, un trabajo por
par O&D y día, previo a las salidas) en Fase 2. La función pura
`allocateDemand()` ya tiene la forma correcta y no habrá que reescribirla: lo
que cambia es quién la llama y con qué instantánea.

---

### ADR-015 · La geometría del mundo viaja sin proyectar · vigente

Sustituye a la decisión anterior, que guardaba el mapa como rutas SVG ya
proyectadas en una Mercator ajustada a Europa (`data/map-europe.json`).

Aquello servía para un mapa plano y fijo, y sólo para ése. Un globo que se gira
cambia de proyección en cada fotograma: no hay ningún punto proyectado que se
pueda precalcular. Así que `data/world-map.json` guarda tierra y fronteras como
GeoJSON en grados, y `data/ui-snapshot.json` guarda latitud y longitud de
aeropuertos, rutas y vuelos. Quien proyecta es el cliente.

Consecuencias:

- `scripts/lib/projection.ts` desaparece. Ya no hay ninguna proyección en el
  lado del servidor que pueda desincronizarse con la del cliente, que era el
  fallo que dejaba los aeropuertos fuera de sus países.
- El fichero crece de 20 KB a 113 KB porque ahora es el mundo entero y no sólo
  el encuadre europeo. Comprimido son unos 40 KB, que es lo que de verdad viaja.
- La proyección concreta deja de ser una decisión de datos y pasa a ser una
  decisión de interfaz. Cambiar de globo a mapa plano ya no obliga a
  regenerar nada.

### ADR-016 · d3-geo va empotrado, no en un CDN · vigente

La proyección ortográfica del globo necesita recortar por el horizonte: un
polígono que cruza el borde visible hay que cerrarlo siguiendo el arco del
horizonte, y hacerlo mal deja tajos rectos cruzando el planeta. Es la parte que
no conviene escribir a mano, así que se usa `d3-geo`.

Se copia dentro del repositorio (`apps/web/preview/vendor/`) y se incrusta en el
HTML publicado, en vez de pedirlo a un CDN. Un CDN es una dependencia de red más
que puede fallar justo cuando alguien abre la aplicación, y este despliegue ya ha
fallado bastantes veces por depender de cosas que no estaban. `d3-geo` usa tres
símbolos de `d3-array` (`Adder`, `merge`, `range`); se copian esos tres, no el
paquete entero.

La contrapartida es que actualizarlo es manual. Está documentado en
`apps/web/preview/vendor/README.md`.

### ADR-017 · Las rotaciones se construyen en hora local de la base · vigente

El horario de cada avión se calcula en hora local de su base y se pasa a UTC al
publicarlo, que es como lo hace una aerolínea de verdad.

Cuando se medía directamente en UTC, las sesenta compañías del mundo abrían el
día a la misma hora absoluta: nadie despegaba antes de las 06:00 UTC ni
aterrizaba después de las 21:09 UTC, y la operación del mundo cabía en una
franja artificialmente estrecha. Con la ventana local (06:00–22:00) y los husos
del conjunto de datos (de UTC−1 a UTC+3), el día pasa a ir de las 03:00 a las
20:15 UTC.

No es sólo presentación: la demanda depende de la hora local de salida
(`docs/04`), así que un horario construido en UTC estaba evaluando la
conveniencia del vuelo contra una hora que no es la que ve el pasajero.

---

## Pendientes de calibración

No son decisiones de arquitectura: son **números que todavía no están
justificados por una fuente**. Se registran aquí porque el encargo prohíbe
inventar fórmulas en silencio.

Cada parámetro provisional está marcado en `packages/config` con
`provenance: 'provisional'` y una nota. `pnpm config:report` los lista.

| # | Parámetro | Estado | Qué falta |
|---|---|---|---|
| C-1 | `airports.market_weight` | **provisional** | `docs/04` lo usa como tamaño de *catchment* pero no define cómo obtenerlo. Hoy se deriva de tipo de aeropuerto, servicio comercial y número/longitud de pistas (`provisionalMarketWeight()`). Debe sustituirse por tráfico real de pasajeros (Eurostat `avia_paoa`, abierto). **Es la calibración más importante: de ella depende toda la demanda.** |
| C-2 | Coeficientes del logit (`COEF[segment]`) | **provisional** | `docs/04` nombra los coeficientes y da la elasticidad de precio por segmento (−0,8 / −1,9 / −1,5); el resto (horario, frecuencia, reputación, puntualidad, producto, lealtad, escalas) sólo está ordenado cualitativamente. Se calibran con el arnés contra los criterios de `docs/04` §4.10 |
| C-3 | `NO_FLY_UTILITY` | **provisional** | `docs/04` la exige en el denominador pero no le da valor. Fija qué fracción del mercado se queda en casa |
| C-4 | `demand.k` | **provisional** | Constante de escala del modelo de gravedad. Depende enteramente de C-1: no tiene sentido fijarla antes |
| C-5 | Estacionalidad por par O&D | **parcial** | Hay perfil por país e índice de ocio; falta el perfil fino por par que `docs/04` describe (Baleares en verano) |
| C-6 | `business_index` / `leisure_index` | **provisional** | Derivados hoy de heurísticas de país y tipo de aeropuerto |
| C-7 | Tasas aeroportuarias por aeropuerto | **provisional** | Escaladas por clase de tamaño. Los importes reales son públicos pero dispersos |
| C-8 | Reparto de segmentos business/ocio/VFR | **provisional** | `docs/04` describe los tres segmentos y su comportamiento, no su proporción |

Regla vigente: **ningún criterio de `docs/04` §4.10 se declara cumplido
mientras C-1 siga provisional.** El arnés puede comparar estrategias entre sí;
no puede todavía afirmar que la economía está equilibrada.

---

## Decisiones fuera de alcance en esta fase

Registradas para que no se tomen por olvido: rankings, noticias, perfiles
públicos, chat, monetización, alianzas, codeshare, mercado de segunda mano,
carga, accidentes graves, segundo hub y subastas de slots quedan fuera de la
Fase 1 por instrucción explícita. Ninguna está bloqueada por el esquema ni por
el dominio.
