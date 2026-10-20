import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import EstadoError from '../../components/EstadoError'
import EmptyState from '../../components/EmptyState'
import TablaDesplazable from '../../components/TablaDesplazable'
import { RectangleVertical } from 'lucide-react'
import IconoEvento from '../../components/IconoEvento'
import FotoJugador from '../../components/FotoJugador'
import { ConteoTarjetas } from '../../components/Indicadores'

// Encabezado de columna: las tarjetas se dibujan, con su nombre para lectores de pantalla.
const encabezado = (h) => (h.startsWith('TARJETA_')
  ? <><IconoEvento tipo={h} className="text-sm" /><span className="sr-only">{h === 'TARJETA_ROJA' ? 'Rojas' : 'Amarillas'}</span></>
  : h)

// Amarillas que cuentan para la próxima suspensión, «2 de 5». A una del límite, en ámbar.
function Acumuladas({ valor, limite }) {
  const alLimite = valor > 0 && valor >= limite - 1
  const estilo = alLimite
    ? 'bg-amber-400/15 text-amber-300 ring-amber-400/40 font-semibold'
    : valor > 0 ? 'bg-yellow-400/10 text-yellow-200 ring-yellow-400/20' : 'text-gray-600 ring-transparent'
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs tabular-nums ring-1 ring-inset ${estilo}`}
      title={alLimite ? 'Con una amarilla más queda suspendido' : undefined}>
      {valor}<span className="opacity-60">/{limite}</span>
      {alLimite && <span className="sr-only">(a una de la suspensión)</span>}
    </span>
  )
}

export default function TabTarjetas({ idCampeonato, base = `/campeonatos/${idCampeonato}` }) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['estadisticas-tarjetas', idCampeonato, base],
    queryFn: () => api.get(`${base}/estadisticas/tarjetas`).then(r => r.data),
    enabled: !!idCampeonato,
  })

  if (isLoading) return <p className="text-gray-500 text-sm text-center py-10">Cargando tarjetas...</p>
  if (isError) return <EstadoError mensaje="No se pudieron cargar las tarjetas." onReintentar={refetch} reintentando={isFetching} />

  const porJugador = data?.porJugador ?? []
  const porEquipo = data?.porEquipo ?? []
  const limite = data?.amarillasParaSuspension || 5

  if (porJugador.length === 0) {
    return <EmptyState icon={RectangleVertical} title="Aún no hay tarjetas registradas" description="Las tablas aparecerán cuando se registren tarjetas en partidos jugados." />
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Por jugador</h3>
        <p className="text-gray-500 text-xs mb-2">
          <strong className="font-semibold text-gray-300">Acumuladas</strong>: las amarillas que cuentan para la próxima suspensión;
          vuelven a 0 al llegar a {limite}. Amarillas, rojas y total: todas las del campeonato.
        </p>
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <TablaDesplazable>
            <table className="tabla w-full text-sm min-w-[540px]">
              <thead>
                <tr className="border-b border-gray-800">
                  <th scope="col" className="fija fija-borde px-3 py-2 text-left text-xs uppercase tracking-wider">Jugador</th>
                  {['Equipo', 'Acumuladas', 'TARJETA_AMARILLA', 'TARJETA_ROJA', 'Total'].map(h => (
                    <th key={h} scope="col" className={`px-3 py-2 text-xs uppercase tracking-wider ${h === 'Equipo' ? 'text-left' : 'text-center'}`}>{encabezado(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {porJugador.map(j => (
                  <tr key={j.idJugador} className="border-b border-gray-800/50">
                    <th scope="row" className="fija fija-borde px-3 py-2 text-left font-medium text-white">
                      <span className="flex items-center gap-2" title={j.jugador}><FotoJugador nombre={j.jugador} fotoUrl={j.fotoUrl} tamano={28} /><span className="min-w-0 max-w-[9rem] truncate sm:max-w-[14rem]">{j.jugador}</span></span>
                    </th>
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{j.equipo}</td>
                    <td className="px-3 py-2 text-center"><Acumuladas valor={j.amarillasAcumuladas ?? 0} limite={limite} /></td>
                    <td className="px-3 py-2 text-center"><ConteoTarjetas valor={j.amarillas} tipo="amarilla" /></td>
                    <td className="px-3 py-2 text-center"><ConteoTarjetas valor={j.rojas} tipo="roja" /></td>
                    <td className="px-3 py-2 text-white font-semibold text-center tabular-nums">{j.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablaDesplazable>
        </div>
      </div>

      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Fair play por equipo</h3>
        <p className="text-gray-600 text-xs mb-2">Amarilla = 1 punto · Roja = 3 puntos · Menor puntaje es mejor</p>
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <TablaDesplazable>
            <table className="tabla w-full text-sm min-w-[340px]">
              <thead>
                <tr className="border-b border-gray-800">
                  <th scope="col" className="fija fija-borde px-3 py-2 text-left text-xs uppercase tracking-wider">Equipo</th>
                  {['TARJETA_AMARILLA', 'TARJETA_ROJA', 'Pts'].map(h => (
                    <th key={h} scope="col" className="px-3 py-2 text-center text-xs uppercase tracking-wider">{encabezado(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {porEquipo.map(e => (
                  <tr key={e.idEquipo} className="border-b border-gray-800/50">
                    <th scope="row" className="fija fija-borde px-3 py-2 text-left font-medium text-white">
                      <span className="block max-w-[10rem] truncate sm:max-w-[16rem]" title={e.equipo}>{e.equipo}</span>
                    </th>
                    <td className="px-3 py-2 text-center"><ConteoTarjetas valor={e.amarillas} tipo="amarilla" /></td>
                    <td className="px-3 py-2 text-center"><ConteoTarjetas valor={e.rojas} tipo="roja" /></td>
                    <td className="px-3 py-2 text-white font-semibold text-center tabular-nums">{e.puntosFairPlay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablaDesplazable>
        </div>
      </div>
    </div>
  )
}
