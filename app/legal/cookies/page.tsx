import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import PreferenciasBoton from "@/components/legal/PreferenciasBoton";
import s from "@/components/legal/LegalPage.module.css";

export const metadata: Metadata = {
  title: "Política de cookies",
  description:
    "Qué cookies y almacenamiento local utiliza el sitio de PLAYOFF30, y cómo cambiar tu decisión en cualquier momento.",
  robots: { index: true, follow: true },
};

const SECCIONES = [
  { id: "que-son", titulo: "1. Qué son las cookies" },
  { id: "usamos", titulo: "2. Qué usa esta web" },
  { id: "detalle", titulo: "3. Detalle del almacenamiento" },
  { id: "gestionar", titulo: "4. Cambiar tu decisión" },
  { id: "navegador", titulo: "5. Borrarlas en el navegador" },
  { id: "cambios", titulo: "6. Cambios" },
];

export default function Page() {
  return (
    <LegalPage
      titulo="Política de cookies"
      entradilla="Cookies y almacenamiento local"
      secciones={SECCIONES}
    >
      <section>
        <h2 id="que-son">1. Qué son las cookies</h2>
        <p>
          Una cookie es un pequeño archivo que un sitio web guarda en tu dispositivo al
          visitarlo. Sirve para recordar información entre páginas o entre visitas. Junto
          a las cookies existen otras tecnologías de almacenamiento, como el{" "}
          <em>almacenamiento local</em> del navegador, que cumplen una función parecida y
          están sujetas a las mismas reglas.
        </p>
        <p>
          Esta política sigue el criterio de la Agencia Española de Protección de Datos y
          lo previsto en el artículo 22.2 de la Ley 34/2002 (LSSI-CE).
        </p>
      </section>

      <section>
        <h2 id="usamos">2. Qué usa esta web</h2>
        <p>
          <strong>
            Este sitio no instala cookies de analítica, de publicidad ni de redes
            sociales, ni propias ni de terceros.
          </strong>{" "}
          No hay Google Analytics, ni píxeles de seguimiento, ni vídeos o mapas
          incrustados que puedan instalar cookies por su cuenta. Las tipografías se sirven
          desde el propio dominio, no desde un servicio externo.
        </p>
        <p>
          Lo único que se guarda en tu dispositivo es <strong>una entrada técnica</strong>{" "}
          en el almacenamiento local del navegador con la decisión que tomas en el aviso
          de cookies. Se considera estrictamente necesaria: sin ella, tendríamos que
          volver a preguntarte en cada visita.
        </p>
        <p>
          El panel de configuración incluye las categorías de analítica y marketing porque
          podrían activarse en el futuro. Hoy no hay ninguna herramienta asociada a ellas,
          de modo que aceptarlas o rechazarlas no cambia nada: simplemente deja registrada
          tu preferencia para cuando existan.
        </p>
      </section>

      <section>
        <h2 id="detalle">3. Detalle del almacenamiento utilizado</h2>
        <div className={s.tabla}>
          <div className={s.fila}>
            <span className={s.filaKey}>playoff30.consent.v1</span>
            <span className={s.filaVal}>
              <strong>Tipo:</strong> almacenamiento local (no es una cookie, no viaja al
              servidor).
              <br />
              <strong>Titularidad:</strong> propia.
              <br />
              <strong>Finalidad:</strong> recordar tu decisión sobre las categorías de
              cookies.
              <br />
              <strong>Duración:</strong> permanente hasta que la cambies o borres los
              datos del sitio.
            </span>
          </div>
        </div>
        <p>
          No se registra ninguna otra cookie. Si esto cambiase, esta tabla se actualizaría
          antes de activar la herramienta correspondiente y se te volvería a pedir el
          consentimiento.
        </p>
      </section>

      <section>
        <h2 id="gestionar">4. Cambiar tu decisión</h2>
        <p>
          Puedes revisar o modificar tu elección cuando quieras. También encontrarás este
          mismo enlace en el pie de todas las páginas.
        </p>
        <PreferenciasBoton />
      </section>

      <section>
        <h2 id="navegador">5. Borrarlas desde el navegador</h2>
        <p>
          Además, puedes eliminar el almacenamiento de este sitio y bloquear cookies desde
          la configuración de tu navegador:
        </p>
        <ul>
          <li>
            <strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies y
            otros datos de sitios.
          </li>
          <li>
            <strong>Safari:</strong> Ajustes → Privacidad → Gestionar datos de sitios web.
          </li>
          <li>
            <strong>Firefox:</strong> Ajustes → Privacidad y seguridad → Cookies y datos
            del sitio.
          </li>
          <li>
            <strong>Edge:</strong> Configuración → Cookies y permisos del sitio.
          </li>
        </ul>
        <p>
          Al borrar estos datos también se elimina tu preferencia, de modo que el aviso
          volverá a aparecer en la siguiente visita.
        </p>
      </section>

      <section>
        <h2 id="cambios">6. Cambios en esta política</h2>
        <p>
          Si en el futuro incorporamos herramientas que utilicen cookies, actualizaremos
          esta página y volveremos a solicitar tu consentimiento antes de activarlas.
        </p>
      </section>
    </LegalPage>
  );
}
