# 09 — Riesgos y decisiones abiertas

## 9.1 Riesgos que pueden hundir el proyecto

Ordenados por probabilidad × daño, no por gravedad teórica.

### 1. El mundo vacío (el más peligroso)

Un mundo compartido con 40 jugadores no se siente como un mundo compartido: se
siente como un simulador solitario con un mapa triste. Y es exactamente el
estado en el que arranca **todo** juego de este tipo.

**Mitigación:**
- Poblar el mundo con **aerolíneas artificiales creíbles** desde el día uno, que
  operan rutas coherentes, compiten en el logit, tienen perfil público y salen
  en el mapa. Se van retirando de las rutas a medida que entran humanos.
- Arranque por **cohortes**: no abrir un mundo hasta tener 200 jugadores en lista
  de espera, y meterlos el mismo día.
- Mundo **geográficamente reducido** (Europa) en el MVP: 300 jugadores en Europa
  se notan; 300 jugadores en el planeta entero, no.

### 2. Balance económico roto

Muy fácil de provocar y muy difícil de detectar sin herramientas. Síntomas: una
estrategia domina, nadie pierde nunca, o todo el mundo quiebra en la semana 3.

**Mitigación:** el arnés de simulación de §1.7 desde la fase 0, con los criterios
de aceptación del doc 04 §4.10 en CI. Si un cambio de configuración rompe un
criterio, falla el build.

### 3. Progresión demasiado lenta en tiempo real 1:1

El riesgo directo de la decisión de §3.1. Si la primera sesión son 20 minutos y
luego "vuelve en tres horas", muchos no vuelven.

**Mitigación:** primera semana acelerada en el onboarding, plantillas semanales
en vez de vuelo a vuelo, procesos administrativos que dan ritmo, y objetivos
diarios cortos. **Y medirlo en la beta**: si el D1 es malo, `worlds.time_scale`
existe precisamente para poder cambiar de opinión sin reescribir nada.

### 4. Rendimiento del mapa en móviles modestos

Es la pantalla insignia y la más cara. 800 aviones a 60 fps en un Android de
gama media de 2021 no sale gratis.

**Mitigación:** probarlo con datos sintéticos en **fase 0**, en un dispositivo
real barato, antes de construir nada encima. Degradación configurable (menos
aviones dibujados antes que menos fps).

### 5. Complejidad que espanta al jugador nuevo

El diseño pide mucha profundidad. La profundidad sin capas de aprendizaje es un
muro.

**Mitigación:** la progresión por fases del doc 07 §7.6 desbloquea mecánicas
gradualmente. El jugador de fase 1 no ve slots, ni checks C, ni type ratings.
Valores por defecto sensatos en todo, y las alertas accionables como profesor.

### 6. Coste de infraestructura por jugador

Si cada jugador cuesta más de lo que va a aportar nunca, no hay negocio.

**Mitigación:** la arquitectura por eventos es justamente la respuesta (doc 01
§1.2). Un jugador inactivo cuesta casi cero. Objetivo a vigilar desde la beta:
**< 0,10 €/jugador activo/mes** en infraestructura.

### 7. Propiedad intelectual

Nombres y siluetas de fabricantes y modelos de avión son marcas registradas.
Nombres de aerolíneas reales, también. Este repositorio ya tuvo que cambiar
nombres reales por ficticios en un proyecto anterior.

**Mitigación:** designaciones y siluetas propias desde el principio (es mucho más
barato que rehacerlo tras el lanzamiento), filtro de nombres de aerolínea y
códigos IATA reservados en el registro, y moderación de logos reportables. Los
datos de **aeropuertos** son hechos y no plantean el mismo problema; OurAirports
es de dominio público.

### 8. Moderación de contenido generado

Nombres de aerolíneas, logos y nombres de aviones son campos libres visibles
para todos los jugadores.

