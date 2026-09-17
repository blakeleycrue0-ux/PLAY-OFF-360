# 06 — Eventos, incidentes y noticias

## 6.1 Principio de tratamiento

El sistema de incidentes existe por una razón de diseño concreta: **dar peso a
la decisión de mantenimiento**. Sin riesgo, diferir un check C es gratis y la
decisión desaparece. Con riesgo, es el dilema más interesante del juego.

Por tanto se modela como **un evento operativo y económico**, nunca como
espectáculo. Reglas firmes:

- **Registro de nota de prensa o boletín técnico.** Nunca narrativa dramática.
- **Sin descripción de daños a personas.** El juego no menciona heridos ni
  víctimas, ni en texto ni en cifras. La consecuencia se expresa en aeronave,
  operación, dinero y reputación.
- **Sin representación gráfica del suceso.** Ninguna animación, ninguna imagen,
  ningún efecto sonoro. Un aviso en la bandeja de alertas, una ficha con datos y
  una noticia sobria.
- **Sin referencias a sucesos reales.** Ni fechas, ni números de vuelo, ni
  aerolíneas reales, ni patrones reconocibles de accidentes reales.
- **Muy infrecuente.** Un accidente debe ser algo de lo que se habla en el mundo
  durante semanas, no un evento de martes.

Ejemplo del tono exacto que se busca:

> **Blake Airways — comunicado operativo**
> El vuelo BLA204 (Palma–Londres Gatwick) ha regresado a Palma tras detectarse
> una indicación anómala en el sistema hidráulico. La aeronave EC-BLA queda
> fuera de servicio a la espera de inspección. Los pasajeros han sido
> reubicados en vuelos posteriores.
>
> *Aeronave: AOG, 6 días · Coste estimado: 184.000 € · Reputación: −2,1*

## 6.2 Escala de severidad

| Nivel | Tipo | Frecuencia orientativa | Consecuencia |
|---|---|---|---|
| 1 | Retraso operativo | muy común | minutos de retraso, puntualidad |
| 2 | Retorno / desvío | ocasional | combustible extra, avión fuera de posición, compensaciones |
| 3 | Avería en tierra (AOG) | poco común | avión parado días, cadena de cancelaciones |
| 4 | Incidente técnico en vuelo | raro | inspección obligatoria, reputación, expediente |
| 5 | Incidente grave | muy raro | avión fuera meses, investigación, seguros, demanda afectada |
| 6 | Accidente | **extremadamente raro** | pérdida de la aeronave, investigación larga, impacto mayor |

Referencia de calibración: un accidente de nivel 6 debería aparecer en el orden
de **una vez cada varios millones de vuelos** en el mundo entero, y de forma
fuertemente sesgada hacia flotas descuidadas. Un jugador prudente puede jugar
años sin ver ninguno; un jugador que sistemáticamente difiere mantenimiento
debería verlo venir.

## 6.3 Cálculo de la probabilidad

Modelo de riesgo multiplicativo, todo trazable:

```ts
// packages/domain/src/risk/incident.ts
export function incidentHazard(f: Flight, ac: Aircraft, ctx: RiskContext) {
  let h = cfg.baseHazardPerFlight;                     // p.ej. 2.5e-3 (cualquier nivel)

  // Estado del material
  h *= lerp(2.6, 0.55, ac.condition / 100);            // condición 0 → ×2.6
  h *= 1 + 0.09 * ac.deferredChecks ** 1.6;            // diferir castiga fuerte
  h *= ageFactor(ac.builtYear);                        // ×1.4 a los 25 años

  // Entorno
  h *= weatherFactor(ctx.weatherSeverity);             // hasta ×2.2
  h *= airportFactor(f.destination);                   // pista corta, orografía

  // Factor humano
  h *= lerp(1.5, 0.75, ctx.crewSkill / 100);
  h *= 1 + 0.4 * ctx.crewFatigue;                      // rotaciones apretadas
  h *= lerp(1.3, 0.85, ctx.maintStaffRatio);           // mecánicos por avión

  // Suelos y techos: ni imposible ni inevitable
  return clamp(h, cfg.minHazard, cfg.maxHazard);
}

export function rollIncident(f: Flight, ac: Aircraft, ctx: RiskContext) {
  const rng = seededRng(world.seed, f.id, 'incident');
  if (rng() > incidentHazard(f, ac, ctx)) return null;

  // Ocurre algo. La severidad se decide después, muy sesgada a lo leve.
  const severity = weightedPick(rng, cfg.severityWeights, riskProfile(ac, ctx));
  return buildIncident(severity, f, ac, ctx, rng);
}
```

Salvaguardas de equidad, tan importantes como la fórmula:

- **Suelo y techo.** Nunca 0 (la mala suerte existe) ni cerca de 1 (nada es
  inevitable).
- **Piedad (*pity*)**: tras un incidente de nivel ≥4, cooldown de N días de
  juego con riesgo reducido para esa aerolínea. Dos catástrofes seguidas sobre
  el mismo jugador se perciben como un juego roto, aunque sean estadísticamente
  legítimas.
- **Protección de novatos**: los niveles 5-6 se desactivan durante los primeros
  30 días de juego de una aerolínea.
- **Trazabilidad total**: `incidents.cause_factors` guarda las entradas exactas.
  El jugador ve *por qué* y qué podría haber hecho distinto.
