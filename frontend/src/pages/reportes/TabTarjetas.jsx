import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import EstadoError from '../../components/EstadoError'
import EmptyState from '../../components/EmptyState'

export default function TabTarjetas({ idCampeonato }) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['estadisticas-tarjetas', idCampeonato],
    queryFn: () => api.get(`/campeonatos/${idCampeonato}/estadisticas/tarjetas`).then(r => r.data),
    enabled: !!idCampeonato,
  })

  if (isLoading) return <p className="text-gray-500 text-sm text-center py-10">Cargando tarjetas...</p>
  if (isError) return <EstadoError mensaje="No se pudieron cargar las tarjetas." onReintentar={refetch} reintentando={isFetching} />

  const porJugador = data?.porJugador ?? []
  const porEquipo = data?.porEquipo ?? []

  if (porJugador.length === 0) {
    return <EmptyState icon="🟨" title="Aún no hay tarjetas registradas" description="Las tablas aparecerán cuando se registren tarjetas en partidos jugados." />
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Por jugador</h3>
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Jugador', 'Equipo', '🟨', '🟥', 'Total'].map(h => (
                    <th key={h} className="text-xs text-gray-500 uppercase tracking-wider px-3 py-2 text-center first:text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {porJugador.map(j => (
                  <tr key={j.idJugador} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{j.jugador}</td>
                    <td className="px-3 py-2 text-gray-400">{j.equipo}</td>
                    <td className="px-3 py-2 text-yellow-400 text-center">{j.amarillas}</td>
                    <td className="px-3 py-2 text-red-400 text-center">{j.rojas}</td>
                    <td className="px-3 py-2 text-white font-semibold text-center">{j.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Fair play por equipo</h3>
        <p className="text-gray-600 text-xs mb-2">Amarilla = 1 punto · Roja = 3 puntos · Menor puntaje es mejor</p>
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[380px]">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Equipo', '🟨', '🟥', 'Pts'].map(h => (
                    <th key={h} className="text-xs text-gray-500 uppercase tracking-wider px-3 py-2 text-center first:text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {porEquipo.map(e => (
                  <tr key={e.idEquipo} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{e.equipo}</td>
                    <td className="px-3 py-2 text-yellow-400 text-center">{e.amarillas}</td>
                    <td className="px-3 py-2 text-red-400 text-center">{e.rojas}</td>
                    <td className="px-3 py-2 text-white font-semibold text-center">{e.puntosFairPlay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