**Mitigación:** lista de bloqueo + sistema de reporte + cola de moderación en el
back-office desde el MVP. No es opcional en un producto con perfiles públicos.

## 9.2 Decisiones abiertas

Son las que necesito que decidas o confirmes antes de empezar a construir.

| # | Decisión | Opciones | Mi recomendación |
|---|---|---|---|
| 1 | **Velocidad del tiempo** | 1:1 · ×2 · ×4 | **1:1**, con `time_scale` listo para cambiar tras la beta |
| 2 | **Nombres de aviones** | reales · inventados · reales con licencia | **inventados** con familias reconocibles; decisión barata ahora, carísima después |
| 3 | **Alcance geográfico del MVP** | Europa · global | **Europa** (~250 aeropuertos): mundo denso desde el primer día |
| 4 | **Aerolíneas artificiales** | sí · no | **sí**, imprescindibles para el arranque (riesgo nº 1) |
| 5 | **Una o varias aerolíneas por cuenta** | una por mundo · varias | **una por mundo**, varias cuando haya más mundos |
| 6 | **Monetización** | cosmética · con ventajas · suscripción | **cosmética + comodidad**; si se cruza esa línea, el doc 04 deja de importar |
| 7 | **Nombre del producto** | — | pendiente; el repositorio se llama `PLAY-OFF-360` por el proyecto anterior |
| 8 | **Idiomas de lanzamiento** | ES · ES+EN | **ES+EN** desde el MVP; el coste de añadirlo después es mayor |
| 9 | **Proveedor de base de datos** | Supabase · Neon · RDS | **Supabase** para empezar (auth y realtime resueltos), migrable |
| 10 | **Prioridad de plataforma** | móvil primero · web primero | **web primero para desarrollar** (iterar es 5× más rápido), móvil primero para lanzar |

## 9.3 Lo que hay que medir desde el primer día

Si no se instrumenta en la fase 0, en la beta se navega a ciegas.

**Producto**
- Retención D1 / D7 / D30 · sesiones por día · duración de sesión
- Tiempo hasta la primera ruta abierta y hasta la primera ruta rentable
- Abandono por pantalla del onboarding
- Fracción de jugadores en pérdidas y su evolución

**Equilibrio del mundo**
- Distribución de patrimonio (Gini) · load factor medio · margen medio
- Concentración de rutas (¿hay sitio para nuevos?)
- Ocupación de slots en los 20 aeropuertos principales
- Diversidad de estrategias entre el top 100

**Técnico**
- Retraso de la cola `sim_jobs` (alerta si > 60 s) — es el indicador de salud
  más importante del sistema
- p95 de la consulta de mapa · fps en el mapa por gama de dispositivo
- Divergencias entre `airlines.cash` y el ledger (debe ser **cero**, siempre)
- Coste de infraestructura por jugador activo

## 9.4 Lo que NO hay que hacer

Anti-patrones concretos para este proyecto:

- ❌ **Un bucle que mueva aviones cada segundo.** Funciona en el prototipo, no
  escala, y para cuando se nota ya está por todas partes.
- ❌ **`UPDATE airlines SET cash = cash - X`.** Todo pasa por el ledger. Sin
  excepciones, ni siquiera "solo para esta cosa pequeña".
- ❌ **Fórmulas de juego duplicadas en cliente y servidor.** Una sola
  implementación en `packages/domain`.
- ❌ **Números mágicos en el código.** Todo el balance en `packages/config`.
- ❌ **Confiar en cualquier cosa que envíe el cliente.** El cliente envía
  intenciones, jamás resultados.
- ❌ **Construir 200 pantallas antes de validar la economía.** Es el consejo que
  el propio planteamiento ya intuía, y es correcto.
- ❌ **Empezar con un mapa mundial completo.** Denso y pequeño antes que grande y
  vacío.
- ❌ **Olvidar `world_id` en un índice.** Añadirlo con 300 millones de filas es
  una noche muy larga.
