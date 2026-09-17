# 03 — Sistema de simulación y de vuelos

## 3.1 El reloj del mundo

**Recomendación: tiempo real 1:1.** Un vuelo Palma–Gatwick de 2 h 25 min dura
2 h 25 min de verdad.

Razones:

- Es lo que hace que el mapa signifique algo. Si el tiempo va acelerado ×10,
  abrir la app y "ver tu compañía funcionando" se convierte en ver un hormiguero
  sin relación con el reloj del jugador.
- Encaja con el móvil: el juego es asíncrono por naturaleza. Programas, cierras,
  vuelves y ha pasado algo.
- Hace creíble la franja horaria: los slots de las 07:00 valen más porque en el
  mundo son las 07:00. El horario de tu vuelo importa de verdad.

El riesgo obvio es la lentitud de progresión. Se compensa **sin tocar el reloj**:

- El jugador programa por **plantilla semanal**, no vuelo a vuelo. Configura
  "L-X-V 18:20" una vez y el sistema genera vuelos indefinidamente.
- Los procesos administrativos (entrega de un avión, formación, obras,
  investigación de un incidente) tienen duraciones de **días de juego**, lo que
  da ritmo de largo plazo.
- El *onboarding* regala la primera semana de operación acelerada, para que la
  primera sesión no sea "espera dos horas".

`worlds.time_scale` existe en el esquema para poder abrir mundos experimentales
a ×2 o ×3 sin cambiar una línea de código. Toda conversión de tiempo pasa por
una única función de `packages/domain`; nunca se usa `Date.now()` suelto.

## 3.2 Posición de un avión: cero coste de servidor

La posición es una función pura del reloj, calculada en el dispositivo:

```ts
// packages/domain/src/geo/position.ts
export function flightPosition(f: FlightPlan, now: Date): FlightPosition | null {
  const dep = f.actualDeparture ?? f.scheduledDeparture;
  const arr = f.estimatedArrival;
  if (now < dep) return null;                        // aún en tierra
  if (now >= arr) return { ...atAirport(f.destination), phase: 'arrived' };

  const t = (now - dep) / (arr - dep);               // 0..1

  // interpolación esférica sobre el círculo máximo
  const { lat, lon } = slerp(f.originPos, f.destPos, t);

  return {
    lat, lon,
    heading: initialBearing(f.originPos, f.destPos, t),
    altitude: altitudeProfile(t, f.distanceKm),      // subida / crucero / descenso
    phase: t < 0.08 ? 'climb' : t > 0.88 ? 'descent' : 'cruise',
    progress: t,
  };
}
```

Esto tiene una propiedad que conviene subrayar: **todos los jugadores ven el
avión exactamente en el mismo sitio**, porque todos calculan la misma función
sobre los mismos datos con relojes sincronizados (el cliente ajusta su desfase
contra el servidor al conectar). No hace falta que el servidor difunda
posiciones. No hace falta *nada*.

Lo único que el servidor difunde son **cambios de plan**: despegue confirmado,
retraso, desvío, aterrizaje. Son un puñado de mensajes por vuelo en toda su vida.

## 3.3 Ciclo de vida de un vuelo

```
  PROGRAMACIÓN (acción del jugador o generador de plantillas)
        │  valida: avión libre, alcance, pista, slot, tripulación
        ▼
  ┌─────────────┐
  │  scheduled  │  fila en flights + job flight_departure en sim_jobs
  └──────┬──────┘     (misma transacción: no puede existir uno sin el otro)
         │  ← el job se dispara a la hora de salida
         ▼
  ┌─────────────┐  RESOLUCIÓN DE SALIDA
  │  departed   │  · ¿avión disponible y sano? ¿tripulación? ¿slot?
  └──────┬──────┘  · calcula retraso (meteo, congestión, rotación, personal)
         │         · VENDE EL PASAJE (demanda del mercado, doc 04)
         │         · cobra combustible y tasas
         │         · programa job flight_arrival
         │         · marca aircraft.available_at = llegada + turnaround
         │         · emite evento WS: takeoff
         │
         │  (2h 25min de nada: el servidor no hace absolutamente nada)
         │
         ▼
  ┌─────────────┐  RESOLUCIÓN DE LLEGADA
  │   landed    │  · tirada de riesgo de incidente (doc 06)
  └──────┬──────┘  · liquida ingresos y costes en el ledger
         │         · actualiza horas, ciclos, condición del avión
         │         · actualiza puntualidad y reputación
         │         · libera el avión en el destino
         │         · notificación push si el jugador está ausente
         ▼
   RESUELTO (inmutable)
```

