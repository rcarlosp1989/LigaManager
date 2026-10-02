import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import EmptyState from '../../components/EmptyState'

export default function TabSuspensiones({ idCampeonato }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['estadisticas-suspensiones', idCampeonato],
    queryFn: () => api.get(`/campeonatos/${idCampeonato}/estadisticas/suspensiones`).then(r => r.data),
    enabled: !!idCampeonato,
  })

  if (isLoading) return <p className="text-gray-500 text-sm text-center py-10">Cargando suspensiones...</p>
  if (isError) return <p className="text-red-400 text-sm text-center py-10">No se pudieron cargar las suspensiones.</p>

  const sanciones = data?.sanciones ?? []
  const enRiesgo = data?.enRiesgo ?? []

  if (sanciones.length === 0 && enRiesgo.length === 0) {
    return <EmptyState icon="🚫" title="No hay sanciones ni jugadores en riesgo" description="Esta sección se actualiza con las tarjetas de los partidos jugados." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sanciones</h3>
        {sanciones.length === 0 ? (
          <p className="text-gray-600 text-sm">Sin sanciones registradas.</p>
        ) : (
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Jugador', 'Equipo', 'Motivo', 'Partido', 'Partidos', 'Estado'].map(h => (
                      <th key={h} className="text-xs text-gray-500 uppercase tracking-wider px-3 py-2 text-center first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sanciones.map((s, i) => (
                    <tr key={`${s.idJugador}-${s.idPartidoSancion}-${i}`} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{s.jugador}</td>
                      <td className="px-3 py-2 text-gray-400">{s.equipo}</td>
                      <td className="px-3 py-2 text-gray-300">{s.motivo}</td>
                      <td className="px-3 py-2 text-gray-500 text-center text-xs">{s.fechaPartidoSancion}</td>
                      <td className="px-3 py-2 text-gray-400 text-center">{s.partidosSancion}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          s.estado === 'Suspendido' ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
                        }`}>{s.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">En riesgo de sanción</h3>
        {enRiesgo.length === 0 ? (
          <p className="text-gray-600 text-sm">Nadie está a una amarilla de la sanción por acumulación.</p>
        ) : (
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[380px]">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Jugador', 'Equipo', 'Amarillas acumuladas'].map(h => (
                      <th key={h} className="text-xs text-gray-500 uppercase tracking-wider px-3 py-2 text-center first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enRiesgo.map(r => (
                    <tr key={r.idJugador} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{r.jugador}</td>
                      <td className="px-3 py-2 text-gray-400">{r.equipo}</td>
                      <td className="px-3 py-2 text-yellow-400 text-center font-semibold">{r.amarillasAcumuladas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
