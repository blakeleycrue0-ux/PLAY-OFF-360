import type { Metadata } from "next";
import LegalPage, { Dato, Ficha } from "@/components/legal/LegalPage";
import { ALOJAMIENTO, DOMINIO, TITULAR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Aviso legal",
  description:
    "Datos identificativos del titular de PLAYOFF30 y condiciones de acceso y uso del sitio web.",
  robots: { index: true, follow: true },
};

const SECCIONES = [
  { id: "titular", titulo: "1. Titular del sitio" },
  { id: "objeto", titulo: "2. Objeto" },
  { id: "ficcion", titulo: "3. Contenido de demostración" },
  { id: "acceso", titulo: "4. Acceso y uso" },
  { id: "propiedad", titulo: "5. Propiedad intelectual" },
  { id: "enlaces", titulo: "6. Enlaces" },
  { id: "responsabilidad", titulo: "7. Responsabilidad" },
  { id: "ley", titulo: "8. Ley aplicable" },
];

export default function Page() {
  return (
    <LegalPage
      titulo="Aviso legal"
      entradilla="Titularidad y condiciones de uso"
      secciones={SECCIONES}
    >
      <section>
        <h2 id="titular">1. Titular del sitio</h2>
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de servicios
          de la sociedad de la información y de comercio electrónico (LSSI-CE), se hacen
          constar los siguientes datos identificativos del titular de este sitio web:
        </p>
        <Ficha>
          <Dato etiqueta="Titular" valor={TITULAR.nombre} />
          <Dato etiqueta="Nombre comercial" valor={TITULAR.nombreComercial} />
          <Dato etiqueta="NIF / CIF" valor={TITULAR.nif} />
          <Dato etiqueta="Domicilio" valor={TITULAR.domicilio} />
          <Dato etiqueta="Correo electrónico" valor={TITULAR.email} />
          <Dato etiqueta="Teléfono" valor={TITULAR.telefono} />
          <Dato etiqueta="Registro" valor={TITULAR.registro} />
          <Dato etiqueta="Sitio web" valor={DOMINIO} />
        </Ficha>
        <p>
          Para cualquier consulta relacionada con este aviso legal puedes escribir a la
          dirección de correo indicada.
        </p>
      </section>

      <section>
        <h2 id="objeto">2. Objeto</h2>
        <p>
          Este sitio web tiene una finalidad exclusivamente informativa: presentar
          PLAYOFF30, un software de gestión para equipos de fútbol que se encuentra en
          desarrollo. A través de estas páginas no se comercializa ningún producto ni
          servicio, no se formalizan contratos y no se prestan servicios en línea.
        </p>
        <p>
          El acceso al sitio es libre y gratuito, y atribuye a quien lo visita la
          condición de usuario, lo que implica la aceptación de las condiciones recogidas
          en este aviso legal.
        </p>
      </section>

      <section>
        <h2 id="ficcion">3. Contenido de demostración</h2>
        <p>
          <strong>
            Todos los clubes, equipos, competiciones, campos, jugadores, familias y
            miembros del cuerpo técnico que aparecen en este sitio son ficticios.
          </strong>{" "}
          Se han creado únicamente para ilustrar cómo funcionaría el producto, y las
          pantallas que se muestran son maquetas, no capturas de un sistema en uso con
          datos reales.
        </p>
        <p>
          Cualquier parecido con clubes, entidades deportivas o personas reales es pura
          coincidencia y no implica relación, patrocinio ni vinculación alguna con ellos.
          Si detectas una coincidencia que pueda inducir a confusión, escríbenos y la
          cambiaremos.
        </p>
        <p>
          Del mismo modo, las cifras que aparecen en las pantallas de ejemplo pertenecen a
          ese equipo ficticio y no representan datos de uso, de clientes ni de negocio.
        </p>
      </section>

      <section>
        <h2 id="acceso">4. Acceso y uso</h2>
        <p>
          El usuario se compromete a hacer un uso diligente del sitio y de la información
          que contiene, conforme a la ley, a este aviso legal y al resto de textos legales
          publicados. En particular, se compromete a no:
        </p>
        <ul>
          <li>
            Utilizar el sitio con fines ilícitos o lesivos para los derechos e intereses
            de terceros.
          </li>
          <li>
            Introducir o difundir código malicioso, ni realizar acciones que puedan dañar,
            inutilizar o sobrecargar el sitio o impedir su uso normal.
          </li>
          <li>
            Intentar acceder a áreas restringidas, a los sistemas de información del
            titular o a los de terceros.
          </li>
          <li>
            Extraer, reproducir o reutilizar de forma sistemática el contenido del sitio,
            incluida la extracción automatizada de datos.
          </li>
        </ul>
      </section>

      <section>
        <h2 id="propiedad">5. Propiedad intelectual e industrial</h2>
        <p>
          El diseño del sitio, sus textos, la marca y el logotipo PLAYOFF30, las
          interfaces que se muestran, los gráficos, la selección y disposición de los
          contenidos y el código fuente son titularidad del titular del sitio o de
          terceros que han autorizado su uso, y están protegidos por la normativa de
          propiedad intelectual e industrial.
        </p>
        <p>
          No se concede ninguna licencia ni autorización de uso sobre ellos más allá de lo
          estrictamente necesario para navegar por el sitio. Queda prohibida su
          reproducción, distribución, comunicación pública o transformación sin
          autorización expresa y por escrito.
        </p>
        <p>
          Las tipografías empleadas se utilizan bajo la licencia SIL Open Font License de
          sus respectivos autores.
        </p>
      </section>

      <section>
        <h2 id="enlaces">6. Enlaces</h2>
        <p>
          El sitio puede incluir enlaces a páginas de terceros. El titular no controla ni
          responde de sus contenidos, políticas ni prácticas, y la existencia del enlace
          no implica recomendación ni relación con ellos.
        </p>
        <p>
          Quien desee enlazar a este sitio podrá hacerlo hacia su página principal, sin
          reproducir su contenido, sin generar confusión sobre el origen del servicio y
          sin realizar manifestaciones inexactas o denigratorias sobre el titular.
        </p>
      </section>

      <section>
        <h2 id="responsabilidad">7. Exclusión de responsabilidad</h2>
        <p>
          El titular procura que la información publicada sea correcta y esté actualizada,
          pero no garantiza la ausencia de errores ni la disponibilidad ininterrumpida del
          sitio, que se aloja en servidores de {ALOJAMIENTO.nombre}. Podrá modificar,
          suspender o retirar sus contenidos en cualquier momento y sin previo aviso.
        </p>
        <p>
          La información sobre funcionalidades corresponde a un producto en desarrollo y
          no constituye una oferta vinculante ni un compromiso sobre características,
          plazos o condiciones futuras.
        </p>
      </section>

      <section>
        <h2 id="ley">8. Ley aplicable y jurisdicción</h2>
        <p>
          Este aviso legal se rige por la legislación española. Para la resolución de
          cualquier controversia, las partes se someten a los juzgados y tribunales que
          resulten competentes conforme a la normativa aplicable. Cuando el usuario tenga
          la condición de consumidor, serán competentes los tribunales de su domicilio.
        </p>
      </section>
    </LegalPage>
  );
}
