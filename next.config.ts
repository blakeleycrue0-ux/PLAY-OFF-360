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
  /**
   * Cada ruta se exporta como carpeta/index.html. Sin esto conviven
   * `legal/aviso-legal.html` y una carpeta `legal/aviso-legal/` sin índice,
   * y el servidor estático puede quedarse con la carpeta y devolver 404.
   */
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
