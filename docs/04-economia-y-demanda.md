# 04 — Economía y demanda

Este es el documento más importante. La economía es lo que separa un juego de
gestión de un clicker con aviones. El objetivo de diseño es explícito:

> **Debe ser posible tener 200 aviones y perder dinero todos los días.**
> Y debe ser posible ganar con 6 aviones bien puestos.

## 4.1 Demanda: modelo de gravedad

Cada par origen-destino (O&D) tiene una demanda base diaria, independiente de
quién la sirva. Se calcula con un **modelo de gravedad**, que es lo que usa la
planificación aeronáutica real: el tráfico entre dos ciudades crece con su
tamaño y decae con la distancia.

```ts
// packages/domain/src/demand/base.ts
export function baseDemand(o: Airport, d: Airport, date: Date, cfg: Config) {
  const size = Math.pow(o.marketWeight, 0.68) * Math.pow(d.marketWeight, 0.68);
  const dist = distanceKm(o, d);

  // Decaimiento: muy corto no compite con el coche; muy largo pierde mercado.
  const distanceDecay = dist < 350
    ? 0.25 + 0.75 * (dist / 350)            // penaliza rutas absurdamente cortas
    : Math.pow(dist / 1000, -0.42);

  let demand = cfg.k * size * distanceDecay;

  // Fricciones reales
  demand *= o.country === d.country ? 1.35 : 1.0;      // doméstico viaja más
  demand *= sameBloc(o, d) ? 1.18 : 0.88;              // Schengen / visados
  demand *= languageOrCulturalTies(o, d);              // ES↔AR, UK↔IE…

  // Estacionalidad: aquí es donde Mallorca explota en verano
  demand *= seasonality(o, d, date);                   // PMI julio ≈ ×2.6
  demand *= dayOfWeekProfile(o, d, date);              // business: L y J pico
  demand *= worldEventModifier(o, d, date);            // huelgas, ferias, tormentas

  return splitBySegment(demand);   // { business, leisure, vfr }
}
```

La segmentación importa porque cada segmento se comporta distinto:

| Segmento | Sensibilidad al precio | Al horario | A la frecuencia | Paga business |
|---|---|---|---|---|
| **Business** | baja (−0.8) | **muy alta** | **muy alta** | sí |
| **Ocio** | **muy alta** (−1.9) | media | baja | rara vez |
| **VFR** (visita a familiares) | alta (−1.5) | baja | baja | no |

Consecuencia de diseño: PMI–LGW en agosto es un mercado de ocio enorme y
tremendamente sensible al precio (una guerra de precios ahí es suicida para
todos), mientras que LHR–FRA es pequeño en comparación pero paga tarifas altas
si ofreces cuatro frecuencias diarias a horas útiles. **Dos estrategias
completamente distintas, ninguna dominante.** Eso es lo que buscamos.

## 4.2 Reparto entre competidores: modelo logit

Aquí está la respuesta a *"quiero evitar que gane quien tenga más dinero"*.

La demanda de un O&D **no se reparte por orden de llegada ni por capacidad**.
Cada oferta (cada vuelo de cada aerolínea) recibe una *utilidad*, y la cuota es
proporcional a su exponencial — un **logit multinomial**, el estándar de la
industria para elección de transporte.

```ts
// packages/domain/src/demand/allocation.ts
export function utility(opt: FlightOption, seg: Segment, mkt: MarketContext) {
  const b = COEF[seg];

  return (
      b.price      * Math.log(opt.price / mkt.referencePrice)   // negativo
    + b.timeOfDay  * timeOfDayScore(opt.departureLocal, seg)
    + b.frequency  * Math.log(1 + opt.weeklyFrequency)          // rendimiento decreciente
    + b.reputation * (opt.airline.reputation / 100)
    + b.punctual   * (opt.airline.onTimeRate / 100)
    + b.product    * cabinQualityScore(opt.config, opt.serviceLevel, seg)
    + b.loyalty    * hubLoyalty(opt.airline, mkt.origin)        // ventaja del incumbente
    + b.alliance   * allianceBonus(opt.airline, seg)
    - b.stops      * opt.stops                                  // directo gana al de conexión
  );
}

export function allocate(options: FlightOption[], demand: number, seg: Segment) {
  const u = options.map(o => Math.exp(utility(o, seg, mkt)));
  const total = u.reduce((a, b) => a + b, 0) + Math.exp(NO_FLY_UTILITY);
  //                                            ↑ opción "no viajar / tren / coche"
  return options.map((o, i) => demand * u[i] / total);
}
```

### Por qué esto cambia el juego

