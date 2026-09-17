# 05 — Mundo online y multijugador

## 5.1 Qué significa exactamente "mundo compartido"

No es un juego en red con partidas. Es un **estado global persistente** donde
todos los jugadores de un mundo:

- compiten por la **misma demanda** (el logit del doc 04 es literalmente donde
  se encuentran),
- compiten por los **mismos slots** (recurso finito y nominal),
- compiten por los **mismos aviones** (oferta limitada de entregas y mercado de
  segunda mano),
- sufren los **mismos eventos** (una huelga en BCN afecta a todo el que opere
  allí),
- pagan el **mismo precio del combustible**,
- y aparecen en **el mismo mapa**, en vivo.

Nada de esto requiere sincronización en tiempo real estricta, porque todas las
interacciones ocurren a través de la base de datos y se resuelven en el momento
de la salida de cada vuelo. **La concurrencia se gestiona con transacciones, no
con netcode.** Es la razón por la que este género puede tener miles de jugadores
simultáneos sin infraestructura de juego en tiempo real.

## 5.2 Shards: por qué no un único mundo global

Un mundo (`worlds`) admite del orden de **5.000-15.000 aerolíneas activas**. Por
encima de eso pasan dos cosas malas: todas las rutas buenas están cogidas (un
jugador nuevo no tiene dónde empezar) y las consultas de mercado se vuelven
pesadas.

La solución es abrir mundos nuevos:

- **Mundo 1 — Europa**: mapa reducido (~400 aeropuertos), ideal para empezar.
- **Mundo 2 — Global**: todos los aeropuertos, para veteranos.
- **Mundos estacionales**: 3-4 meses, reglas modificadas (todos empiezan sin
  slots, o con combustible carísimo, o solo widebodies), ranking propio y
  recompensas cosméticas. Es el mecanismo de retención a largo plazo y da
  a los nuevos la oportunidad de empezar en igualdad.

La cuenta es única; las aerolíneas son por mundo. Todas las consultas llevan
`world_id` en el índice desde el primer día — añadirlo después es una migración
muy dolorosa.

## 5.3 El mapa en vivo a escala

El problema: un mundo puede tener 30.000 vuelos en el aire. Enviarlos todos al
móvil es inviable.

**Solución en tres capas:**

**1. Consulta por viewport y zoom.** El cliente pide lo que está viendo:

```
GET /worlds/{id}/map?bbox=1.2,38.9,3.5,40.1&zoom=7&filter=all
```

El servidor responde con un **plan de vuelo compacto**, no con posiciones:

```json
{ "serverTime": "2026-09-17T18:42:11Z",
  "flights": [
    { "i":"a3f…", "n":"BLA204", "al":"BLA", "o":"PMI", "d":"LGW",
      "dep":1789412400, "arr":1789421100, "t":"A20N", "px":178, "c":"#0B3D91" }
  ],
  "clusters": [ { "lat":40.4, "lon":-3.6, "count":214 } ] }
```

Con ~40 bytes por vuelo, 800 vuelos visibles son 32 KB. El cliente calcula las
posiciones localmente a 60 fps (doc 03 §3.2).

**2. Clustering por zoom.** Con zoom bajo no se mandan vuelos individuales sino
agregados por celda geográfica (calculados en el servidor con PostGIS y cacheados
en Redis 20-30 s, que es tiempo suficiente: los aviones se mueven despacio en
pantalla a esa escala).

**3. Deltas por WebSocket.** El cliente se suscribe a las celdas visibles y solo
recibe cambios: `takeoff`, `landing`, `delay`, `divert`, `incident`. Al mover el
mapa, cambia de suscripción. Un vuelo genera 2-4 mensajes en toda su vida.

Presupuesto de rendimiento objetivo: **< 60 KB en la carga inicial del mapa,
< 3 KB/min en estado estacionario, 60 fps en un móvil de gama media de hace
cuatro años.**

### Al tocar un avión

```
BLA204                                          EN VUELO
Blake Airways
─────────────────────────────────────────────────────────
Palma de Mallorca (PMI) ──────●────────── Londres Gatwick (LGW)
18:20                     64%                        19:48

AX-320neo · EC-BLA · 178 pasajeros · 86% de ocupación
Altitud 11.300 m · 847 km/h · quedan 52 min

[ Ver Blake Airways ]              [ Ver esta ruta ]
```

Todo eso sale de datos que el cliente ya tiene, salvo el detalle de pasajeros,
que se pide con un `GET /flights/{id}`.

**Sobre qué información es pública:** ver el vuelo, el avión, la ocupación y el
precio de un rival es **correcto y deseable** — es inteligencia competitiva, y es
lo que hace que el mundo se sienta habitado. Lo que no se expone: caja, deuda,
programación futura sin publicar y márgenes. Se ve lo que en el mundo real es
público (horarios, tarifas, flota, puntualidad).

## 5.4 Slots: la competencia más directa entre jugadores

Un slot es un par (aeropuerto, franja de 30 min, temporada) con un único
propietario. En PMI a las 03:00 sobran; en LGW a las 08:00 hay diez jugadores
peleando.

Reglas:

- **Adjudicación**: los libres se compran a `slot_price_base` ajustado por
  demanda. Los codiciados van a **subasta a sobre cerrado** con ventana de 24 h
  de juego (asíncrona: encaja con el móvil, nadie tiene que estar despierto).
- **Úsalo o piérdelo**: si `use_rate_90d < 80%`, el slot se retira y vuelve al
  mercado. Impide el acaparamiento especulativo del jugador rico.
- **Reventa entre jugadores** con un tope (p. ej. 3× el precio base) para evitar
  que el mercado de slots se convierta en un vehículo de lavado de dinero entre
  cuentas cómplices.
