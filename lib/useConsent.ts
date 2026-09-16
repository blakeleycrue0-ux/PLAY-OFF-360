"use client";

import { useCallback, useEffect, useState } from "react";

export type Consent = {
  /** Siempre true: sin ellas el sitio no funciona. No se puede desactivar. */
  necesarias: true;
  analiticas: boolean;
  marketing: boolean;
  /** Fecha en que se registró la decisión, en milisegundos. */
  fecha: number;
};

const CLAVE = "playoff30.consent.v1";
export const EVENTO_ABRIR = "playoff30:abrir-consentimiento";

function leer(): Consent | null {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const dato = JSON.parse(crudo) as Consent;
    if (typeof dato?.fecha !== "number") return null;
    return { ...dato, necesarias: true };
  } catch {
    // Navegación privada, almacenamiento bloqueado o JSON corrupto:
    // se trata como "sin decisión" y se vuelve a preguntar.
    return null;
  }
}

function escribir(valor: Consent) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(valor));
  } catch {
    // Si no se puede guardar, la decisión vale para esta sesión y nada más.
  }
}

/**
 * Estado del consentimiento de cookies.
 *
 * `listo` distingue "todavía no he leído el almacenamiento" de "no hay
 * decisión guardada", para que el banner no parpadee en cada carga.
 */
export function useConsent() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    setConsent(leer());
    setListo(true);
  }, []);

  const guardar = useCallback((opciones: { analiticas: boolean; marketing: boolean }) => {
    const valor: Consent = {
      necesarias: true,
      analiticas: opciones.analiticas,
      marketing: opciones.marketing,
      fecha: Date.now(),
    };
    escribir(valor);
    setConsent(valor);
  }, []);

  const revocar = useCallback(() => {
    try {
      window.localStorage.removeItem(CLAVE);
    } catch {
      // nada que hacer
    }
    setConsent(null);
  }, []);

  return { consent, listo, guardar, revocar };
}

/** Reabre el panel de preferencias desde cualquier punto de la página. */
export function abrirPreferencias() {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR));
}
