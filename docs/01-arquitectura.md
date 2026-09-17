# 01 — Arquitectura

## 1.1 El problema, en términos de ingeniería

Antes de elegir tecnología hay que entender qué clase de sistema es esto,
porque no es una app CRUD con pantallas bonitas.

Es un **simulador multijugador persistente, asíncrono y de baja frecuencia**:

- **Persistente**: el mundo avanza aunque nadie esté conectado. Un vuelo
  despegado sigue en el aire con la app cerrada.
- **Multijugador de estado compartido**: las acciones de un jugador (abrir una
  ruta, bajar un precio, ocupar un slot) cambian los resultados de otro. No hay
  simulaciones aisladas.
- **Asíncrono y de baja frecuencia**: nadie necesita 60 fps ni latencia de 50 ms.
  Las decisiones son estratégicas y ocurren cada minutos u horas.
- **Con mucha lectura y poca escritura**: miles de jugadores mirando el mapa,
  muy pocas escrituras (un vuelo escribe 2-3 veces en toda su vida).
- **Determinista y auditable**: si un jugador pierde un avión o 3 M€, tiene que
  poder verse exactamente por qué. Nada aleatorio sin registro.

Estas cinco propiedades dictan casi todas las decisiones que siguen.

## 1.2 La decisión central: simulación por eventos, no por ticks

La tentación obvia es un bucle que cada segundo mueve todos los aviones un
poco. **Es la decisión equivocada** y determina si el proyecto escala o no.

### El enfoque correcto

Un vuelo, al programarse, queda definido por datos inmutables:

```
origen, destino, hora de despegue, hora de llegada prevista,
avión, configuración, precio, ruta (círculo máximo)
```

De ahí se derivan dos cosas sin coste:

1. **La posición actual del avión** es una función pura del reloj:
   `posición(t) = interpolar(origen, destino, (t - t_despegue) / duración)`.
   La calcula **el cliente**, en el dispositivo, mientras dibuja el mapa. El
   servidor nunca actualiza una columna `lat/lon` cada segundo.

2. **El trabajo del servidor** se reduce a *dos* momentos: el despegue (valida
   recursos, cobra el combustible, marca el avión ocupado) y el aterrizaje
   (resuelve pasaje, ingresos, costes, desgaste, incidentes). Entre medias, cero
   trabajo.

### Consecuencias

| | Bucle por ticks | Por eventos |
|---|---|---|
| Coste servidor con 50.000 vuelos | 50.000 escrituras/seg | ~2 jobs por vuelo, en total |
| App cerrada | requiere que el servidor siga moviendo todo | funciona solo: el job ya está programado |
| Servidor caído 10 min | estado corrupto o vuelos congelados | al arrancar procesa los vencidos, sin pérdida |
| Añadir un mundo nuevo | multiplica CPU | multiplica filas, no CPU |

El motor de simulación no es un bucle: es una **cola de trabajos programados en
el tiempo** (`sim_jobs`) más funciones puras de resolución. Detalle completo en
[03 — Simulación y vuelos](03-simulacion-y-vuelos.md).

## 1.3 Diagrama de sistema

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENTES                                                       │
│  iOS / Android (React Native + Expo)   ·   Web (Next.js)        │
│  ├─ interpolación de posiciones en el dispositivo               │
│  ├─ caché local + optimistic UI                                 │
│  └─ WebSocket para deltas (despegues, aterrizajes, alertas)     │
└───────────────┬───────────────────────────┬─────────────────────┘
                │ HTTPS (REST/tRPC)         │ WSS
┌───────────────▼───────────────────────────▼─────────────────────┐
│  API GATEWAY  (Fastify, Node/TypeScript, sin estado, N réplicas)│
│  ├─ auth (JWT) · rate limiting · validación (zod)               │
│  ├─ COMANDOS: comprar avión, abrir ruta, fijar precio…          │
│  ├─ CONSULTAS: mapa, flota, P&L, rankings, perfiles             │
│  └─ publica jobs en la cola; NUNCA simula en línea              │
└───────────────┬───────────────────────────┬─────────────────────┘
                │                           │
┌───────────────▼──────────┐   ┌────────────▼─────────────────────┐
│ POSTGRES + PostGIS       │   │ REDIS                            │
│ ├─ verdad del mundo      │   │ ├─ caché de consultas de mapa    │
│ ├─ cola sim_jobs         │   │ ├─ rankings (ZSET)               │
│ │   (SKIP LOCKED)        │   │ ├─ presencia y pub/sub WS        │
│ ├─ ledger append-only    │   │ └─ rate limits                   │
│ └─ event_log append-only │   └──────────────────────────────────┘
└───────────────▲──────────┘
                │
