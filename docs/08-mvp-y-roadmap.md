# 08 — MVP y roadmap

## 8.1 Qué tiene que demostrar el MVP

Un MVP no es "una versión pequeña de todo". Es **el conjunto mínimo que prueba
la hipótesis más arriesgada del proyecto**.

Aquí la hipótesis arriesgada no es la tecnología (sabemos construir esto). Es:

> **¿Es divertido gestionar una aerolínea en un mundo compartido donde la
> competencia son personas reales, en tiempo real 1:1?**

Todo lo que no sirva para responder a eso **se queda fuera del MVP**, por
tentador que sea. El bucle que hay que probar es:

```
abrir ruta → programar vuelos → ver el mapa vivo → volver más tarde →
ganar o perder dinero → entender por qué → ajustar → volver a abrir la app
```

Si ese bucle engancha, todo lo demás (alianzas, carga, accidentes, segunda mano)
lo amplifica. Si no engancha, ninguna de esas cosas lo va a salvar.

## 8.2 Alcance del MVP

### Dentro

**Mundo**
- 1 mundo, **Europa**: ~250 aeropuertos con tráfico comercial real.
- Tiempo real 1:1. Demanda con estacionalidad (verano en Baleares incluido).
- Precio del combustible variable a nivel mundial.

**Aerolínea**
- Creación completa: nombre, códigos IATA/ICAO, país, hub, logo, colores,
  librea, modelo de negocio. 50 M€ iniciales.
- Reputación y puntualidad.

**Flota**
- **10 tipos de avión** (3 regionales, 5 narrowbody, 2 widebody de corto uso).
- Compra y leasing. Venta al mercado del juego (no aún entre jugadores).
- Configuración de cabina en dos clases (economy + business).
- Librea aplicada y visible en el mapa y el perfil.
- Desgaste, condición, checks A/B/C con opción de diferir.

**Red**
- Abrir/cerrar rutas entre aeropuertos reales.
- **Analizador de rutas completo** (doc 07 §7.4) — es la pantalla más importante
  del MVP.
- Programación por plantilla semanal, con validación completa (alcance, pista,
  rotación, turnaround, slot).
- Precio por clase y nivel de servicio.

**Simulación**
- Motor por eventos con `sim_jobs`. Los vuelos siguen con la app cerrada.
- Demanda por gravedad + reparto logit + spill entre competidores reales.
- Retrasos con propagación en red. Cancelaciones.
- Cierres diario y mensual. Ledger completo con P&L por ruta y por avión.

**Mundo online**
- Mapa en vivo con vuelos de todos los jugadores, ficha de vuelo, de aeropuerto
  y de aerolínea.
- Perfil público de aerolínea (app + web).
- Slots con propiedad y regla de uso mínimo (**sin subasta todavía**: compra a
  precio fijo con lista de espera).
- Rankings: pasajeros, rentabilidad, puntualidad, crecimiento.
- Noticias: eventos de mundo, competencia en tus rutas, hitos propios.

**Eventos**
- Meteorología, huelgas, shocks de combustible, picos de demanda.
- Incidentes **de nivel 1 a 3** (retrasos, desvíos, AOG). Trazables y explicados.

**Personal**
- Pools agregados por base: pilotos, tripulación, mecánicos, personal de tierra.
- Restricción real: sin personal suficiente hay cancelaciones.

**Plataformas**
- iOS, Android (Expo) y web (Next.js) desde el primer día, cuenta única.
- Push: aterrizajes agrupados, resumen diario, alertas críticas.

### Fuera del MVP (deliberadamente)

| Recortado | Por qué |
|---|---|
| **Alianzas y codeshare** | requiere una masa de jugadores que aún no existe; multiplica la complejidad del modelo de demanda (itinerarios con conexión) |
| **Incidentes de nivel 4-6** | son el contenido más delicado del juego; se añaden cuando el balance de mantenimiento esté validado con datos reales de jugadores |
| **Carga** | segundo modelo de demanda completo, con su propia red |
| **Mercado de aviones de segunda mano entre jugadores** | necesita economía madura o se convierte en vehículo de abuso |
| **Subasta de slots** | el MVP prueba si los slots crean tensión; la subasta la amplifica después |
| **Múltiples hubs** | fuerza la lógica de conexiones; fase 3 |
| **Mundos múltiples** | uno basta para miles de jugadores; el esquema ya lo contempla |
| **Chat entre jugadores** | moderación y coste sin aportar a la hipótesis central |
| **Monetización** | no se monetiza algo que aún no se sabe si engancha |

> Todos estos recortes son **de alcance, no de arquitectura**. El esquema, el
> `world_id`, el ledger, la cola y el dominio puro los contemplan desde el día
> uno. Añadirlos después es trabajo de producto, no refactorización.

## 8.3 Roadmap

### Fase 0 — Fundaciones (3-4 semanas)

Aburrida, imprescindible y la que decide si las 30 semanas siguientes son
llevables.

- Monorepo (Turborepo), CI, linting, tipado estricto, entornos.
- Esquema Postgres + migraciones + seed de aeropuertos (OurAirports) y tipos de
  avión.
