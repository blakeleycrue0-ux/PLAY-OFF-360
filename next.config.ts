import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * La landing es completamente estática: no hay APIs, datos de servidor ni
   * rutas dinámicas. Exportarla como HTML plano la deja servible desde
   * cualquier CDN sin runtime de Next. Si algún día se añade backend, basta
   * con quitar esta línea.
   */
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
