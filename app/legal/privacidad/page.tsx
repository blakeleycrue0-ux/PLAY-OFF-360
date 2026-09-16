import type { Metadata } from "next";
import LegalPage, { Dato, Ficha } from "@/components/legal/LegalPage";
import { ALOJAMIENTO, TITULAR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Qué datos personales trata PLAYOFF30 a través de su sitio web, con qué base jurídica y cómo ejercer tus derechos.",
  robots: { index: true, follow: true },
};

const SECCIONES = [
  { id: "responsable", titulo: "1. Responsable" },
  { id: "datos", titulo: "2. Qué datos tratamos" },
  { id: "finalidades", titulo: "3. Finalidades y base jurídica" },
  { id: "conservacion", titulo: "4. Conservación" },
  { id: "destinatarios", titulo: "5. Destinatarios" },
  { id: "transferencias", titulo: "6. Transferencias internacionales" },
  { id: "derechos", titulo: "7. Tus derechos" },
  { id: "menores", titulo: "8. Menores de edad" },
  { id: "seguridad", titulo: "9. Seguridad" },
  { id: "cambios", titulo: "10. Cambios" },
];

export default function Page() {
  return (
    <LegalPage
      titulo="Política de privacidad"
      entradilla="Tratamiento de datos personales"
      secciones={SECCIONES}
    >
      <section>
        <h2 id="responsable">1. Responsable del tratamiento</h2>
        <Ficha>
          <Dato etiqueta="Responsable" valor={TITULAR.nombre} />
          <Dato etiqueta="NIF / CIF" valor={TITULAR.nif} />
          <Dato etiqueta="Domicilio" valor={TITULAR.domicilio} />
          <Dato etiqueta="Correo electrónico" valor={TITULAR.email} />
        </Ficha>
        <p>
          Esta política explica cómo se tratan los datos personales de quienes visitan
          este sitio web, conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica
          3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los
          derechos digitales (LOPDGDD).
        </p>
      </section>

      <section>
        <h2 id="datos">2. Qué datos tratamos</h2>
        <p>
          Este sitio es una página informativa.{" "}
          <strong>
            No incluye formularios de contacto, registro, suscripción ni área privada
          </strong>
          , por lo que no recogemos datos que tú nos facilites activamente a través de él.
        </p>
        <p>Los únicos tratamientos que se producen hoy son:</p>
        <ul>
          <li>
            <strong>Registros de servidor.</strong> El proveedor de alojamiento registra
            de forma automática datos técnicos de cada petición, como la dirección IP, la
            fecha y hora, la página solicitada, el tipo de navegador y el sistema
            operativo. Son necesarios para prestar el servicio, mantener la seguridad y
            detectar incidencias.
          </li>
          <li>
            <strong>Preferencia de cookies.</strong> Tu decisión sobre el aviso de cookies
            se guarda en el almacenamiento local de tu propio navegador. No se envía a
            ningún servidor ni nos permite identificarte.
          </li>
          <li>
            <strong>Correos que nos escribas.</strong> Si nos contactas por correo
            electrónico, trataremos los datos que incluyas en tu mensaje para poder
            responderte.
          </li>
        </ul>
        <p>
          No utilizamos herramientas de analítica web, ni píxeles publicitarios, ni
          elaboramos perfiles, ni tomamos decisiones automatizadas con efectos jurídicos.
        </p>
      </section>

      <section>
        <h2 id="finalidades">3. Finalidades y base jurídica</h2>
        <h3>Prestar y mantener el sitio web</h3>
        <p>
          Finalidad: servir las páginas, garantizar la seguridad de la infraestructura y
          resolver incidencias técnicas. Base jurídica: interés legítimo del responsable
          en mantener un sitio web funcional y seguro (art. 6.1.f RGPD).
        </p>
        <h3>Recordar tu decisión sobre cookies</h3>
        <p>
          Finalidad: no volver a mostrarte el aviso en cada visita. Base jurídica: interés
          legítimo en respetar la decisión que has tomado (art. 6.1.f RGPD). El
          almacenamiento empleado es estrictamente necesario para esa finalidad.
        </p>
        <h3>Responder a tus comunicaciones</h3>
        <p>
          Finalidad: atender las consultas que nos envíes. Base jurídica: tu
          consentimiento al dirigirte a nosotros y el interés legítimo en responder (arts.
          6.1.a y 6.1.f RGPD).
        </p>
      </section>

      <section>
        <h2 id="conservacion">4. Plazos de conservación</h2>
        <ul>
          <li>
            Registros de servidor: durante el plazo que aplique el proveedor de
            alojamiento, normalmente limitado a unas semanas o meses, y después se
            eliminan o se agregan de forma que no permitan identificar a nadie.
          </li>
          <li>
            Preferencia de cookies: permanece en tu navegador hasta que la cambies o
            borres los datos del sitio. Puedes revocarla en cualquier momento desde el
            enlace «Preferencias de cookies» del pie de página.
          </li>
          <li>
            Correos electrónicos: mientras dure la relación y, después, durante los plazos
            de prescripción legal que resulten aplicables.
          </li>
        </ul>
      </section>

      <section>
        <h2 id="destinatarios">5. Destinatarios</h2>
        <p>
          No cedemos datos personales a terceros, salvo obligación legal. Sí intervienen
          proveedores que actúan como encargados del tratamiento y que acceden a los datos
          únicamente para prestarnos su servicio:
        </p>
        <ul>
          <li>
            <strong>{ALOJAMIENTO.nombre}</strong> — alojamiento y distribución del sitio
            web.
          </li>
          <li>
            El proveedor del correo electrónico que utilices para escribirnos, en su caso.
          </li>
        </ul>
      </section>

      <section>
        <h2 id="transferencias">6. Transferencias internacionales</h2>
        <p>
          El sitio está alojado en {ALOJAMIENTO.nombre}, con sede en {ALOJAMIENTO.pais},
          lo que puede suponer una transferencia internacional de datos fuera del Espacio
          Económico Europeo. Estas transferencias se amparan en las garantías previstas en
          el capítulo V del RGPD, como las cláusulas contractuales tipo aprobadas por la
          Comisión Europea.
        </p>
      </section>

      <section>
        <h2 id="derechos">7. Tus derechos</h2>
        <p>
          Puedes ejercer en cualquier momento los derechos de <strong>acceso</strong>,{" "}
          <strong>rectificación</strong>, <strong>supresión</strong>,{" "}
          <strong>oposición</strong>, <strong>limitación del tratamiento</strong> y{" "}
          <strong>portabilidad</strong>, así como retirar el consentimiento que hubieras
          prestado, sin que ello afecte a la licitud del tratamiento previo.
        </p>
        <p>
          Para ejercerlos, escribe a la dirección de correo indicada en el apartado 1
          señalando el derecho que deseas ejercer. Podremos solicitarte que acredites tu
          identidad.
        </p>
        <p>
          Si consideras que el tratamiento no se ajusta a la normativa, puedes presentar
          una reclamación ante la Agencia Española de Protección de Datos (
          <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">
            aepd.es
          </a>
          ), C/ Jorge Juan 6, 28001 Madrid.
        </p>
      </section>

      <section>
        <h2 id="menores">8. Menores de edad</h2>
        <p>
          Este sitio web se dirige a personas adultas: entrenadores, delegados,
          coordinadores y responsables de clubes. No está destinado a menores y no recoge
          datos de menores a través de estas páginas.
        </p>
        <p>
          PLAYOFF30 es un producto pensado para el fútbol base, de modo que, cuando la
          aplicación esté disponible, el tratamiento de datos de menores se realizará por
          cuenta de cada club y con la intervención de sus padres, madres o tutores
          legales, conforme al artículo 8 del RGPD y al artículo 7 de la LOPDGDD. Esa
          relación se regulará en el contrato correspondiente y no está cubierta por esta
          política, que se refiere únicamente al sitio web.
        </p>
      </section>

      <section>
        <h2 id="seguridad">9. Medidas de seguridad</h2>
        <p>
          El sitio se sirve mediante conexión cifrada (HTTPS) y aplicamos medidas técnicas
          y organizativas razonables para proteger la información frente a accesos no
          autorizados, pérdida o alteración. Ningún sistema es infalible, pero mantenemos
          el software actualizado y limitamos los datos tratados al mínimo necesario.
        </p>
      </section>

      <section>
        <h2 id="cambios">10. Cambios en esta política</h2>
        <p>
          Podemos actualizar esta política si cambian los servicios, la normativa o las
          herramientas que utilizamos. La versión vigente será siempre la publicada en
          esta página, con su fecha de última actualización indicada arriba.
        </p>
      </section>
    </LegalPage>
  );
}
