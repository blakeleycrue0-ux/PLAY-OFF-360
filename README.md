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

## ⚠️ Antes de publicar: datos legales

Las páginas legales están escritas pero **incompletas a propósito**. Faltan los
datos identificativos del titular, que son obligatorios (art. 10 LSSI-CE y RGPD)
y no se pueden inventar.

Rellena `lib/legal.ts` una sola vez —razón social, NIF, domicilio y correo— y el
aviso naranja que aparece en las cuatro páginas desaparece solo. Conviene además
que un abogado revise los textos antes de publicarlos: son una base sólida, no un
dictamen.

## Legal y cookies

```
app/legal/aviso-legal/    titular, uso del sitio, propiedad intelectual
app/legal/privacidad/     RGPD: datos, bases jurídicas, derechos, menores
app/legal/cookies/        qué se guarda y cómo cambiarlo
app/legal/terminos/       condiciones de acceso
```

El sitio **no instala cookies de analítica, publicidad ni redes sociales**. No hay
Google Analytics, ni píxeles, ni contenido incrustado de terceros; las tipografías
se sirven desde el propio dominio. Lo único que se guarda es la decisión del
usuario en `localStorage`, bajo la clave `playoff30.consent.v1`.

El banner (`components/CookieConsent.tsx`) ofrece aceptar todo, solo las
necesarias, o configurar por categorías. La preferencia se puede cambiar desde el
enlace del pie de página. Las categorías de analítica y marketing existen para
cuando haga falta: hoy no controlan nada, y así se dice en la política.

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

**Todo el club es inventado.** CD Valmorán, CF Alcorada, el campo, la competición,
los jugadores y las familias no existen, y no corresponden a ninguna localidad
real. Es intencionado: usar el nombre de un club real en material de producto
invita a problemas de marca y de imagen. El pie de página lo dice de forma
explícita.

**Exportación estática.** `output: "export"` con `trailingSlash: true`, así que
cada ruta se publica como `carpeta/index.html` y se sirve desde cualquier CDN sin
runtime de Next. El `netlify.toml` fija el comando de build y el directorio
`out/`.

## Móvil

El móvil no es el escritorio estrechado. Cambian la navegación (hoja completa),
los CTA (ancho completo), la tabla de plantilla (tres columnas en vez de cinco),
el montón de la sección de problema (apilado), el carrusel de roles (rail con
scroll y snap) y la pantalla del hero (se recorta el panel de partido).
