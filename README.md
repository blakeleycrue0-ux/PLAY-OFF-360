# PLAYOFF30 — landing page

Landing page de **PLAYOFF30**, el software de operación diaria para equipos de
fútbol: convocatorias, asistencia, partidos y comunicación en un solo sitio.

Esta fase es **solo la landing**. No hay backend, autenticación, base de datos
ni aplicación real: las interfaces de producto que aparecen en la página son
componentes React/CSS diseñados para parecer capturas de un producto que existe.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **CSS propio**: tokens en `app/globals.css` + CSS Modules por componente.
  Sin Tailwind, sin librerías de UI, sin librerías de animación.
- **next/font** con Archivo (titulares e interfaz) e Instrument Serif (acentos
  editoriales en cursiva).

## Arranque

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
npm run format   # prettier
```

## Estructura

```
app/
  layout.tsx          tipografías, metadatos, icono
  page.tsx            orden narrativo de las secciones
  globals.css         sistema de diseño (color, tipografía, botones, reveals)
components/
  Nav.tsx             barra flotante + hoja de navegación en móvil
  Footer.tsx
  brand/Logo.tsx      símbolo (arco de córner + punto) y wordmark
  product/            interfaces ficticias reutilizables (Chrome, TodayScreen)
  sections/           las doce secciones de la página
  ui/                 Reveal, Counter, Avatar, Icon, SectionHead
lib/
  data.ts             el club ficticio: plantilla, familias, partido, equipos
  useInView.ts        IntersectionObserver compartido
  useSequence.ts      secuencias por pasos y máquina de escribir
```

## Decisiones

**Un solo club ficticio.** Todas las pantallas usan los mismos nombres, el mismo
partido y la misma semana (`lib/data.ts`). Es lo que hace que la página parezca
un producto y no una colección de mockups sueltos.

**Narrativa antes que catálogo.** Las secciones cuentan una historia —así se
gestiona hoy, esto no debería ser trabajo del entrenador, existe otra forma,
PLAYOFF30 entiende el contexto, lo ejecuta, el equipo se entera, empiezas con un
equipo, creces con el club— en lugar de repetir «PLAYOFF30 hace X».

**Animación con presupuesto.** Todo el movimiento pasa por `useInView`:
apariciones escalonadas, contadores, barras que crecen y una secuencia de
conversación en la sección del asistente. Todo se desactiva con
`prefers-reduced-motion`.

**Sin datos inventados de negocio.** No hay clientes, logos, testimonios ni
métricas de tracción. Las cifras que aparecen pertenecen al equipo ficticio de
la demo.

## Móvil

El móvil no es el escritorio estrechado. Cambian la navegación (hoja completa),
los CTA (ancho completo), la tabla de plantilla (tres columnas en vez de cinco),
el montón de la sección de problema (apilado), el carrusel de roles (rail con
scroll y snap) y la pantalla del hero (se recorta el panel de partido).
