import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { TITULAR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Términos de uso",
  description:
    "Condiciones que regulan el acceso y la utilización del sitio web de PLAYOFF30.",
  robots: { index: true, follow: true },
};

const SECCIONES = [
  { id: "objeto", titulo: "1. Objeto y aceptación" },
  { id: "servicio", titulo: "2. Naturaleza del sitio" },
  { id: "producto", titulo: "3. Producto en desarrollo" },
  { id: "obligaciones", titulo: "4. Obligaciones del usuario" },
  { id: "disponibilidad", titulo: "5. Disponibilidad" },
  { id: "propiedad", titulo: "6. Propiedad intelectual" },
  { id: "responsabilidad", titulo: "7. Responsabilidad" },
  { id: "modificaciones", titulo: "8. Modificaciones" },
  { id: "ley", titulo: "9. Ley aplicable" },
];

export default function Page() {
  return (
    <LegalPage
      titulo="Términos de uso"
      entradilla="Condiciones de acceso al sitio"
      secciones={SECCIONES}
    >
      <section>
        <h2 id="objeto">1. Objeto y aceptación</h2>
        <p>
          Estos términos regulan el acceso y la utilización del sitio web de PLAYOFF30,
          titularidad de {TITULAR.nombre}. Navegar por él supone aceptarlos en su
          integridad, junto con el <a href="/legal/aviso-legal/">aviso legal</a>, la{" "}
          <a href="/legal/privacidad/">política de privacidad</a> y la{" "}
          <a href="/legal/cookies/">política de cookies</a>.
        </p>
        <p>Si no estás de acuerdo con alguno de estos textos, no utilices el sitio.</p>
      </section>

      <section>
        <h2 id="servicio">2. Naturaleza del sitio</h2>
        <p>
          Este sitio es una página de presentación. Su finalidad es describir un producto
          en desarrollo. A través de él:
        </p>
        <ul>
          <li>No se vende ni se contrata ningún producto o servicio.</li>
          <li>No se crean cuentas de usuario ni se accede a ninguna aplicación.</li>
          <li>No se recogen datos mediante formularios.</li>
        </ul>
        <p>
          Los botones de llamada a la acción son, por ahora, elementos de navegación
          dentro de la propia página.
        </p>
      </section>

      <section>
        <h2 id="producto">3. Producto en desarrollo</h2>
        <p>
          Las funcionalidades descritas corresponden a un producto que todavía no está
          disponible. La información publicada tiene carácter ilustrativo y{" "}
          <strong>no constituye una oferta vinculante</strong> ni un compromiso sobre
          características concretas, plazos de lanzamiento, precios o condiciones de
          servicio.
        </p>
        <p>
          Las pantallas que se muestran son maquetas con datos ficticios, según se detalla
          en el apartado 3 del <a href="/legal/aviso-legal/">aviso legal</a>.
        </p>
        <p>
          Cuando el producto esté disponible, su uso se regirá por unas condiciones de
          contratación específicas, distintas de estos términos, que incluirán el
          correspondiente contrato de encargo de tratamiento cuando proceda.
        </p>
      </section>

      <section>
        <h2 id="obligaciones">4. Obligaciones del usuario</h2>
        <p>Al utilizar el sitio te comprometes a:</p>
        <ul>
          <li>Hacer un uso conforme a la ley, a la buena fe y a estos términos.</li>
          <li>
            No realizar acciones que puedan dañar, sobrecargar o deteriorar el sitio o
            impedir su normal utilización.
          </li>
          <li>
            No emplear medios automatizados para extraer contenidos de forma masiva ni
            para reproducir el sitio total o parcialmente.
          </li>
          <li>
            No suplantar la identidad del titular ni presentar el contenido como propio.
          </li>
        </ul>
      </section>

      <section>
        <h2 id="disponibilidad">5. Disponibilidad</h2>
        <p>
          El titular procura mantener el sitio accesible de forma continuada, pero no
          garantiza su disponibilidad ininterrumpida ni la ausencia de errores. Podrá
          interrumpir el acceso por motivos técnicos, de mantenimiento o de seguridad, sin
          que ello genere derecho a indemnización.
        </p>
      </section>

      <section>
        <h2 id="propiedad">6. Propiedad intelectual</h2>
        <p>
          Todos los contenidos del sitio —textos, diseño, marca, logotipo, interfaces,
          gráficos y código— están protegidos por la normativa de propiedad intelectual e
          industrial, conforme a lo indicado en el{" "}
          <a href="/legal/aviso-legal/">aviso legal</a>. Su uso sin autorización expresa
          está prohibido.
        </p>
      </section>

      <section>
        <h2 id="responsabilidad">7. Responsabilidad</h2>
        <p>
          El titular no responde de los daños derivados del uso indebido del sitio, de la
          imposibilidad de acceder a él, de la presencia de virus introducidos por
          terceros ni de los contenidos alojados en páginas enlazadas.
        </p>
        <p>
          Tampoco responde de decisiones que el usuario adopte basándose en la información
          publicada sobre un producto que aún se encuentra en desarrollo.
        </p>
      </section>

      <section>
        <h2 id="modificaciones">8. Modificaciones</h2>
        <p>
          El titular puede modificar estos términos y el contenido del sitio en cualquier
          momento. La versión aplicable será la publicada en el momento del acceso, con la
          fecha de actualización indicada al inicio de esta página.
        </p>
      </section>

      <section>
        <h2 id="ley">9. Ley aplicable y jurisdicción</h2>
        <p>
          Estos términos se rigen por la legislación española. Para cualquier
          controversia, las partes se someten a los juzgados y tribunales competentes
          conforme a la normativa aplicable; si el usuario tiene la condición de
          consumidor, los de su domicilio.
        </p>
      </section>
    </LegalPage>
  );
}
