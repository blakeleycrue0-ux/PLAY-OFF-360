"use client";

import { abrirPreferencias } from "@/lib/useConsent";

/**
 * Reabre el panel de consentimiento. Existe en dos formas porque aparece en
 * sitios muy distintos: un enlace discreto en el pie y un botón en la
 * política de cookies.
 */
export default function PreferenciasBoton({
  variante = "boton",
  className,
}: {
  variante?: "boton" | "enlace";
  className?: string;
}) {
  return (
    <button
      type="button"
      className={
        className ?? (variante === "boton" ? "btn btn-sm btn-primary" : undefined)
      }
      onClick={abrirPreferencias}
    >
      {variante === "boton" ? "Abrir preferencias de cookies" : "Preferencias de cookies"}
    </button>
  );
}