1. **La capacidad no crea demanda.** Si pones un segundo avión en una ruta que
   ya cubres, tu cuota sube poco (logaritmo en la frecuencia) pero tus asientos
   se duplican: el load factor se hunde y pierdes dinero. El jugador rico que
   compra 50 aviones y los tira a las mismas rutas **quiebra**, no gana.
2. **La opción "no volar" está en el denominador.** Si todos suben precios, la
   gente simplemente no viaja. No se puede exprimir un mercado indefinidamente.
3. **Ser barato no basta.** Un `−1.9` de elasticidad en ocio es brutal, pero
   `b.timeOfDay`, `b.punctual` y `b.reputation` significan que un operador serio
   y puntual gana dinero a precios superiores. **Hay más de una forma de ganar.**
4. **Escala mal para el jugador enorme.** La lealtad al hub premia al que está
   establecido, pero la elasticidad y los slots finitos ponen un techo natural.

### Derrame (spill) y recaptura

Si la demanda asignada a una oferta supera sus asientos, el excedente no se
pierde: **se derrama** hacia el resto de opciones, re-normalizando el logit sin
la opción llena. Lo que sobra tras esa segunda pasada se pierde de verdad
(demanda espontánea no atendida).

Esto produce un comportamiento emergente muy bueno: cuando un jugador grande
llena sus aviones, los rivales pequeños de la misma ruta **empiezan a ganar
dinero**. El mercado se autorregula y los nichos existen.

## 4.3 Precios y tarifas

Existe un **precio de referencia** por ruta y clase, función de la distancia y
del tipo de mercado. No es un tope: es el ancla de la elasticidad.

```ts
referencePrice(distanceKm, segment) =
    cfg.fareBase[segment]
  + cfg.farePerKm[segment] * Math.pow(distanceKm, 0.87);   // cóncavo: coste/km baja con distancia
```

El jugador fija el precio libremente. Cobrar el doble del de referencia es
legal, pero `b.price * log(2)` le hunde la utilidad y se queda sin pasajeros.
Cobrar la mitad llena el avión y probablemente pierde dinero en cada asiento.

**Ingresos auxiliares** (equipaje, asiento, catering, prioridad): un modelo
low-cost puede cobrar tarifa base baja y recuperar 18-30 € por pasajero en
extras, a cambio de una pequeña penalización en `cabinQualityScore`. Es la
mecánica que hace que "low-cost" sea una estrategia de verdad y no un adjetivo.

## 4.4 Costes

```ts
export function flightCost(f: Flight, ac: Aircraft, t: AircraftType, w: World) {
  const hours = blockTime(f.distanceKm, t) / 60;

  const fuel      = fuelBurn(f, t, load) * w.fuelPricePerKg;   // ← precio mundial variable
  const crew      = (t.crewCockpit * PILOT_HOURLY + cabinCrew(f) * CABIN_HOURLY) * hours;
  const maint     = t.maintCostHour * hours * conditionPenalty(ac.condition);
  const landing   = f.destAirport.landingFeeBase * (t.mtowKg / 1000);
  const paxFees   = f.paxTotal * (f.destAirport.paxFee + f.origAirport.paxFee);
  const handling  = f.origAirport.handlingFee + f.destAirport.handlingFee;
  const navigation= f.distanceKm * NAV_FEE_PER_KM * Math.sqrt(t.mtowKg / 50000);
  const catering  = f.paxTotal * cateringCost(f.route.serviceLevel);

  return { fuel, crew, maint, landing, paxFees, handling, navigation, catering };
}
```

Y **costes que no dependen de volar** (los que arruinan a los ambiciosos):

| Coste fijo | Cuándo | Comentario |
|---|---|---|
| Leasing | mensual, por avión | se paga vuele o no vuele |
| Nómina | diaria | plantilla completa, haya o no operación |
| Tasas de slots | anual, prorrateada | pagas por tener el slot aunque no lo uses |
| Seguros | mensual | sube con el historial de incidentes |
| Overhead corporativo | diario | crece con el tamaño de la compañía |
| Depreciación | mensual | no es caja, pero destruye el valor de los aviones propios |

Un avión **parado** en tierra cuesta ~40.000 €/mes de leasing + su parte de
nómina + seguros, y genera cero. Por eso la utilización de la flota (horas
voladas al día) es la métrica reina: el juego premia al que hace volar cada
avión 11 horas diarias con rotaciones inteligentes, no al que tiene más aviones.

## 4.5 Combustible: la variable que mueve el mundo

`worlds.fuel_price_per_kg` sigue un proceso estocástico con reversión a la media
y shocks:

```ts
next = mean + (current - mean) * 0.94 + normal(0, sigma) + shockFromEvents();
```

Sube un 35% durante una crisis: las rutas largas de bajo margen pasan a pérdidas
para *todos* los jugadores a la vez; los que tienen flota moderna y eficiente
sufren menos. Es un evento macro que crea conversación en la comunidad y
recompensa haber invertido en aviones caros pero eficientes. También es una
palanca de *live-ops* excelente.

