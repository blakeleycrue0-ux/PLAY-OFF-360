# Dependencias empotradas de la vista previa

Estos ficheros se incrustan **dentro** del HTML que se publica. No se piden a un
CDN a propósito: un CDN es una dependencia de red que puede fallar justo cuando
alguien abre la aplicación, y la página tiene que poder funcionar sin red una vez
cargada.

| Fichero                | Origen                                       | Licencia |
| ---------------------- | -------------------------------------------- | -------- |
| `d3-geo.min.js`        | `d3-geo@3.1.1` (`dist/d3-geo.min.js`), literal | ISC      |
| `d3-array-subset.js`   | `d3-array@3.2.4`, sólo `Adder`, `merge` y `range` | ISC  |

`d3-geo` es lo que proyecta el globo: la proyección ortográfica y, sobre todo,
el recorte por el horizonte, que es la parte que no conviene escribir a mano —un
polígono que cruza el borde visible hay que cerrarlo siguiendo el arco del
horizonte, y hacerlo mal deja tajos rectos cruzando el planeta.

Para actualizarlos:

```sh
pnpm add -w -D d3-geo@<versión>
cp node_modules/.pnpm/d3-geo@<versión>/node_modules/d3-geo/dist/d3-geo.min.js \
   apps/web/preview/vendor/d3-geo.min.js
```

Si una versión nueva de `d3-geo` usa más símbolos de `d3-array`, hay que añadirlos
a `d3-array-subset.js`; la carga falla de forma ruidosa si falta alguno.
