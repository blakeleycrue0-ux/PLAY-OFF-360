# Textura de la Tierra

`earth-bmng-2048.jpg` — imagen equirectangular (plate carrée) que se envuelve
sobre el globo.

| | |
| --- | --- |
| **Origen** | NASA Earth Observatory — *Blue Marble: Next Generation*, compuesta por Reto Stöckli (NASA Goddard Space Flight Center) a partir de datos del satélite Terra/MODIS |
| **Licencia** | Dominio público. NASA pide que se acredite «NASA Earth Observatory», y la página lo hace |
| **Vía** | El paquete `basemap-data` 2.0.0 (matplotlib/basemap), fichero `mpl_toolkits/basemap_data/bmng.jpg` — es la versión a un cuarto de resolución que publica la NASA |
| **SHA-256 del original** | `10f5389b365d7ece89f68a73ce5653fb5692145fde181fc64596d0d87cb89bb8` |
| **Original** | 5400×2700, 2.257 KB |
| **Publicado** | 2048×1024, 316 KB, JPEG calidad 0,86 |

## Por qué 2048×1024 y no el original

La textura se sube a la GPU sin comprimir: 2048×1024 son 8 MB de memoria de
vídeo, y el original serían 58 MB. En un móvil eso es la diferencia entre
funcionar y que el navegador mate la pestaña. A cambio, muy acercado se nota
blanda; por eso el acercamiento está limitado y las fronteras y los aeropuertos
se siguen dibujando como vectores por encima, que son los que dan el detalle
fino.

## Cómo se regenera

El entorno de esta sesión no puede salir a `visibleearth.nasa.gov`, así que la
imagen se tomó del paquete de PyPI, que distribuye exactamente ese fichero:

```sh
pip download basemap-data==2.0.0 --no-deps -d /tmp/bm
unzip -j /tmp/bm/basemap_data-2.0.0-py3-none-any.whl \
  'mpl_toolkits/basemap_data/bmng.jpg' -d /tmp/bm
sha256sum /tmp/bm/bmng.jpg   # tiene que coincidir con el de arriba
```

Y se reduce a 2048×1024 con cualquier herramienta que reescale bien
(`magick bmng.jpg -resize 2048x1024 -quality 86 earth-bmng-2048.jpg`).

El día que haya red abierta, la fuente preferida es la propia NASA:
<https://visibleearth.nasa.gov/collection/1484/blue-marble>.