┌───────────────┴─────────────────────────────────────────────────┐
│  SIMULATION WORKER  (mismo código, proceso distinto, N réplicas)│
│  ├─ toma jobs vencidos (FOR UPDATE SKIP LOCKED)                 │
│  ├─ resuelve: despegue · aterrizaje · mantenimiento             │
│  ├─ cierres: día contable, nómina, leasing, demanda diaria      │
│  ├─ eventos de mundo: meteo, huelgas, precio del combustible    │
│  └─ genera noticias y notificaciones push                       │
└─────────────────────────────────────────────────────────────────┘
```

Puntos importantes del diagrama:

- **API y worker comparten código** (el mismo paquete `@game/domain`) pero son
  **procesos separados**. Un pico de jugadores mirando el mapa no puede retrasar
  la resolución de vuelos, y una avalancha de aterrizajes no puede tumbar la API.
- **La API nunca simula.** Cuando un jugador programa un vuelo, la API valida y
  escribe dos filas: el vuelo y su job de despegue. Nada más.
- **Postgres es la única fuente de verdad.** Redis es descartable: si se borra
  entero, el juego sigue funcionando (más lento durante unos minutos).

## 1.4 Stack elegido y por qué

### Lenguaje: TypeScript en todo el stack

No por moda, por una razón concreta: **las fórmulas del juego tienen que correr
en dos sitios**. El servidor las ejecuta para decidir el resultado real; el
cliente las ejecuta para enseñar *previsiones* ("esta ruta rendirá ~46.000 € al
mes") sin una llamada de red por cada cambio de un deslizador.

Con TypeScript esas fórmulas se escriben **una vez** en `packages/domain`, se
importan en ambos lados, y nunca divergen. Con Go o Rust en el backend habría
que reimplementarlas en el cliente y mantener dos verdades, que a la larga se
desincronizan y producen la peor sensación posible en un juego de gestión: "la
app me prometió beneficio y he perdido dinero".

El coste es rendimiento bruto, pero ya hemos visto en §1.2 que el trabajo por
vuelo es minúsculo. No estamos limitados por CPU, sino por diseño.

### Base de datos: PostgreSQL (+ PostGIS)

- **Transaccional de verdad.** "Cobrar 92 M€ y registrar el avión" debe ser
  atómico. Un documento NoSQL aquí es una fuente garantizada de dinero duplicado.
- **La cola de trabajos vive en la misma base**, con `FOR UPDATE SKIP LOCKED`.
  Esto permite programar el vuelo y su job **en la misma transacción**: es
  imposible que exista un vuelo sin su resolución pendiente. Con una cola
  externa (SQS, Rabbit) ese escenario sí es posible y provoca vuelos fantasma.
- **PostGIS** resuelve las consultas del mapa (`dame todo lo que hay en este
  rectángulo`) y las distancias de círculo máximo con precisión geodésica.
- **Particionado nativo** para `flights` y `ledger_entries`, que son las tablas
  que crecerán a cientos de millones de filas.
- Es aburrido, está probado y hay gente que sabe operarlo. En un proyecto con
  esta cantidad de mecánicas, la infraestructura debe ser la parte sin sorpresas.

**Alojamiento:** Supabase o Neon al principio (Postgres gestionado, con auth y
realtime ya resueltos si conviene); migrable a Postgres gestionado clásico (RDS,
Cloud SQL) cuando el volumen lo pida. Nada del diseño depende del proveedor.

### Backend: Node + Fastify, monolito modular

**Monolito modular, no microservicios.** Con un equipo pequeño, partir esto en
servicios de aviones / rutas / economía es multiplicar la latencia y los modos
de fallo para resolver un problema de escala que aún no existe. Un solo
despliegue, módulos con fronteras claras (`airline/`, `fleet/`, `network/`,
`sim/`, `economy/`, `social/`) y dos *procesos* (API y worker) desde el día uno,
que es la única separación que realmente importa aquí.

Fastify sobre Express por rendimiento, validación de esquemas integrada y
tipado. Alternativa igual de válida: **NestJS** si se prefiere estructura
impuesta; el diseño no cambia.

**Dónde no encaja el serverless puro:** las funciones edge tienen límites de
ejecución, arranques en frío y no mantienen WebSockets. El worker de simulación
necesita ser un proceso vivo y largo. Despliegue en contenedores (Fly.io,
Railway, Render o ECS). La web sí puede ir en Vercel/Netlify sin problema.

### Cliente: monorepo con React Native (Expo) + Next.js

- **iOS y Android**: React Native con Expo. Una base de código, OTA updates
  (críticas para ajustar balance sin pasar por revisión de tienda), y acceso a
  push notifications, que en este juego no son un extra: son el bucle de
  retención ("tu vuelo BLA204 ha aterrizado").
- **Web**: Next.js. Comparte `packages/domain`, `packages/api-client` y los
  tokens de diseño. Los componentes visuales no se comparten entre nativo y web
  (es una fuente clásica de sufrimiento); se comparte **lógica**, no píxeles.
- **Cuenta única**: la misma cuenta funciona en las tres plataformas. Es
  requisito y sale gratis con un backend propio y JWT.

**Alternativa evaluada y descartada:** Flutter. Es excelente para la UI, pero
rompe la propiedad de §"lenguaje": las fórmulas habría que escribirlas en Dart
y en TypeScript. Solo lo elegiría si el equipo ya fuese de Flutter.

**Mapa:** MapLibre GL (nativo y web, misma familia de API, gratis, teselas
propias o de proveedor). Los aviones se dibujan como una capa de símbolos con
posiciones recalculadas en cada frame por interpolación local — sin red.

### Tiempo real: WebSocket propio sobre Redis pub/sub

El cliente no necesita un flujo continuo: necesita **deltas puntuales**
(despegue, aterrizaje, retraso, incidente, noticia, cambio de precio de un
rival en tus rutas). Suscripción por canales: `world:{id}:region:{tile}`,
`airline:{id}`, `alliance:{id}`.

Si el volumen crece, se sustituye por un servicio gestionado (Ably, Pusher,
Supabase Realtime) sin tocar el modelo de datos: solo cambia el transporte.

## 1.5 Estructura del monorepo

```
apps/
  api/            Fastify · HTTP + WebSocket
  worker/         procesador de sim_jobs y cierres programados
  mobile/         Expo (iOS + Android)
  web/            Next.js (juego en web + perfiles públicos + landing)
  admin/          back-office: balance, moderación, telemetría
