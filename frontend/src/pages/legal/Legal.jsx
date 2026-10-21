import { Link } from 'react-router-dom'

// Aviso de privacidad y términos de uso. Páginas públicas (no piden sesión).
// La fecha de los términos debe coincidir con Terminos.Version del servidor: al cambiar el texto
// se cambian las dos, y cada organizador debe aceptarlos de nuevo.
export const VERSION_TERMINOS = '2026-10-20'
const ACTUALIZADO = '20 de octubre de 2026'

function Pagina({ titulo, children }) {
  return (
    <div className="min-h-dvh bg-gray-950 px-4 py-10 text-gray-200">
      <article className="mx-auto max-w-2xl">
        <p className="font-display text-2xl tracking-widest text-white">LIGA<span className="text-brand-500">MANAGER</span></p>
        <h1 className="mt-6 font-display text-4xl tracking-wide text-white">{titulo}</h1>
        <p className="mt-1 text-sm text-gray-500">Última actualización: {ACTUALIZADO}</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
          {children}
        </div>
        <p className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link to="/privacidad" className="text-brand-400 hover:text-brand-300">Aviso de privacidad</Link>
          <Link to="/terminos" className="text-brand-400 hover:text-brand-300">Términos de uso</Link>
          <Link to="/login" className="text-brand-400 hover:text-brand-300">Volver a la aplicación</Link>
        </p>
      </article>
    </div>
  )
}

export function Privacidad() {
  return (
    <Pagina titulo="AVISO DE PRIVACIDAD">
      <section>
        <h2>Quién es responsable de los datos</h2>
        <p>
          LigaManager es una herramienta que usan organizaciones deportivas (ligas, clubes y comités de campeonato) para
          administrar sus torneos. <strong>Cada organización es la responsable del tratamiento</strong> de los datos personales
          que registra en la aplicación. LigaManager los guarda y procesa por cuenta de la organización y solo para los fines
          que se describen aquí.
        </p>
      </section>
      <section>
        <h2>Qué datos se guardan</h2>
        <ul>
          <li><strong>Jugadores:</strong> nombres y apellidos, tipo y número de documento de identidad, fecha de nacimiento, país y cantón, fotografía, equipo, dorsal y posición, y su participación en los partidos (alineaciones, goles, tarjetas y sanciones).</li>
          <li><strong>Árbitros y oficiales:</strong> nombres, documento (opcional), fecha de nacimiento y país.</li>
          <li><strong>Usuarios de la aplicación</strong> (organizadores, vocales y dirigentes): nombre y correo electrónico. La contraseña se guarda cifrada y nadie puede leerla.</li>
        </ul>
      </section>
      <section>
        <h2>Para qué se usan</h2>
        <p>
          Solo para organizar el campeonato: inscribir y verificar a los jugadores (identidad y edad), armar el calendario,
          registrar los partidos y generar tablas de posiciones, estadísticas, nóminas y sanciones. No se venden ni se usan
          para publicidad.
        </p>
      </section>
      <section>
        <h2>Autorización</h2>
        <p>
          Antes de registrar a un jugador, la organización declara que cuenta con su autorización para tratar sus datos o,
          si es menor de edad, con la de su padre, madre o representante legal. La organización debe poder demostrar esa
          autorización si se la piden.
        </p>
      </section>
      <section>
        <h2>Quién puede verlos</h2>
        <ul>
          <li>La organización que los registró. Otras organizaciones que usan la aplicación no los ven.</li>
          <li>Los vocales que la organización habilita: nombre, foto, dorsal y edad de los jugadores de los partidos que registran, sin el documento de identidad.</li>
          <li>Los dirigentes que la organización invita: la nómina de su propio equipo (nombre, foto, dorsal, posición y edad, sin el documento de identidad) y las tablas, estadísticas y sanciones del campeonato.</li>
          <li>Cualquier persona con el enlace público del campeonato, si la organización lo comparte: resultados, posiciones, goleadores, tarjetas y sanciones, con el jugador identificado por un nombre y un apellido, sin fotos, documentos ni nóminas.</li>
          <li>Quienes reciban los reportes en PDF o Excel que la organización descargue y comparta, bajo responsabilidad de la organización.</li>
        </ul>
      </section>
      <section>
        <h2>Cuánto tiempo se conservan</h2>
        <p>
          Mientras la organización los necesite para sus campeonatos y su historial deportivo, o hasta que pida eliminarlos.
        </p>
      </section>
      <section>
        <h2>Tus derechos</h2>
        <p>
          Conforme a la Ley Orgánica de Protección de Datos Personales del Ecuador, puedes pedir acceder a tus datos,
          corregirlos, eliminarlos, oponerte a su uso o recibir una copia. Dirige tu pedido a la organización de tu campeonato,
          que es quien los registró y puede atenderlo desde la aplicación.
        </p>
      </section>
      <section>
        <h2>Seguridad</h2>
        <p>
          La conexión con la aplicación va cifrada, las contraseñas se guardan cifradas y cada persona solo accede a lo que
          su rol le permite (organizador, vocal o dirigente).
        </p>
      </section>
    </Pagina>
  )
}