Estados excepcionales: `delayed` (retraso > 15 min), `diverted` (aterriza en
otro aeropuerto, con coste extra y avión fuera de posición — un problema
operativo real que el jugador tiene que arreglar), `cancelled` (sin ingresos,
con costes fijos, con compensaciones y penalización de reputación).

## 3.4 El worker: cómo se procesan los jobs

```ts
// apps/worker/src/loop.ts  (simplificado)
async function tick() {
  const jobs = await db.query(`
    UPDATE sim_jobs SET status = 'running', locked_until = now() + interval '2 min',
                        attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM sim_jobs
      WHERE status = 'pending' AND run_at <= now()
      ORDER BY run_at
      LIMIT 200
      FOR UPDATE SKIP LOCKED          -- ← permite N workers en paralelo
    )
    RETURNING *`);

  for (const job of jobs) {
    try {
      await withTransaction(tx => handlers[job.kind](tx, job.payload));
      await markDone(job);
    } catch (err) {
      await (job.attempts >= 5 ? deadLetter(job, err) : retryWithBackoff(job));
    }
  }
}
```

Propiedades que hay que garantizar sí o sí:

- **Idempotencia.** Cada handler escribe con una `idempotency_key`
  determinista. Reprocesar un job no duplica ingresos.
- **Atomicidad.** La resolución entera (pasajeros + ledger + avión + estado)
  ocurre en una transacción. No existe "medio aterrizaje".
- **Recuperación.** Si el worker muere 40 minutos, al volver encuentra los jobs
  vencidos y los procesa **en orden de `run_at`**, no de `now()`. El mundo se
  pone al día con los valores correctos, no con los de 40 minutos después.
- **Backpressure.** Si la cola acumula retraso se escala horizontalmente (más
  réplicas del worker). El `SKIP LOCKED` hace que eso funcione sin coordinación.

### Resolución perezosa (defensa en profundidad)

Si un jugador abre la app y consulta un vuelo cuyo `scheduled_arrival` ya pasó
pero sigue sin resolver, la API resuelve **ese vuelo** en el acto (tomando un
lock por `flight_id`) antes de responder. El jugador nunca ve un avión
"atascado en el aire", aunque el worker vaya con retraso. Como los handlers son
idempotentes, no hay conflicto si el worker llega después.

## 3.5 Validaciones al programar un vuelo

Todo en servidor. El cliente muestra las mismas comprobaciones en tiempo real
usando `packages/domain`, pero su veredicto no vale nada.

| Comprobación | Regla |
|---|---|
| Avión disponible | `aircraft.available_at <= salida` y `status in (idle, scheduled)` |
| Alcance | `distancia × 1.06 (desvío por rutas) ≤ range_km` ajustado por carga de pago |
| Pista | `longest_runway_ft` de ambos aeropuertos `≥ min_runway_ft` del tipo |
| Slot | slot poseído en la franja, en origen y en destino |
| Toque de queda | despegue/llegada fuera de `curfew_start..curfew_end` |
| Tripulación | el pool de la base cubre la rotación, con el type rating correcto |
| Mantenimiento | el vuelo no cruza el umbral del próximo check obligatorio |
| Rotación | el avión llega a tiempo del vuelo anterior + turnaround |

El fallo de cualquiera se devuelve como un error **explicado y accionable**
(`"El A20N EC-BLA no llega: aterriza en PMI a las 18:05 y necesita 35 min de
turnaround"`), no como un `400 Bad Request`. En un juego de gestión, la calidad
de los mensajes de error *es* diseño de juego.

## 3.6 Duración de vuelo, combustible y retrasos

