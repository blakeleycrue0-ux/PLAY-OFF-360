// Subconjunto de d3-array 3.2.4 — ISC, Copyright 2010-2023 Mike Bostock.
// https://github.com/d3/d3-array
//
// d3-geo sólo usa tres cosas de d3-array: Adder, merge y range. Se copian aquí
// literales en vez de traerse el paquete entero (17 KB minimizados) o de
// pedirlo a un CDN en tiempo de ejecución, que es una dependencia de red más
// que puede caerse justo cuando alguien abre la aplicación.
(function (global) {
  'use strict';
  var d3 = (global.d3 = global.d3 || {});

  // Suma exacta de Neumaier. La precisión importa: d3-geo la usa para decidir
  // de qué lado del horizonte cae un punto del globo.
  class Adder {
    constructor() {
      this._partials = new Float64Array(32);
      this._n = 0;
    }
    add(x) {
      const p = this._partials;
      let i = 0;
      for (let j = 0; j < this._n && j < 32; j++) {
        const y = p[j],
          hi = x + y,
          lo = Math.abs(x) < Math.abs(y) ? x - (hi - y) : y - (hi - x);
        if (lo) p[i++] = lo;
        x = hi;
      }
      p[i] = x;
      this._n = i + 1;
      return this;
    }
    valueOf() {
      const p = this._partials;
      let n = this._n,
        x,
        y,
        lo,
        hi = 0;
      if (n > 0) {
        hi = p[--n];
        while (n > 0) {
          x = hi;
          y = p[--n];
          hi = x + y;
          lo = y - (hi - x);
          if (lo) break;
        }
        if (n > 0 && ((lo < 0 && p[n - 1] < 0) || (lo > 0 && p[n - 1] > 0))) {
          y = lo * 2;
          x = hi + y;
          if (y == x - hi) hi = x;
        }
      }
      return hi;
    }
  }

  function* flatten(arrays) {
    for (const array of arrays) yield* array;
  }

  function merge(arrays) {
    return Array.from(flatten(arrays));
  }

  function range(start, stop, step) {
    var n;
    ((start = +start),
      (stop = +stop),
      (step = (n = arguments.length) < 2 ? ((stop = start), (start = 0), 1) : n < 3 ? 1 : +step));

    var i = -1,
      length = Math.max(0, Math.ceil((stop - start) / step)) | 0,
      out = new Array(length);

    while (++i < length) out[i] = start + i * step;

    return out;
  }

  d3.Adder = Adder;
  d3.merge = merge;
  d3.range = range;
})(typeof globalThis !== 'undefined' ? globalThis : self);
