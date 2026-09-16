"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { mensajeDeError } from "@/lib/supabase/client";
import { IconPlus } from "../ui/Icon";

/** Carga datos, expone estado y permite recargar. Es el patrón de todas las pantallas. */
export function useDatos<T>(cargar: () => Promise<T>, deps: unknown[]) {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refrescar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await cargar());
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    (async () => {
      try {
        const d = await cargar();
        if (vivo) setDatos(d);
      } catch (e) {
        if (vivo) setError(mensajeDeError(e));
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { datos, cargando, error, refrescar, setDatos };
}

export function Cargando({ filas = 4 }: { filas?: number }) {
  return (
    <div style={{ display: "grid", gap: 10, padding: 16 }}>
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="a-skeleton" style={{ width: `${92 - i * 11}%` }} />
      ))}
    </div>
  );
}

export function Vacio({
  titulo,
  texto,
  accion,
}: {
  titulo: string;
  texto: string;
  accion?: { etiqueta: string; onClick: () => void };
}) {
  return (
    <div className="a-empty">
      <div className="a-empty-title">{titulo}</div>
      <p className="a-empty-text">{texto}</p>
      {accion && (
        <button className="btn btn-sm btn-primary" onClick={accion.onClick}>
          <IconPlus size={14} /> {accion.etiqueta}
        </button>
      )}
    </div>
  );
}

export function AvisoError({ mensaje }: { mensaje: string }) {
  return (
    <div className="a-alert a-alert-error" style={{ margin: 16 }}>
      {mensaje}
    </div>
  );
}

export function Cajon({
  titulo,
  abierto,
  onCerrar,
  children,
  pie,
}: {
  titulo: string;
  abierto: boolean;
  onCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
}) {
  useEffect(() => {
    if (!abierto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="a-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div className="a-drawer">
        <div className="a-drawer-head">
          <span className="a-drawer-title">{titulo}</span>
          <button className="a-x" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="a-drawer-body">{children}</div>
        {pie && <div className="a-drawer-foot">{pie}</div>}
      </div>
    </div>
  );
}

const CHIP: Record<string, string> = {
  yes: "chip chip-ok",
  no: "chip chip-no",
  pending: "chip chip-wait",
};
const TEXTO: Record<string, string> = { yes: "Sí", no: "No", pending: "Sin responder" };

export function ChipEstado({ estado }: { estado: string }) {
  return (
    <span className={CHIP[estado] ?? "chip chip-neutral"}>{TEXTO[estado] ?? estado}</span>
  );
}

/** Tres botones para fijar disponibilidad. Aparece en asistencia y en partidos. */
export function Selector({
  valor,
  onCambio,
}: {
  valor: string;
  onCambio: (v: "yes" | "no" | "pending") => void;
}) {
  const opciones: Array<["yes" | "no" | "pending", string]> = [
    ["yes", "Sí"],
    ["no", "No"],
    ["pending", "—"],
  ];
  return (
    <span className="a-seg">
      {opciones.map(([v, etiqueta]) => (
        <button key={v} type="button" data-on={valor === v} onClick={() => onCambio(v)}>
          {etiqueta}
        </button>
      ))}
    </span>
  );
}