```ts
export function blockTime(distanceKm: number, type: AircraftType): Minutes {
  const taxiOut = 12, taxiIn = 7;
  const climbDescentPenalty = 14;           // no se vuela a velocidad de crucero todo el rato
  const airborne = (distanceKm * 1.06) / type.cruiseSpeedKmh * 60;
  return taxiOut + climbDescentPenalty + airborne + taxiIn;
}

export function fuelBurn(f: FlightPlan, type: AircraftType, load: number): Kg {
  const hours = blockTime(f.distanceKm, type) / 60;
  const weightFactor = 0.82 + 0.18 * load;   // ir lleno consume más
  const taxiFuel = type.fuelBurnKgHour * 0.2;
  return type.fuelBurnKgHour * hours * weightFactor + taxiFuel;
}
```

**Retraso de salida** — suma de fuentes, cada una explicable al jugador:

```ts
delay = rotationDelay          // el avión anterior llegó tarde (propagación en red)
      + congestionDelay        // ocupación del aeropuerto en esa franja
      + weatherDelay           // world_events activos en origen/destino
      + technicalDelay         // f(condición del avión, checks diferidos)
      + crewDelay              // falta de tripulación disponible
```

La **propagación de retrasos** merece énfasis: es lo que convierte la
programación en un problema interesante. Apretar las rotaciones al máximo
maximiza la utilización de la flota (y el beneficio teórico) pero un retraso
matinal en PMI arrastra los cinco vuelos siguientes del mismo avión y destroza
la puntualidad del día. Esa tensión —utilización contra robustez— es un dilema
real de la industria y aquí sale gratis: emerge del modelo, no hay que
programarla como mecánica.

## 3.7 Mantenimiento

Cada aterrizaje actualiza el avión:

```ts
aircraft.flightHours += blockTime / 60;
aircraft.cycles      += 1;

// El desgaste es más rápido en vuelos cortos: los ciclos castigan más que las horas.
const wear = hours * 0.010 + 1 * 0.020 + harshConditionsPenalty;
aircraft.condition = clamp(aircraft.condition - wear, 0, 100);
```

Checks progresivos, con avión fuera de servicio durante días de juego:

| Check | Cada | Duración | Coste orientativo (narrowbody) | Recupera |
|---|---|---|---|---|
| A | 600 h | 1 día | 12.000 € | +8 condición |
| B | 3.000 h | 3 días | 45.000 € | +20 |
| C | 12.000 h | 14 días | 380.000 € | +45 |
| D | 24.000 h / 6 años | 45 días | 2.100.000 € | restaura a ~95 |

**Se puede diferir un check.** Ahorra dinero y mantiene el avión volando hoy;
a cambio multiplica la probabilidad de incidente y de AOG (*aircraft on ground*,
avería imprevista que cancela vuelos en cadena). Es una de las decisiones más
interesantes del juego y el motivo por el que existe el sistema de riesgo: no
para castigar, sino para darle peso a una decisión que si no sería obvia.

La fiabilidad efectiva de un avión combina cuatro factores:

```ts
reliability = type.baseReliability
            * (0.72 + 0.28 * condition / 100)
            * ageFactor(builtYear)            // decae lentamente tras 15 años
            * maintenanceComplianceFactor;    // checks diferidos penalizan fuerte
```

## 3.8 Cierres programados

Además de los vuelos, el worker procesa jobs de calendario:

| Job | Frecuencia | Qué hace |
|---|---|---|
| `demand_refresh` | diario (04:00 UTC por mundo) | recalcula demanda base por par O&D con estacionalidad y eventos |
| `daily_close` | diario | nómina, overhead, tasas de slots, reconciliación de `cash`, agregados |
| `monthly_close` | mensual | leasing, seguros, depreciación, consolidación de P&L, ratings |
| `world_event_tick` | cada 3 h | genera y caduca eventos de mundo (meteo, huelgas, shocks) |
| `rankings_rebuild` | cada 6 h | reconstruye ligas y cuotas de mercado |
| `market_refresh` | diario | oferta de aviones nuevos/usados y precio del combustible |

Todos escalonados por mundo para que 20 shards no cierren el mismo segundo.