export function Terminos() {
  return (
    <Pagina titulo="TÉRMINOS DE USO">
      <p>
        Estos términos aplican a las organizaciones (ligas, clubes y comités) que crean una cuenta de organizador en
        LigaManager. Al aceptarlos, la organización declara que los conoce y está de acuerdo.
      </p>
      <section>
        <h2>1. La organización es la responsable de su campeonato</h2>
        <p>
          El reglamento, la configuración del campeonato, los resultados, las planillas, las sanciones y todas las decisiones
          deportivas y disciplinarias son <strong>responsabilidad exclusiva de la organización</strong> y de sus órganos
          (directiva, comisión disciplinaria, vocales y árbitros). LigaManager no organiza el campeonato ni toma decisiones.
        </p>
      </section>
      <section>
        <h2>2. LigaManager es una herramienta de apoyo</h2>
        <p>
          La aplicación calcula tablas de posiciones, acumulación de tarjetas y suspensiones a partir de lo que la
          organización registra y de las reglas que configura. Esos cálculos sirven de apoyo: <strong>no reemplazan las
          resoluciones de la organización</strong>, que debe revisarlos antes de aplicarlos. Si un dato está mal registrado o
          una regla no corresponde a su reglamento, el resultado también lo estará.
        </p>
      </section>
      <section>
        <h2>3. Datos personales</h2>
        <ul>
          <li>La organización es la responsable del tratamiento de los datos que registra (ver el <Link to="/privacidad" className="text-brand-400 hover:text-brand-300">aviso de privacidad</Link>).</li>
          <li>Antes de registrar a un jugador, debe contar con su autorización o, si es menor de edad, con la de su representante legal.</li>
          <li>Debe registrar datos verdaderos, mantenerlos al día y atender los pedidos de acceso, corrección o eliminación de sus jugadores.</li>
          <li>Es responsable del uso que se dé a los reportes que descarga y comparte.</li>
        </ul>
      </section>
      <section>
        <h2>4. Cuentas y accesos</h2>
        <p>
          La organización decide a quién invita como vocal o dirigente, y puede quitarle el acceso en cualquier momento.
          Cada persona es responsable de cuidar su contraseña y de lo que se haga con su cuenta.
        </p>
      </section>
      <section>
        <h2>5. Disponibilidad</h2>
        <p>
          Se procura que la aplicación funcione siempre, pero puede haber interrupciones o fallas. Conviene que la
          organización descargue y guarde los reportes importantes (PDF o Excel).
        </p>
      </section>
      <section>
        <h2>6. Cambios</h2>
        <p>
          Si estos términos cambian, la aplicación pedirá aceptarlos de nuevo antes de seguir usándola.
        </p>
      </section>
    </Pagina>
  )
}
