"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/brand/Logo";
import { IconArrow, IconCheck } from "@/components/ui/Icon";
import { hayConfiguracion, mensajeDeError, supabase } from "@/lib/supabase/client";
import s from "./Entrar.module.css";

type Modo = "entrar" | "crear";

export default function Entrar() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Si ya hay sesión, no tiene sentido enseñar el formulario.
  useEffect(() => {
    if (!hayConfiguracion) return;
    supabase()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace("/app/");
      });
  }, [router]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setEnviando(true);
    try {
      const sb = supabase();
      if (modo === "entrar") {
        const { error } = await sb.auth.signInWithPassword({ email, password: clave });
        if (error) throw error;
        router.replace("/app/");
      } else {
        const { data, error } = await sb.auth.signUp({
          email,
          password: clave,
          options: { data: { nombre: nombre.trim() || null } },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/app/bienvenida/");
        } else {
          // Supabase trae activada la confirmación por correo por defecto.
          setAviso(
            "Cuenta creada. Te hemos enviado un correo para confirmarla: ábrelo y vuelve a entrar.",
          );
          setModo("entrar");
        }
      }
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  if (!hayConfiguracion) {
    return (
      <div className={s.pantalla}>
        <div className={s.panel}>
          <div className={s.caja}>
            <div className="a-alert a-alert-error">
              Falta la configuración de Supabase. Copia <code>.env.example</code> a{" "}
              <code>.env.local</code> y reinicia el servidor.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.pantalla}>
      <aside className={s.lado}>
        <div className={s.glow} aria-hidden />
        <div className={s.ladoTop}>
          <Logo tone="light" size={17} markSize={28} />
        </div>
        <div className={s.ladoMid}>
          <p className={s.frase}>
            Tu equipo. <em>Sin perseguir a nadie.</em>
          </p>
          <p className={s.fraseSub}>
            Esta es una demo real: lo que crees aquí se guarda de verdad y solo lo ves tú.
            Puedes cargar un equipo de ejemplo y trastear sin miedo.
          </p>
        </div>
      </aside>

      <div className={s.panel}>
        <div className={s.caja}>
          <div className={s.marcaMovil}>
            <Logo size={17} markSize={28} />
          </div>

          <Link href="/" className={s.volver}>
            <IconArrow size={13} style={{ transform: "rotate(180deg)" }} /> Volver a la
            web
          </Link>

          <h1 className={s.titulo}>
            {modo === "entrar" ? "Entra en tu equipo" : "Crea tu cuenta"}
          </h1>
          <p className={s.sub}>
            {modo === "entrar"
              ? "Con el correo y la contraseña que usaste al registrarte."
              : "Tardas menos que en escribir un mensaje en el grupo del equipo."}
          </p>

          <div className={s.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              data-on={modo === "entrar"}
              onClick={() => setModo("entrar")}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              data-on={modo === "crear"}
              onClick={() => setModo("crear")}
            >
              Crear cuenta
            </button>
          </div>

          <form className="a-form" onSubmit={enviar}>
            {modo === "crear" && (
              <div className="a-field">
                <label className="a-label" htmlFor="nombre">
                  Tu nombre
                </label>
                <input
                  id="nombre"
                  className="a-input"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Dani Moreno"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="a-field">
              <label className="a-label" htmlFor="email">
                Correo
              </label>
              <input
                id="email"
                className="a-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="entrenador@club.com"
                autoComplete="email"
              />
            </div>

            <div className="a-field">
              <label className="a-label" htmlFor="clave">
                Contraseña
              </label>
              <input
                id="clave"
                className="a-input"
                type="password"
                required
                minLength={6}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              />
            </div>

            {error && <div className="a-alert a-alert-error">{error}</div>}
            {aviso && (
              <div className="a-alert a-alert-ok">
                <IconCheck size={14} /> {aviso}
              </div>
            )}

            <button
              className="btn btn-primary"
              disabled={enviando}
              style={{ width: "100%" }}
            >
              {enviando
                ? "Un momento…"
                : modo === "entrar"
                  ? "Entrar"
                  : "Crear cuenta y empezar"}
              {!enviando && <IconArrow size={15} />}
            </button>
          </form>

          <p className={s.pie}>
            Al continuar aceptas los <Link href="/legal/terminos/">términos de uso</Link>{" "}
            y la <Link href="/legal/privacidad/">política de privacidad</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
