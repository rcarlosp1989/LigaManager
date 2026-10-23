import { useState, useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import EstadoError from '../../components/EstadoError'
import EmptyState from '../../components/EmptyState'
import TablaDesplazable from '../../components/TablaDesplazable'
import { Balon } from '../../components/IconoEvento'
import FotoJugador from '../../components/FotoJugador'
import { Puesto, ValorConBarra } from '../../components/Indicadores'

const TOPS = [5, 10, 20, 0] // 0 = todos

// simple: para el dirigente y el enlace público, solo jugador, equipo y goles (sin PJ ni promedio).
export default function TabGoleadores({ idCampeonato, base = `/campeonatos/${idCampeonato}`, simple = false }) {
  const fid = useId()
  const [top, setTop] = useState(10)

  const { data: goleadores = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['estadisticas-goleadores', idCampeonato, top, base],
    queryFn: () => api.get(`${base}/estadisticas/goleadores`, {
      params: top > 0 ? { top } : {},
    }).then(r => r.data),
    enabled: !!idCampeonato,
  })

  const maxGoles = Math.max(0, ...goleadores.map(g => g.goles))
  const columnas = simple ? ['Equipo', 'Goles'] : ['Equipo', 'PJ', 'Goles', 'Prom.']

  if (isLoading) return <p className="text-gray-500 text-sm text-center py-10">Cargando goleadores...</p>
  if (isError) return <EstadoError mensaje="No se pudieron cargar los goleadores." onReintentar={refetch} reintentando={isFetching} />

  return (
    <div>
      <div className="flex items-center justify-end gap-2 mb-3">
        <label htmlFor={`${fid}-c1`} className="text-xs text-gray-400 uppercase tracking-wider">Top</label>
        <select id={`${fid}-c1`} className="input-field" style={{ width: '7rem' }} value={top} onChange={e => setTop(Number(e.target.value))}>
          {TOPS.map(t => <option key={t} value={t}>{t === 0 ? 'Todos' : t}</option>)}
        </select>
      </div>

      {goleadores.length === 0 ? (
        <EmptyState icon={Balon} title="Aún no hay goles registrados" description="El ranking aparecerá cuando se registren goles en partidos jugados." />
      ) : (
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <TablaDesplazable>
            <table className={`tabla w-full text-sm ${simple ? 'min-w-[380px]' : 'min-w-[520px]'}`}>
              <thead>
                <tr className="border-b border-gray-800">
                  <th scope="col" className="fija w-11 min-w-11 px-3 py-2 text-left text-xs uppercase tracking-wider">#</th>
                  <th scope="col" className="fija fija-2 fija-borde px-3 py-2 text-left text-xs uppercase tracking-wider">Jugador</th>
                  {columnas.map(h => (
                    <th key={h} scope="col" className={`px-3 py-2 text-xs uppercase tracking-wider ${h === 'Equipo' ? 'text-left' : 'text-center'} ${h === 'Goles' ? 'text-brand-300' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {goleadores.map((g, i) => (
                  <tr key={g.idJugador} className="border-b border-gray-800/50">
                    <td className="fija w-11 min-w-11 px-3 py-2"><Puesto n={i + 1} medallas /></td>
                    <th scope="row" className="fija fija-2 fija-borde px-3 py-2 text-left font-medium text-white">
                      <span className="flex items-center gap-2" title={g.jugador}><FotoJugador nombre={g.jugador} fotoUrl={g.fotoUrl} tamano={28} /><span className="min-w-0 max-w-[8.5rem] truncate sm:max-w-[16rem]">{g.jugador}</span></span>
                    </th>
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{g.equipo}</td>
                    {!simple && <td className="px-3 py-2 text-gray-400 text-center tabular-nums">{g.partidosJugados}</td>}
                    <td className="px-3 py-2 text-center"><ValorConBarra valor={g.goles} maximo={maxGoles} /></td>
                    {!simple && <td className="px-3 py-2 text-gray-400 text-center tabular-nums">{g.promedioPorPartido.toFixed(2)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </TablaDesplazable>
        </div>
      )}
    </div>
  )
}
