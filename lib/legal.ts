/**
 * ⚠️  DATOS DEL TITULAR — RELLENAR ANTES DE PUBLICAR LA WEB
 *
 * La Ley 34/2002 (LSSI-CE, art. 10) obliga a identificar al titular del sitio
 * y el RGPD obliga a identificar al responsable del tratamiento. Estos datos
 * no se pueden inventar: sustituye cada valor entre corchetes por el real.
 *
 * Mientras queden corchetes, las páginas legales muestran un aviso visible
 * de que están incompletas. El aviso desaparece solo al rellenarlas.
 */
export const TITULAR = {
  /** Razón social de la sociedad, o nombre y apellidos si eres autónomo. */
  nombre: "[Razón social o nombre y apellidos del titular]",
  /** NIF o CIF. */
  nif: "[NIF / CIF]",
  /** Domicilio social o dirección profesional completa. */
  domicilio: "[Calle, número, código postal, municipio, provincia]",
  /** Correo de contacto para consultas y ejercicio de derechos. */
  email: "[correo@dominio.com]",
  /** Opcional: déjalo vacío si no procede. */
  telefono: "",
  /** Opcional: datos de inscripción registral, si la sociedad está inscrita. */
  registro: "",
  /** Opcional: nombre comercial, si es distinto de la razón social. */
  nombreComercial: "PLAYOFF30",
};

/** Dominio en el que se publica el sitio. */
export const DOMINIO = "playoff360.netlify.app";

/** Proveedor de alojamiento (encargado del tratamiento de los registros de servidor). */
export const ALOJAMIENTO = {
  nombre: "Netlify, Inc.",
  pais: "Estados Unidos",
};

/** Fecha de la última revisión de los textos legales. */
export const ACTUALIZADO = "16 de septiembre de 2026";

/** Un valor sigue sin rellenar si conserva los corchetes de la plantilla. */
export function pendiente(valor: string) {
  return valor.trim().startsWith("[");
}

/** ¿Queda algún dato obligatorio por rellenar? */
export function hayPendientes() {
  return [TITULAR.nombre, TITULAR.nif, TITULAR.domicilio, TITULAR.email].some(pendiente);
}
