import TablaDesplazable from './TablaDesplazable'
import LogoEquipo from './LogoEquipo'
import { Diferencia, Puesto } from './Indicadores'

// Últimos resultados en español: G (ganó), E (empató), P (perdió). El servidor manda V/E/D.
const FORMA = {
  V: ['G', 'Ganó', 'text-emerald-400 border-emerald-400/50'],
  E: ['E', 'Empató', 'text-yellow-300 border-yellow-300/50'],
  D: ['P', 'Perdió', 'text-rose-400 border-rose-400/50'],
}

function Ultimos({ forma }) {
  if (!forma || forma.length === 0) return <span className="text-gray-400 text-xs">—</span>
  return (
    <span className="flex items-center justify-center gap-1">
      {forma.map((r, i) => {
        const [letra, nombre, color] = FORMA[r] ?? FORMA.E
        return (
          <span key={i} title={nombre}
            className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${color}`}>
            <span aria-hidden="true">{letra}</span><span className="sr-only">{nombre}</span>
          </span>
        )
      })}
    </span>
  )
}

// Tabla de posiciones, la misma en Reportes, en los grupos, en la tabla general y en los enlaces públicos.
//  - posiciones: filas del servidor (posicion, idEquipo, equipo, pj, pg, pe, pp, gf, gc, dg, pts, clasificado, forma).
//  - logos: Map idEquipo → logo.
//  - conForma: agrega la columna de los últimos resultados.
// Orden de columnas: J · GF:GC · +/- · PTS | G · E · P | Últimas. En el celular se ve sin deslizar hasta
// los puntos; el resto aparece al deslizar, con el puesto y el equipo fijos.
export default function TablaPosiciones({ posiciones, logos, conForma = false }) {
  const celda = 'px-1.5 sm:px-3 py-2 text-center tabular-nums'
  return (
    <TablaDesplazable>
      <table className={`tabla w-full text-sm [--ancho-fija-1:2rem] sm:[--ancho-fija-1:2.75rem] ${conForma ? 'min-w-[580px]' : 'min-w-[440px]'}`}>
        <thead>
          <tr className="border-b border-gray-800 text-xs uppercase tracking-wider">
            <th scope="col" className="fija w-8 min-w-8 px-1.5 sm:w-11 sm:min-w-11 sm:px-3 py-2 text-left">#</th>
            <th scope="col" className="fija fija-2 fija-borde px-1.5 sm:px-3 py-2 text-left">Equipo</th>
            <th scope="col" className={celda}><abbr title="Jugados" className="no-underline">J</abbr></th>
            <th scope="col" className={celda}><abbr title="Goles a favor y en contra" className="no-underline">GF:GC</abbr></th>
            <th scope="col" className={celda}><abbr title="Diferencia de goles" className="no-underline">+/-</abbr></th>
            <th scope="col" className={`${celda} col-pts text-brand-300`}><abbr title="Puntos" className="no-underline">PTS</abbr></th>
            <th scope="col" className={`${celda} border-l border-gray-800`}><abbr title="Ganados" className="no-underline">G</abbr></th>
            <th scope="col" className={celda}><abbr title="Empatados" className="no-underline">E</abbr></th>
            <th scope="col" className={celda}><abbr title="Perdidos" className="no-underline">P</abbr></th>
            {conForma && <th scope="col" className={`${celda} border-l border-gray-800`}>Últimas</th>}
          </tr>
        </thead>
        <tbody>
          {posiciones.map(p => (
            <tr key={p.idEquipo} className={`border-b border-gray-800/50 ${p.clasificado ? 'fila-destacada' : ''}`}>
              <td className="fija w-8 min-w-8 px-1.5 sm:w-11 sm:min-w-11 sm:px-3 py-2"><Puesto n={p.posicion} clasificado={p.clasificado} /></td>
              <th scope="row" className="fija fija-2 fija-borde px-1.5 sm:px-3 py-2 text-left font-medium text-white">
                <span className="flex items-center gap-1.5 sm:gap-2" title={p.equipo}>
                  <LogoEquipo nombre={p.equipo} logoUrl={logos?.get(p.idEquipo)} tamano={20} />
                  <span className="min-w-0 max-w-[6.5rem] truncate sm:max-w-[16rem]">{p.equipo}</span>
                </span>
              </th>
              <td className={`${celda} text-gray-300`}>{p.pj}</td>
              <td className={`${celda} whitespace-nowrap text-gray-300`}>{p.gf}:{p.gc}</td>
              <td className={celda}><Diferencia valor={p.dg} /></td>
              <td className={`${celda} col-pts text-base font-bold text-white`}>{p.pts}</td>
              <td className={`${celda} border-l border-gray-800 text-gray-400`}>{p.pg}</td>
              <td className={`${celda} text-gray-400`}>{p.pe}</td>
              <td className={`${celda} text-gray-400`}>{p.pp}</td>
              {conForma && <td className="border-l border-gray-800 px-2 sm:px-3 py-2"><Ultimos forma={p.forma} /></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </TablaDesplazable>
  )
}
