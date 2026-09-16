"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cliente: SupabaseClient | null = null;

/**
 * Cliente de navegador. La clave anon es pública a propósito: lo que protege
 * los datos son las políticas RLS de la base, no esconder la clave.
 *
 * Se crea una sola vez porque cada instancia abre su propia escucha de
 * cambios de sesión.
 */
export function supabase(): SupabaseClient {
  if (!URL || !ANON) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Cópialas de .env.example a .env.local.",
    );
  }
  if (!cliente) {
    cliente = createClient(URL, ANON, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return cliente;
}

export const hayConfiguracion = Boolean(URL && ANON);

/** Traduce los errores de Supabase a algo que un entrenador pueda entender. */
export function mensajeDeError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e ?? "");
  if (/Invalid login credentials/i.test(m)) return "Correo o contraseña incorrectos.";
  if (/Email not confirmed/i.test(m)) return "Confirma tu correo antes de entrar.";
  if (/User already registered/i.test(m)) return "Ya existe una cuenta con ese correo.";
  if (/Password should be at least/i.test(m))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (/row-level security/i.test(m))
    return "No tienes permiso para hacer eso en este equipo.";
  if (/duplicate key/i.test(m)) return "Ese registro ya existe.";
  if (/Failed to fetch|NetworkError/i.test(m))
    return "No se ha podido conectar. Revisa tu conexión.";
  return m || "Ha ocurrido un error inesperado.";
}
