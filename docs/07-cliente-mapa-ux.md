# 07 — Cliente, mapa y experiencia visual

El requisito era explícito: *"no quiero que parezca una hoja de Excel"*. Pero el
juego **es** una hoja de cálculo por debajo. El trabajo de diseño consiste en
hacer que datos densos se sientan como una sala de control, no como un informe.

## 7.1 Dirección visual

**Referencia mental: centro de operaciones de una aerolínea de noche.** Oscuro,
denso en información, con cada dato ganándose su espacio.

- **Tema oscuro por defecto** (con claro disponible). El mapa vive mejor en
  oscuro y los datos destacan.
- **Un solo acento por pantalla.** Los colores de la aerolínea del jugador se
  usan en su marca, sus rutas y sus aviones — no en la interfaz.
- **Semántica de color estricta**: verde = beneficio, ámbar = atención, rojo =
  pérdida o alerta, azul = neutro/informativo. Y nada más. Un tablero con siete
  colores decorativos es ilegible.
- **Tipografía**: una sans geométrica para interfaz y una **mono tabular para
  todas las cifras** — los números tienen que alinearse en columna, siempre. Es
  el detalle que más diferencia una app financiera premium de una amateur.
- **Movimiento con propósito**: el avión se mueve, la barra de progreso avanza,
  un contador sube. No hay animaciones decorativas. Todo movimiento representa
  algo que está ocurriendo de verdad.
- **Densidad progresiva**: la pantalla principal muestra 6 cifras grandes; cada
  una se abre a 30. Nunca 30 de entrada.

## 7.2 Pantalla principal

```
┌──────────────────────────────────────────────────────────┐
│  BLAKE AIRWAYS                          🔔 3    ⚙        │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│   €12.480.332                    ▲ +184.220 hoy          │
│   Caja                           Beneficio 30 d +1,2 M   │
│                                                          │
│   ┌────────┬────────┬────────┬────────┐                  │
│   │   14   │   24   │   67   │ 88,4 % │                  │
│   │ en aire│  flota │ rutas  │puntual.│                  │
│   └────────┴────────┴────────┴────────┘                  │
│                                                          │
│  ╔══════════════════════════════════════════════════╗    │
│  ║              MAPA EN VIVO                        ║    │
│  ║      ✈ tus vuelos   ✈ otros jugadores            ║    │
│  ║         (ocupa el 45% de la pantalla)            ║    │
│  ╚══════════════════════════════════════════════════╝    │
│                                                          │
│  ⚠  EC-BLA · check C en 40 h de vuelo                    │
│  ⚠  BCN→CDG pierde 890 €/vuelo desde el lunes            │
│                                                          │
│  📰 El queroseno sube un 18% tras la interrupción…       │
│                                                          │
│  ┌──────┬──────┬──────┬──────┬──────┐                    │
│  │Inicio│ Mapa │ Red  │Flota │ Más  │                    │
│  └──────┴──────┴──────┴──────┴──────┘                    │
└──────────────────────────────────────────────────────────┘
```

Tres reglas para esta pantalla:

1. **El mapa está vivo desde el primer segundo.** Es lo que comunica "esto es un
   mundo, no un formulario". Se carga antes que ninguna otra cosa.
2. **Las alertas son accionables**, con el siguiente paso a un toque. Una alerta
   que solo informa es ruido.
3. **Nada de "0 de 0".** Un jugador nuevo ve su primer avión y su primera ruta
   sugerida, no una pantalla de ceros.

## 7.3 El mapa

Núcleo de la experiencia. MapLibre GL, estilo propio muy reducido (sin
carreteras, sin etiquetas de ciudades irrelevantes: solo tierra, agua, fronteras
tenues y aeropuertos).

**Capas por nivel de zoom:**

| Zoom | Qué se ve |
|---|---|
| 1-3 (mundo) | clústeres de tráfico, arcos de las rutas más densas, mancha de eventos |
| 4-6 (continente) | aeropuertos principales, tus rutas resaltadas, aviones como puntos |
| 7-9 (región) | todos los aeropuertos, todos los vuelos visibles, etiquetas de callsign |
| 10+ (aeropuerto) | ficha del aeropuerto, llegadas/salidas, tus slots, competidores |

**Interacciones**: tocar avión → ficha de vuelo; tocar aeropuerto → ficha de
aeropuerto (demanda, tasas, slots libres, quién opera allí); tocar una ruta →
análisis de mercado con la competencia; tocar el logo de una aerolínea → perfil
público. Filtros: *solo los míos · mi alianza · todos · por aeropuerto*.

**Rendimiento**: capa de símbolos con posiciones recalculadas por
`requestAnimationFrame` desde los planes de vuelo en memoria (doc 03 §3.2). Los
arcos de ruta son geometrías precalculadas y cacheadas. Objetivo: 60 fps con 800
aviones en pantalla en un móvil de gama media. Si baja, se reduce el número de
aviones dibujados por celda antes que la tasa de refresco.