packages/
  domain/         ★ corazón: tipos + fórmulas puras, sin I/O
                    demand/  pricing/  costs/  wear/  risk/  schedule/
  db/             esquema, migraciones, repositorios tipados
  api-client/     cliente generado, compartido por mobile y web
  ui-tokens/      colores, tipografía, espaciado, sombras
  config/         parámetros de balance versionados (JSON validado)
data/
  airports.csv    OurAirports (dominio público)
  aircraft.json   catálogo de tipos de avión
  markets.json    pesos de mercado y estacionalidad por país/aeropuerto
```

**`packages/domain` no importa nada.** Ni base de datos, ni red, ni reloj del
sistema. Todas sus funciones son puras: reciben estado y devuelven resultado.
Esto tiene tres consecuencias enormes:

1. Se puede **testear el balance del juego** sin levantar infraestructura.
2. Se puede **simular una temporada entera en segundos** en un script para ver
   si la economía se rompe a los 6 meses de juego (ver §1.7).
3. El cliente la puede importar para previsiones, como se explicó arriba.

## 1.6 Determinismo y auditoría

Toda aleatoriedad usa un PRNG sembrado de forma reproducible:

```ts
seed = hash(world_seed, entity_id, event_kind, day_index)
```

Nunca `Math.random()`. Así:

- Un incidente puede **recalcularse** para verificar que fue legítimo (soporte
  al jugador, reportes de bug, detección de exploits).
- Los tests son estables: el mismo mundo da el mismo resultado.
- Un jugador no puede provocar reintentos hasta que le salga bien, porque el
  resultado está determinado por el estado, no por el momento de la llamada.

Y todo lo que ocurre se escribe en un **`event_log` append-only**: no es un log
de texto, es la historia del mundo en filas. Las noticias, las estadísticas y
los perfiles públicos son **proyecciones** de ese log. Si mañana se quiere una
métrica nueva, se recalcula desde el log en vez de haberla tenido que prever.

## 1.7 Balance como código

Ningún número del juego (precio del queroseno, elasticidad, coste de un check C,
probabilidad base de incidente) se escribe en el código. Todo vive en
`packages/config` como JSON validado y versionado, cargado por mundo.

Encima de eso, un **arnés de simulación**: un script que corre 12 meses de juego
con 500 aerolíneas artificiales usando distintas estrategias (low-cost agresiva,
red de hub, regional conservadora) y reporta si alguna estrategia domina, si
alguien quiebra siempre, o si la inflación se descontrola.

Esto es lo que separa un juego de gestión de una hoja de cálculo con temática de
aviones, y es barato **solo si el dominio es puro desde el principio**. Si se
deja para después, ya no se puede hacer.
