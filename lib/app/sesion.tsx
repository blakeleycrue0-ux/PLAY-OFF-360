"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { Club, Equipo, Pertenencia } from "@/lib/supabase/types";

const CLAVE_EQUIPO = "playoff30.equipo";

type Estado = {
  cargando: boolean;
  user: User | null;
  clubs: Club[];
  equipos: Equipo[];
  pertenencias: Pertenencia[];
  equipo: Equipo | null;
  club: Club | null;
  elegirEquipo: (id: string) => void;
  recargar: () => Promise<void>;
  salir: () => Promise<void>;
};

const Ctx = createContext<Estado | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [pertenencias, setPertenencias] = useState<Pertenencia[]>([]);
  const [equipoId, setEquipoId] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    const sb = supabase();
    // RLS ya limita cada consulta a lo que este usuario puede ver, así que no
    // hace falta filtrar por club en el cliente.
    const [{ data: ms }, { data: cs }, { data: ts }] = await Promise.all([
      sb.from("memberships").select("*").returns<Pertenencia[]>(),
      sb.from("clubs").select("*").order("created_at").returns<Club[]>(),
      sb.from("teams").select("*").order("created_at").returns<Equipo[]>(),
    ]);
    setPertenencias(ms ?? []);
    setClubs(cs ?? []);
    setEquipos(ts ?? []);

    setEquipoId((actual) => {
      const lista = ts ?? [];
      if (actual && lista.some((t) => t.id === actual)) return actual;
      let guardado: string | null = null;
      try {
        guardado = window.localStorage.getItem(CLAVE_EQUIPO);
      } catch {
        guardado = null;
      }
      if (guardado && lista.some((t) => t.id === guardado)) return guardado;
      return lista[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    const sb = supabase();
    let vivo = true;

    sb.auth.getSession().then(async ({ data }) => {
      if (!vivo) return;
      setUser(data.session?.user ?? null);
      if (data.session?.user) await cargarDatos();
      if (vivo) setCargando(false);
    });

    const { data: sub } = sb.auth.onAuthStateChange(async (_evento, sesion) => {
      if (!vivo) return;
      setUser(sesion?.user ?? null);
      if (sesion?.user) {
        await cargarDatos();
      } else {
        setClubs([]);
        setEquipos([]);
        setPertenencias([]);
        setEquipoId(null);
      }
      setCargando(false);
    });

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [cargarDatos]);

  const elegirEquipo = useCallback((id: string) => {
    setEquipoId(id);
    try {
      window.localStorage.setItem(CLAVE_EQUIPO, id);
    } catch {
      // almacenamiento bloqueado: vale solo para esta sesión
    }
  }, []);

  const salir = useCallback(async () => {
    await supabase().auth.signOut();
  }, []);

  const equipo = useMemo(
    () => equipos.find((t) => t.id === equipoId) ?? null,
    [equipos, equipoId],
  );
  const club = useMemo(
    () => (equipo ? (clubs.find((c) => c.id === equipo.club_id) ?? null) : null),
    [clubs, equipo],
  );

  const valor = useMemo<Estado>(
    () => ({
      cargando,
      user,
      clubs,
      equipos,
      pertenencias,
      equipo,
      club,
      elegirEquipo,
      recargar: cargarDatos,
      salir,
    }),
    [
      cargando,
      user,
      clubs,
      equipos,
      pertenencias,
      equipo,
      club,
      elegirEquipo,
      cargarDatos,
      salir,
    ],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSesion() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSesion tiene que usarse dentro de <SesionProvider>");
  return v;
}