## 7.4 Pantallas principales

**Red (rutas)** — lista ordenable por beneficio, con el P&L del doc 04 §4.9 a un
toque. Aquí vive la mayor parte del juego real.

**Analizador de rutas** — la herramienta antes de abrir una ruta:

```
PMI → LGW                                            1.317 km
─────────────────────────────────────────────────────────────
Demanda estimada          412 pax/día  ▁▃▅█▇▅▃  (pico julio)
Competencia               3 aerolíneas · 680 asientos/día
Precio medio actual       94 €          Tu precio sugerido 89 €
Slots disponibles         PMI: 14 libres · LGW: 2 libres (08:00 en subasta)
Coste estimado/vuelo      18.940 €
Ocupación prevista        84 %
Beneficio previsto        +1.240 €/vuelo    ·   +52.000 €/mes

[ Simular con otro avión ]        [ Abrir ruta ]
```

Todo eso se calcula **en el dispositivo** con `packages/domain` mientras el
jugador mueve los deslizadores: cero latencia, cero llamadas de red. Es
exactamente por lo que el dominio es TypeScript puro y compartido (doc 01 §1.4).

**Flota** — tarjetas con estado, condición como barra, próximo check, utilización
y beneficio por avión. Filtros por estado. Acciones: configurar cabina, asignar
librea, programar mantenimiento, vender.

**Finanzas** — P&L, caja proyectada a 90 días, desglose por categoría, deuda,
rating. Con el gráfico de "días de caja restantes" bien visible, que es la cifra
que evita que un jugador quiebre sin haberlo visto venir.

**Personal** — plantilla por base y rol, con una barra clara de
*capacidad requerida vs. disponible*. La escasez debe verse antes de causar
cancelaciones.

**Mundo** — noticias, rankings, alianzas, buscador de aerolíneas, mercado de
aviones.

## 7.5 Creación de la aerolínea (onboarding)

La primera impresión. Debe ser corta, bonita y terminar con el jugador viendo su
primer avión en el mapa **en menos de cinco minutos**.

1. **Nombre y código** — validación en vivo de disponibilidad de IATA/ICAO en el
   mundo, con sugerencias.
2. **País y hub** — mapa con sugerencias por dificultad: *"Palma de Mallorca ·
   fuerte estacionalidad de ocio · competencia media"*. Cada hub es una
   estrategia distinta, y eso se dice explícitamente.
3. **Identidad** — generador de logos (forma + símbolo + paleta) y **librea
   sobre una vista 3D del avión**, con paleta y esquema (cola, franja, casco).
   Este paso es el que la gente comparte en redes: merece más cuidado del que su
   peso mecánico justifica.
4. **Modelo de negocio** — low-cost / tradicional / regional / chárter. No es
   cosmético: ajusta configuraciones por defecto, coeficientes auxiliares y
   objetivos iniciales.
5. **Capital inicial** — 50.000.000 €, presentado como una escena, no como un
   número en un formulario.
6. **Tutorial integrado, no modal**: comprar el primer avión, abrir la primera
   ruta, programar el primer vuelo, verlo despegar **en el mapa**. Sin
   diálogos de "pulsa aquí": objetivos reales con recompensa real.

## 7.6 Progresión

| Fase | Desbloquea | Criterio |
|---|---|---|
| 1 — Regional | 1 hub, regionales y narrowbodies, rutas < 2.500 km | inicio |
| 2 — Nacional | más slots, hasta 15 aviones, primeras internacionales | 10 rutas rentables |
| 3 — Internacional | 2.º hub, widebodies, carga | reputación 60 + 25 aviones |
| 4 — Global | intercontinental, alianzas, codeshare | reputación 75 + 3 continentes |
| 5 — Megacarrier | hubs ilimitados, pedidos de fábrica, influencia normativa | top 100 del mundo |

Las fases no deben ser *muros de tiempo*: se desbloquean por **logros
operativos**, no por esperar. Un jugador bueno llega a la fase 3 en semanas; uno
que se estanca recibe objetivos que le enseñan qué está haciendo mal.

## 7.7 Accesibilidad y calidad

- Contraste AA mínimo en todo texto sobre el mapa (crítico: los mapas oscuros
  invitan a texto ilegible).
- No transmitir información **solo** por color: los estados llevan icono y texto
  (importante para las alertas de pérdida/beneficio).
- Tamaños de toque ≥ 44 pt; los aviones del mapa tienen un radio de toque mayor
  que su símbolo.
- Soporte de texto grande sin romper los tableros numéricos.
- i18n desde el día uno: **español e inglés**. Las noticias son plantillas
  precisamente por esto (doc 06 §6.6).
- Funcionamiento razonable sin conexión: última vista cacheada, cola de acciones
  con reintento, reloj sincronizado al reconectar.
