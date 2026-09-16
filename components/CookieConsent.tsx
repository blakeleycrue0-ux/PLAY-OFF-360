"use client";

import { useEffect, useState } from "react";
import { Mark } from "./brand/Logo";
import { EVENTO_ABRIR, useConsent } from "@/lib/useConsent";
import s from "./CookieConsent.module.css";

export default function CookieConsent() {
  const { consent, listo, guardar } = useConsent();
  const [abierto, setAbierto] = useState(false);
  const [detalle, setDetalle] = useState(false);
  const [visible, setVisible] = useState(false);
  const [analiticas, setAnaliticas] = useState(false);
  const [marketing, setMarketing] = useState(false);

  // Primera visita: se pregunta. Si ya hay decisión guardada, no se molesta.
  useEffect(() => {
    if (!listo || consent) return;
    const t = setTimeout(() => setAbierto(true), 600);
    return () => clearTimeout(t);
  }, [listo, consent]);

  // El pie de página puede reabrir el panel para cambiar la decisión.
  useEffect(() => {
    const reabrir = () => {
      setAnaliticas(consent?.analiticas ?? false);
      setMarketing(consent?.marketing ?? false);
      setDetalle(true);
      setAbierto(true);
    };
    window.addEventListener(EVENTO_ABRIR, reabrir);
    return () => window.removeEventListener(EVENTO_ABRIR, reabrir);
  }, [consent]);

  // Entrada en dos fotogramas para que la transición tenga de dónde partir.
  useEffect(() => {
    if (!abierto) {
      setVisible(false);
      return;
    }
    const r = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(r);
  }, [abierto]);

  if (!abierto) return null;

  const decidir = (a: boolean, m: boolean) => {
    guardar({ analiticas: a, marketing: m });
    setVisible(false);
    setTimeout(() => {
      setAbierto(false);
      setDetalle(false);
    }, 320);
  };

  return (
    <div className={s.wrap}>
      <div
        className={[s.card, visible ? s.visible : ""].join(" ")}
        role="dialog"
        aria-modal="false"
        aria-labelledby="consent-title"
      >
        <div className={s.head}>
          <Mark size={26} />
          <span id="consent-title" className={s.title}>
            Cookies y privacidad
          </span>
        </div>

        <p className={s.text}>
          Hoy esta web no usa cookies de analítica ni de publicidad. Solo guarda en tu
          navegador la decisión que tomes aquí, para no volver a preguntártelo. Puedes
          leer los detalles en la <a href="/legal/cookies/">política de cookies</a>.
        </p>

        {detalle && (
          <div className={s.panel}>
            <div className={s.row}>
              <div>
                <div className={s.rowName}>Necesarias</div>
                <p className={s.rowText}>
                  Recuerdan esta misma decisión. Sin ellas volveríamos a preguntarte en
                  cada visita.
                </p>
              </div>
              <span
                className={`${s.toggle} ${s.toggleLocked}`}
                role="img"
                aria-label="Siempre activas"
              />
            </div>

            <div className={s.row}>
              <div>
                <div className={s.rowName}>Analíticas</div>
                <p className={s.rowText}>
                  Medirían qué secciones se leen. Todavía no hay ninguna instalada.
                </p>
              </div>
              <button
                type="button"
                className={`${s.toggle} ${analiticas ? s.toggleOn : ""}`}
                onClick={() => setAnaliticas((v) => !v)}
                role="switch"
                aria-checked={analiticas}
                aria-label="Cookies analíticas"
              />
            </div>

            <div className={s.row}>
              <div>
                <div className={s.rowName}>Marketing</div>
                <p className={s.rowText}>
                  Servirían para medir campañas. Todavía no hay ninguna instalada.
                </p>
              </div>
              <button
                type="button"
                className={`${s.toggle} ${marketing ? s.toggleOn : ""}`}
                onClick={() => setMarketing((v) => !v)}
                role="switch"
                aria-checked={marketing}
                aria-label="Cookies de marketing"
              />
            </div>
          </div>
        )}

        <div className={s.actions}>
          {detalle ? (
            <>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => decidir(analiticas, marketing)}
              >
                Guardar preferencias
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => decidir(true, true)}
              >
                Aceptar todo
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => decidir(true, true)}
              >
                Aceptar todo
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => decidir(false, false)}
              >
                Solo las necesarias
              </button>
            </>
          )}
        </div>

        {!detalle && (
          <button className={s.link} onClick={() => setDetalle(true)}>
            Configurar
          </button>
        )}
      </div>
    </div>
  );
}
