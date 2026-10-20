import TablaDesplazable from './TablaDesplazable'
import LogoEquipo from './LogoEquipo'
import { Diferencia, Puesto } from './Indicadores'

const COLOR_FORMA = {
  V: 'bg-green-500 text-green-950',
  E: 'bg-yellow-500 text-yellow-950',
  D: 'bg-red-500 text-red-950',
}

function CirculosForma({ forma }) {
  if (!forma || forma.length === 0) return <span className="text-gray-600 text-xs">—</span>
  return (
    <div className="flex items-center gap-1 justify-center">
      {forma.map((r, i) => (
        <span key={i} title={r === 'V' ? 'Victoria' : r === 'E' ? 'Empate' : 'Derrota'}
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${COLOR_FORMA[r]}`}>
          {r}
        </span>
      ))}
    </div>
  )
}

// Tabla de posiciones, la misma en Reportes, en los grupos y en la tabla general del campeonato.
//  - posiciones: filas del servidor (posicion, idEquipo, equipo, pj, pg, pe, pp, gf, gc, dg, pts, clasificado, forma).
//  - logos: Map idEquipo → logo.
//  - conForma: agrega la columna de los últimos resultados.
// El puesto y el equipo quedan fijos al deslizar la tabla en el celular.
export default function TablaPosiciones({ posiciones, logos, conForma = false }) {
  const columnas = ['PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'PTS', ...(conForma ? ['Forma'] : [])]
  return (
    <TablaDesplazable>
      <table className={`tabla w-full text-sm ${conForma ? 'min-w-[640px]' : 'min-w-[560px]'}`}>
        <thead>
          <tr className="border-b border-gray-800">
            <th scope="col" className="fija w-11 min-w-11 px-3 py-2 text-left text-xs uppercase tracking-wider">#</th>
            <th scope="col" className="fija fija-2 fija-borde px-3 py-2 text-left text-xs uppercase tracking-wider">Equipo</th>
            {columnas.map(h => (
              <th key={h} scope="col" className={`px-3 py-2 text-center text-xs uppercase tracking-wider ${h === 'PTS' ? 'col-pts text-brand-300' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {posiciones.map(p => (
            <tr key={p.idEquipo} className={`border-b border-gray-800/50 ${p.clasificado ? 'fila-destacada' : ''}`}>
              <td className="fija w-11 min-w-11 px-3 py-2"><Puesto n={p.posicion} clasificado={p.clasificado} /></td>
              <th scope="row" className="fija fija-2 fija-borde px-3 py-2 text-left font-medium text-white">
                <span className="flex items-center gap-2" title={p.equipo}>
                  <LogoEquipo nombre={p.equipo} logoUrl={logos?.get(p.idEquipo)} tamano={22} />
                  <span className="min-w-0 max-w-[8.5rem] truncate sm:max-w-[16rem]">{p.equipo}</span>
                </span>
              </th>
              <td className="px-3 py-2 text-center text-gray-300 tabular-nums">{p.pj}</td>
              <td className="px-3 py-2 text-center text-gray-400 tabular-nums">{p.pg}</td>
              <td className="px-3 py-2 text-center text-gray-400 tabular-nums">{p.pe}</td>
              <td className="px-3 py-2 text-center text-gray-400 tabular-nums">{p.pp}</td>
              <td className="px-3 py-2 text-center text-gray-400 tabular-nums">{p.gf}</td>
              <td className="px-3 py-2 text-center text-gray-400 tabular-nums">{p.gc}</td>
              <td className="px-3 py-2 text-center"><Diferencia valor={p.dg} /></td>
              <td className="col-pts px-3 py-2 text-center text-base font-bold text-white tabular-nums">{p.pts}</td>
              {conForma && <td className="px-3 py-2"><CirculosForma forma={p.forma} /></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </TablaDesplazable>
  )
}