- Esqueleto de `packages/domain`: tipos, distancias geodésicas, PRNG sembrado,
  reloj del mundo.
- Cola `sim_jobs` con `SKIP LOCKED` + worker vacío corriendo en producción.
- Auth (Apple/Google/email), cuentas, JWT.
- **Arnés de simulación** con aerolíneas artificiales. Desde el principio.

**Hito:** un job programado se ejecuta a su hora en producción y sobrevive a un
reinicio del worker.

### Fase 1 — Un solo jugador, mundo real (5-6 semanas)

- Creación de aerolínea (sin el editor de librea: color plano).
- Catálogo de aviones, compra y leasing, ledger completo.
- Rutas, programación semanal, validaciones.
- **Motor de vuelos completo**: despegue → resolución de llegada.
- Demanda con gravedad + logit (funciona con un solo jugador: compite contra
  competidores artificiales predefinidos).
- P&L por ruta y por avión. Cierres diario y mensual.
- Cliente básico: listas, formularios y un mapa sencillo.

**Hito:** se puede jugar una semana entera y perder dinero por una razón
comprensible. Aquí se prueba el balance con el arnés antes que con personas.

### Fase 2 — El mundo vivo (4-5 semanas)

- Mapa completo con clustering, viewport y WebSocket.
- Vuelos de otros jugadores visibles, fichas de vuelo/aeropuerto/aerolínea.
- Perfiles públicos (app + web).
- Slots con propiedad y uso mínimo.
- Eventos de mundo y sistema de noticias.
- Incidentes 1-3, mantenimiento con checks y opción de diferir.
- Personal y su restricción operativa.
- Push notifications.

**Hito:** dos jugadores en la misma ruta se quitan pasajeros de verdad, y ambos
lo ven en su P&L y en el mapa.

### Fase 3 — Beta cerrada (4 semanas + iteración continua)

- 100-300 jugadores invitados en un mundo real.
- Telemetría fina: retención D1/D7/D30, sesiones por día, tiempo hasta la
  primera ruta rentable, distribución de patrimonio, tasa de abandono por
  pantalla.
- **Ajuste de balance semanal** vía `packages/config`, sin desplegar código.
- Onboarding pulido, editor de librea, sistema de diseño terminado.

**Criterios para seguir**: D7 ≥ 25%, sesión media ≥ 6 min, ≥ 3 sesiones/día,
y —lo más importante— **jugadores que vuelven sin que se les notifique**.

### Fase 4 — Profundidad (6-8 semanas)

- Alianzas, codeshare, itinerarios con conexión y prorrateo.
- Segundo hub y estrategia de red.
- Carga.
- Mercado de aviones de segunda mano entre jugadores.
- Subasta de slots.
- Incidentes 4-6, con el tratamiento del doc 06 §6.1.
- Financiación avanzada, ratings, quiebra y reestructuración.

### Fase 5 — Lanzamiento y live-ops (continuo)

- Lanzamiento por regiones, ES/EN.
- Mundos estacionales con reglas variantes.
- Monetización cosmética (doc 05 §5.9).
- Eventos comunitarios, herramientas de moderación, soporte.

**Total hasta beta cerrada: ~16-19 semanas** con un equipo de 2-3 personas.
Hasta lanzamiento público: 7-9 meses.

## 8.4 El orden importa: qué se construye primero y por qué

Si tuviera que defender una sola decisión de este roadmap, es esta:

**El motor de simulación y el modelo de demanda se construyen antes que las
pantallas bonitas.** No porque la UI no importe —importa muchísimo, doc 07— sino
porque:

- Si la economía no funciona, **ninguna interfaz la salva**. El juego será
  precioso y aburrido.
- La economía se puede probar **sin interfaz**, con el arnés de simulación. Es el
  ciclo de iteración más rápido que vamos a tener en todo el proyecto: cambiar un
  coeficiente y ver 12 meses de mundo en 10 segundos.
- La interfaz construida sobre una economía sólida es un trabajo directo. La
  interfaz construida sobre una economía que va a cambiar se tira dos veces.

La excepción, y es importante: **el mapa se hace pronto** (fase 2, no fase 4),
porque es lo único que no se puede validar con números. Hay que verlo, moverlo
en un móvil real y comprobar si produce la sensación de mundo vivo. Si no la
produce, hay que saberlo pronto.

## 8.5 Primeros pasos concretos

Cuando se dé el visto bueno a este diseño, el orden de trabajo inmediato es:

1. **Cerrar las decisiones abiertas** del doc 09 (sobre todo la del nombre de
   los modelos de avión y el tiempo real 1:1).
2. Monorepo y CI.
3. Esquema y seed de datos reales (aeropuertos y tipos de avión).
4. `packages/domain`: geodesia, reloj, PRNG, y las primeras fórmulas de demanda.
5. Arnés de simulación con 200 aerolíneas artificiales sobre Europa.
6. **Iterar el balance hasta que los criterios del doc 04 §4.10 se cumplan**,
   antes de escribir una sola pantalla.
