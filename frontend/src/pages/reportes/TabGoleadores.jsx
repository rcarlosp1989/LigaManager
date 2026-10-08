import { useState, useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import EstadoError from '../../components/EstadoError'
import EmptyState from '../../components/EmptyState'

const TOPS = [5, 10, 20, 0] // 0 = todos

export default function TabGoleadores({ idCampeonato }) {
  const fid = useId()
  const [top, setTop] = useState(10)

  const { data: goleadores = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['estadisticas-goleadores', idCampeonato, top],
    queryFn: () => api.get(`/campeonatos/${idCampeonato}/estadisticas/goleadores`, {
      params: top > 0 ? { top } : {},
    }).then(r => r.data),
    enabled: !!idCampeonato,
  })

  if (isLoading) return <p className="text-gray-500 text-sm text-center py-10">Cargando goleadores...</p>
  if (isError) return <EstadoError mensaje="No se pudieron cargar los goleadores." onReintentar={refetch} reintentando={isFetching} />

  return (
    <div>
      <div className="flex items-center justify-end gap-2 mb-3">
        <label htmlFor={`${fid}-c1`} className="text-xs text-gray-400 uppercase tracking-wider">Top</label>
        <select id={`${fid}-c1`} className="input-field w-28" value={top} onChange={e => setTop(Number(e.target.value))}>
          {TOPS.map(t => <option key={t} value={t}>{t === 0 ? 'Todos' : t}</option>)}
        </select>
      </div>

      {goleadores.length === 0 ? (
        <EmptyState icon="⚽" title="Aún no hay goles registrados" description="El ranking aparecerá cuando se registren goles en partidos jugados." />
      ) : (
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-gray-800">
                  {['#', 'Jugador', 'Equipo', 'PJ', 'Goles', 'Prom.'].map(h => (
                    <th key={h} className="text-xs text-gray-500 uppercase tracking-wider px-3 py-2 text-center first:text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {goleadores.map((g, i) => (
                  <tr key={g.idJugador} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{g.jugador}</td>
                    <td className="px-3 py-2 text-gray-400">{g.equipo}</td>
                    <td className="px-3 py-2 text-gray-400 text-center">{g.partidosJugados}</td>
                    <td className="px-3 py-2 text-white font-semibold text-center">{g.goles}</td>
                    <td className="px-3 py-2 text-gray-400 text-center">{g.promedioPorPartido.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