- **Ampliaciones de aeropuerto**: como evento de mundo, un aeropuerto añade
  capacidad y libera slots nuevos. Noticia, oportunidad y conversación.

Esto genera de forma natural lo que el diseño pedía: los aeropuertos grandes son
difíciles y caros, y hay razones para desarrollar bases secundarias.

## 5.5 Alianzas

```
GLOBAL AIR ALLIANCE                                 8 / 12 miembros
──────────────────────────────────────────────────────────────────
Blake Airways (ES)   ·   Nordwing (NO)   ·   Adria Connect (HR)  …

Red conjunta: 1.847 rutas · 312 aeropuertos · 41,2 M pax/año
Cuota agregada Europa: 14,8 %                        Ranking: 2.º
```

Beneficios mecánicos, no cosméticos:

- **Codeshare automático** entre miembros: los itinerarios con conexión en los
  hubs de la alianza entran en el logit con una penalización de escala reducida.
- **Bonus de utilidad** (`b.alliance`) para pasajeros frecuentes.
- **Compras conjuntas**: descuento por volumen en pedidos de aviones.
- **Slots compartidos** en los hubs de la alianza.
- **Sala común**: chat, objetivos colectivos, ranking de alianzas.

Límite de miembros (12) por dos razones: evita la megaalianza que absorbe medio
mundo, y mantiene el grupo a tamaño social manejable.

### Conexiones y prorrateo

Una vez hay codeshares, el modelo de demanda deja de ser solo punto a punto:
para un O&D sin vuelo directo se generan **itinerarios de dos tramos** vía hubs
con conexión viable (60-180 min de margen), que compiten en el mismo logit con
`- b.stops`. El ingreso se reparte por distancia ponderada.

Esto es lo que hace que construir un **hub** sea una estrategia distinta a
construir rutas punto a punto: tu hub multiplica valor cuando cada ruta nueva
alimenta a todas las demás.

## 5.6 Rankings: cómo evitar el "gana el más rico"

Un único ranking por patrimonio convierte el juego en una carrera de
acumulación. En su lugar, **ligas paralelas**, todas visibles:

| Liga | Métrica | A quién premia |
|---|---|---|
| Pasajeros | pax transportados (30 d) | volumen |
| Rentabilidad | margen operativo % | eficiencia — **el pequeño puede ganar** |
| Puntualidad | % llegadas < 15 min | operación cuidadosa |
| Reputación | índice compuesto | servicio a largo plazo |
| Red | destinos únicos servidos | expansión geográfica |
| Eficiencia | beneficio por asiento-km ofrecido | optimización fina |
| Crecimiento | Δ% del mes | **los nuevos compiten aquí desde el día 1** |
| Seguridad | vuelos sin incidentes | mantenimiento riguroso |

Y ligas por **categoría de tamaño** (regional / mediana / grande), para que una
compañía de 8 aviones no compita nunca contra una de 300.

Cuota de mercado por país, por aeropuerto y por ruta, visible para todos. Es
información competitiva real y alimenta la rivalidad.

## 5.7 Perfil público de aerolínea

Página web indexable (`/a/blake-airways`) además de pantalla en la app — es
marketing orgánico gratis cuando los jugadores compartan su compañía.

```
BLAKE AIRWAYS                                      ★ Reputación 91
BLA · España · Hub: Palma de Mallorca              Fundada: marzo 2026

Flota 24        Rutas 67        Pax 1,8 M        Puntualidad 88,4 %
Destinos 41     Países 14       Edad media 6,2 años

[ mapa de su red ]

FLOTA            12 × AX-320neo · 8 × AX-737-8 · 4 × EX-195
ALIANZA          Global Air Alliance
MAYORES RUTAS    PMI-LGW · PMI-MAN · PMI-DUS · BCN-CDG
```

## 5.8 Integridad: anti-trampa y anti-abuso

| Riesgo | Mitigación |
|---|---|
| Cliente manipulado | **Toda** resolución en servidor. El cliente solo envía intenciones; nunca resultados. |
| Multicuenta para regalar dinero | **Prohibidas las transferencias directas de dinero.** Toda transacción entre jugadores pasa por mercados con precio acotado (aviones, slots) |
| Colusión de precios | No es trampa: es estrategia. Permitida, pero el logit y la opción "no volar" la hacen poco rentable |
| Automatización / bots | Rate limits por cuenta y acción; el juego es asíncrono, no hay ventaja real en clicar rápido |
| Ataques de denegación económica | Coste real de abrir rutas, límites de operaciones por día |
| Suplantación (nombres reales) | Filtro de nombres/códigos IATA reservados; moderación de logos y nombres reportables |
| Duplicación de dinero por reintentos | `idempotency_key UNIQUE` en el ledger (doc 02 §2.8) |
| Explotación de bugs de balance | El `event_log` y el PRNG sembrado permiten recalcular y revertir con precisión |

## 5.9 Monetización (conviene decidirlo antes de construir)

El diseño pide explícitamente evitar que gane quien más pague. Propuesta:

**Sí:** liveries y logos premium, nombres de aviones, pases de temporada
cosméticos, ampliación de límites de calidad de vida (más plantillas de
programación guardadas, más alertas), estadísticas avanzadas, saltarse *tiempo
de espera administrativo* con moderación (entrega de un avión ya comprado).

**No:** comprar dinero del juego, comprar slots fuera del mercado, comprar
demanda, comprar reputación, comprar inmunidad a incidentes.

La línea es clara: **se puede pagar por expresarse y por comodidad, nunca por
ventaja competitiva sobre otro jugador.** Si esta línea se cruza, el modelo
económico del doc 04 deja de significar nada y el juego se muere.