- **Aviso previo**: la app avisa antes (`"3 aviones con condición <45% y checks
  diferidos: riesgo elevado"`). El jugador nunca debe sentirse emboscado.

## 6.4 Consecuencias

```ts
consequences = {
  aircraftStatus: 'aog' | 'grounded' | 'written_off',
  repairDays, repairCost,
  investigationDays,                     // durante la investigación: escrutinio
  compensationCost,                      // pasajeros afectados
  cancelledFlights,                      // cadena sobre la programación
  reputationDelta,                       // se recupera en semanas/meses
  safetyRatingDelta,
  insurancePremiumMultiplier,            // sube y tarda en bajar
  demandPenalty: { routes, durationDays } // el mercado tarda en olvidar
}
```

El coste de un incidente grave está diseñado para ser **doloroso pero no
terminal** para una compañía sana, y **potencialmente terminal** para una que ya
operaba al límite. Exactamente el incentivo que queremos.

## 6.5 Eventos de mundo

Estos son los que hacen que el mundo compartido se sienta compartido: no le pasan
a un jugador, le pasan a **una región**.

| Evento | Ámbito | Efecto | Duración |
|---|---|---|---|
| Tormenta / temporal | aeropuertos | retrasos, cancelaciones, +riesgo | 6-48 h |
| Huelga de controladores | país | capacidad de slots −40%, cancelaciones | 1-3 días |
| Huelga de handling | aeropuerto | turnaround +25 min, retrasos | 1-2 días |
| Cierre de espacio aéreo | región | rutas bloqueadas, desvíos largos | horas-semanas |
| Ceniza volcánica | región | cierre severo | 2-7 días |
| Shock del combustible | global | precio +20-40% | semanas |
| Recesión / auge | global o país | demanda business ∓25% | meses |
| Gran evento (feria, campeonato) | ciudad | demanda ×2-4 hacia ese destino | días |
| Temporada alta | región | estacionalidad reforzada | meses |
| Ampliación de aeropuerto | aeropuerto | +slots, +capacidad | permanente |
| Nueva normativa | global | +coste por emisiones o ruido | permanente |

Generados por `world_event_tick` (cada 3 h) con probabilidades que dependen de
la estación y la región, y con **preaviso cuando es realista**: una tormenta se
anuncia 24 h antes y el jugador puede reprogramar. Una huelga se anuncia con 48 h.
Esto convierte un evento aleatorio en una **decisión**, que es siempre mejor
diseño que un impuesto sorpresa.

## 6.6 Sistema de noticias

Las noticias no son texto decorativo: son la **interfaz del estado del mundo**.
Son una proyección del `event_log`, no una tabla escrita a mano.

```
event_log / incidents / world_events / market
                    │
                    ▼  plantillas + reglas de relevancia
              news_items
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
   global      regional       tu aerolínea
```

**Ámbitos y ejemplos:**

- **Global** — `"El queroseno sube un 18% tras la interrupción del suministro en
  el Golfo. Las aerolíneas de largo radio ajustan sus tarifas."`
- **Regional** — `"Fuertes tormentas provocan retrasos generalizados en los
  aeropuertos del norte de Europa. AMS, FRA y CPH operan al 60% de capacidad."`
- **Competencia** — `"Nordwing inaugura Oslo–Palma con tres frecuencias
  semanales, entrando en un mercado dominado por Blake Airways."`
- **Tu aerolínea** — `"Blake Airways supera el millón de pasajeros anuales."`
- **Rankings** — `"Adria Connect adelanta a Blake Airways en el ranking europeo
  de puntualidad."`

**Feed personalizado** = noticias globales (importancia ≥4) + todo lo de tu
aerolínea + lo de aeropuertos donde operas + movimientos de competidores en tus
rutas + tu alianza. Ordenado por relevancia calculada, no solo por fecha.

**Generación de texto**: plantillas con variables e i18n, no un LLM. Motivos:
coste cero, determinismo, traducible, sin riesgo de que el juego publique algo
inapropiado sobre un incidente. El tono es de agencia de noticias sobria.

**Efecto de vuelta**: una noticia de importancia 5 sobre una aerolínea modifica
su `demandPenalty` o `reputation`. El ciclo se cierra: el mundo genera noticias,
y las noticias modifican el mundo.

## 6.7 Notificaciones push

El bucle de retención del juego. Con criterio, porque se abusa muy fácil:

| Notificación | Cuándo |
|---|---|
| `"Tu vuelo BLA204 ha aterrizado en Londres Gatwick. +12.480 €"` | resumen agrupado, no uno por vuelo |
| `"Resumen del día: 42 vuelos, 7.104 pasajeros, +55.333 €"` | una vez al día, hora elegida por el jugador |
| `"EC-BLA necesita un check C en 40 horas de vuelo"` | alerta accionable |
| `"Nordwing ha abierto Oslo–Palma"` | competencia en tus rutas |
| `"Tu aerolínea tiene caja para 11 días"` | alerta crítica |
| `"Subasta de slot en LGW 08:00 — quedan 4 h"` | oportunidad con plazo |

Regla: **como máximo 3 notificaciones al día por defecto**, con control granular.
Una app de gestión que notifica de más se desinstala.