## 4.6 Compra contra leasing

| | Compra | Leasing |
|---|---|---|
| Desembolso inicial | 100% del precio (o entrada + deuda) | depósito de 2-3 mensualidades |
| Coste mensual | mantenimiento y depreciación | cuota fija + mantenimiento |
| Balance | activo revalorizable/depreciable | pasivo, sin activo |
| Salida | vender (mercado de segunda mano, lleva días) | devolver al acabar, con penalización si es antes |
| Cuándo conviene | flota estable y madura, con caja | crecimiento rápido, probar tipos nuevos, estacionalidad |

El **mercado de segunda mano entre jugadores** (fase 3) es una de las mejores
mecánicas sociales posibles aquí: precios reales fijados por la oferta y la
demanda del mundo, aviones con historial de horas y condición visible, y una
razón para hablar con otros jugadores que no es combate.

## 4.7 Financiación

Préstamos con tipo de interés en función de `credit_rating`, que se calcula
desde el ledger (ratio deuda/EBITDA, liquidez, historial de impagos).

Esto crea el ciclo clásico y muy satisfactorio: pides deuda para crecer → creces
→ mejora tu rating → financiación más barata → creces más. Y el ciclo inverso,
la espiral de la muerte, que debe ser posible: sobreexpansión → márgenes
negativos → rating cae → intereses suben → tienes que vender aviones.

**Quiebra**: no se elimina la cuenta. La aerolínea entra en *reestructuración*:
se devuelven los aviones arrendados, se cierran rutas, se liberan slots (que
vuelven al mercado, lo cual afecta a los demás jugadores) y se reinicia con una
flota mínima conservando el nombre y parte de la reputación. Perder tiene que
doler sin expulsar a nadie del juego.

## 4.8 Reputación

```ts
reputation += w1 * (onTimeRate - 80) / 100
            + w2 * (loadFactorSatisfaction)        // ni vacío ni siempre overbooking
            + w3 * (serviceLevel - expected)
            - w4 * cancellationRate
            - w5 * incidentImpact                  // decae con el tiempo
            - w6 * (fleetAge > 18 ? penalty : 0);
```

Se mueve **lentamente** (media móvil de 30 días de juego): no se puede comprar
con dinero, se gana operando bien durante meses. Por eso `b.reputation` en el
logit es un foso defensivo real para el jugador veterano, y por eso una
catástrofe operativa duele durante mucho tiempo.

## 4.9 P&L: la pantalla que define el juego

Como todo movimiento está en `ledger_entries` con `route_id`, `aircraft_id` y
`flight_id`, se puede mostrar sin esfuerzo lo que importa:

```
RUTA PMI → LGW                                    últimos 30 días
─────────────────────────────────────────────────────────────────
Vuelos operados                 42        Load factor      86,4 %
Pasajeros                    7.104        Yield         88,20 €

INGRESOS                                              626.573 €
  Billetes                     583.104 €
  Auxiliares                    38.469 €
  Carga                          5.000 €

COSTES                                               −571.240 €
  Combustible                 −218.400 €   ← 38% · el precio subió un 12%
  Tripulación                  −96.180 €
  Mantenimiento                −71.400 €
  Tasas aeroportuarias        −108.780 €   ← LGW es caro
  Handling y catering          −46.480 €
  Slots (prorrateo)            −30.000 €

RESULTADO                                              +55.333 €
Margen 8,8 %  ·  Beneficio por vuelo 1.317 €
```

Y el contrapunto que hace el juego interesante:

```
⚠ 3 de tus 14 rutas destruyen valor. BCN→CDG pierde 890 €/vuelo desde que
  Iberia-jugador bajó a 59 €. Opciones: bajar frecuencia · cambiar a un
  avión de 76 plazas · cerrar y mover el slot a PMI→AMS.
```

Ese aviso no es un detalle de UI: es el juego entero.

## 4.10 Cómo se valida que esto funciona

Con el arnés de simulación de §1.7: 500 aerolíneas artificiales con estrategias
distintas corriendo 12 meses de juego en segundos. Criterios de aprobación:

- Ninguna estrategia supera el 40% de las 100 primeras posiciones.
- La distribución de patrimonio no es exponencial pura (que el líder tenga 500×
  el mediano significa que el juego está roto).
- Entre el 10% y el 20% de las aerolíneas artificiales tienen pérdidas: si nadie
  pierde, no hay juego; si pierde el 60%, es frustrante.
- El load factor medio del mundo se estabiliza entre 75% y 85%.
- Existen rutas rentables sin explotar durante todo el año (hay sitio para nuevos
  jugadores).
