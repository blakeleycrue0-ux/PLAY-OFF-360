# Airline World — simulador de gestión de aerolíneas (nombre provisional)

Juego/aplicación de gestión de aerolíneas para **iOS, Android y web**, con un
**mundo online persistente compartido** entre jugadores reales.

El jugador no pilota: es el **CEO**. Funda su compañía, compra o arrienda
aviones, abre rutas entre aeropuertos reales, fija precios y frecuencias,
contrata personal, mantiene la flota y compite con otras aerolíneas — que son
otros jugadores — por demanda, slots y reputación dentro del mismo mundo.

> **Estado del repositorio: fase de diseño.** Todavía no hay código de
> producto. Este repositorio contiene, de momento, el diseño técnico completo
> del sistema. La implementación empieza cuando el diseño esté cerrado.

---

## Documentación

| Documento | Contenido |
|---|---|
| [01 — Arquitectura](docs/01-arquitectura.md) | Stack, servicios, despliegue, decisiones estructurales y sus porqués |
| [02 — Modelo de datos](docs/02-modelo-de-datos.md) | Entidades, esquema Postgres, índices, particionado |
| [03 — Simulación y vuelos](docs/03-simulacion-y-vuelos.md) | Motor por eventos, reloj del mundo, ciclo de vida de un vuelo |
| [04 — Economía y demanda](docs/04-economia-y-demanda.md) | Modelo de gravedad, reparto logit, P&L, libro contable |
| [05 — Mundo online](docs/05-mundo-online.md) | Shards, tiempo real, slots, alianzas, rankings, anti-abuso |
| [06 — Eventos y noticias](docs/06-eventos-y-noticias.md) | Incidentes, probabilidades, tratamiento no gráfico, feed de noticias |
| [07 — Cliente, mapa y UX](docs/07-cliente-mapa-ux.md) | App multiplataforma, mapa en vivo, sistema de diseño |
| [08 — MVP y roadmap](docs/08-mvp-y-roadmap.md) | Qué entra y qué NO entra en el MVP, fases de desarrollo |
| [09 — Riesgos y decisiones abiertas](docs/09-riesgos-y-decisiones-abiertas.md) | Lo que puede hundir el proyecto y lo que falta decidir |

## Resumen ejecutivo en una página

**La idea técnica que lo sostiene todo:** un vuelo no se simula tick a tick.
Se **planifica** (despegue, llegada, ruta geodésica) y se **resuelve** una sola
vez al aterrizar. El servidor no mueve aviones: programa trabajos. El cliente
interpola la posición desde el reloj. Así 50.000 vuelos simultáneos cuestan lo
mismo que 500, los vuelos continúan con la app cerrada, y todo el mundo ve
exactamente el mismo mundo.

**Lo que hace que no sea un clicker:** la demanda se reparte entre competidores
con un modelo de elección discreta (logit). Meter más aviones en una ruta no da
más pasajeros: da menos ocupación por avión. Se puede tener 200 aviones y
perder dinero cada día. El objetivo no es el saldo, es el margen.

**Lo que hace que el mundo esté vivo:** slots finitos por aeropuerto,
combustible con precio mundial variable, eventos regionales que afectan a todos
a la vez y noticias generadas desde el log real de acontecimientos.

**Stack:** monorepo TypeScript · Postgres + PostGIS · Node/Fastify · worker de
simulación · Redis · WebSocket · React Native (Expo) + Next.js web.
