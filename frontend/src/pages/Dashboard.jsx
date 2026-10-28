import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../services/api'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import EstadoError from '../components/EstadoError'
import { formatearFecha } from '../utils/fechas'
import { CirclePlay, MapPin, Shield, Trophy, Users } from 'lucide-react'
import LogoEquipo from '../components/LogoEquipo'

// La jornada del partido dentro de su campeonato; la exacta cuando la API envíe idJornada.
const rutaJornada = (p) => `/campeonatos/${p.idCampeonato}?tab=jornadas${p.idJornada ? `&jornada=${p.idJornada}` : ''}`

// Un equipo del partido en una línea: escudo, nombre completo (puede ocupar dos líneas) y, si
// ya se jugó, sus goles a la derecha. El ganador se resalta; en un empate, los dos igual.
function FilaEquipo({ nombre, logoUrl, goles, gana = false, empate = false }) {
  const destacado = goles == null || gana || empate
  return (
    <div className="flex items-center gap-2">
      <LogoEquipo nombre={nombre} logoUrl={logoUrl} tamano={24} />
      <span className={`min-w-0 flex-1 break-words text-sm leading-snug ${destacado ? 'font-medium text-white' : 'text-gray-400'}`}>{nombre}</span>
      {goles != null && (
        <span data-goles className={`w-8 shrink-0 text-right font-display text-xl leading-none tabular-nums ${destacado ? 'text-white' : 'text-gray-400'}`}>{goles}</span>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icono, color = 'blue' }) {
  const colors = {
    blue:   'from-brand-900/50 to-brand-800/20 border-brand-700/50',
    green:  'from-green-900/50 to-green-800/20 border-green-700/50',
    yellow: 'from-yellow-900/50 to-yellow-800/20 border-yellow-700/50',
    purple: 'from-purple-900/50 to-purple-800/20 border-purple-700/50',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <Icono size={26} strokeWidth={1.75} aria-hidden="true" className="text-gray-300" />
      </div>
      <p className="font-display text-4xl text-white">{value ?? '–'}</p>
      <p className="text-gray-400 text-sm mt-1">{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const { data: dash, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  () => api.get('/dashboard').then(r => r.data),
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="DASHBOARD"
        subtitle={new Date().toLocaleDateString('es-EC', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })}
      />

      {isError ? (
        <EstadoError mensaje="No se pudo cargar el resumen." onReintentar={refetch} reintentando={isFetching} />
      ) : (<>
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Campeonatos"  value={dash?.totalCampeonatos}   icon={Trophy} color="blue"   />
        <StatCard label="En Curso"     value={dash?.campeonatosEnCurso} icon={CirclePlay} color="green"  />
        <StatCard label="Equipos"      value={dash?.totalEquipos}       icon={Shield} color="yellow" />
        <StatCard label="Jugadores"    value={dash?.totalJugadores}     icon={Users} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Próximos partidos */}
        <div className="card">
          <h3 className="font-display text-xl text-white mb-4 tracking-wide">
            PRÓXIMA FECHA
          </h3>
          {isLoading ? (
            <p className="text-gray-500 text-sm text-center py-4">Cargando...</p>
          ) : dash?.proximosPartidos?.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No hay partidos próximos programados.</p>
          ) : (
            <div className="space-y-3">
              {dash?.proximosPartidos?.map(p => (
                <div key={p.idPartido} className="p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                  {/* Lleva a la jornada del partido. Con idJornada (pendiente en la API) abre la jornada exacta y el modo en vivo. */}
                  <Link to={rutaJornada(p)} className="block focus-visible:outline-2 focus-visible:outline-brand-400 rounded">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 mb-1">
                      <span className="text-xs text-gray-500">{p.campeonato} · {p.jornada}</span>
                      <span className="text-xs text-gray-500">{formatearFecha(p.fecha)}</span>
                    </div>
                    {/* Un equipo por línea: los nombres se leen completos también en celular. */}
                    <div className="space-y-1">
                      <FilaEquipo nombre={p.equipoLocal} logoUrl={p.logoLocal} />
                      <FilaEquipo nombre={p.equipoVisitante} logoUrl={p.logoVisitante} />
                    </div>
                    <p className="flex items-center gap-1 text-gray-500 text-xs mt-1"><MapPin size={12} aria-hidden="true" />{p.estadio}</p>
                  </Link>
                  {p.idJornada && (
                    <Link to={`/partidos/${p.idPartido}/en-vivo?jornada=${p.idJornada}`}
                      className="mt-2 inline-flex items-center rounded border border-brand-700 px-3 py-1.5 text-xs text-brand-300 hover:bg-brand-900/30">
                      ● Registrar en vivo
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos resultados */}
        <div className="card">
          <h3 className="font-display text-xl text-white mb-4 tracking-wide">
            ÚLTIMA FECHA
          </h3>
          {isLoading ? (
            <p className="text-gray-500 text-sm text-center py-4">Cargando...</p>
          ) : dash?.ultimosResultados?.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No hay resultados registrados aún.</p>
          ) : (
            <div className="space-y-3">
              {dash?.ultimosResultados?.map(p => (
                <Link
                  key={p.idPartido}
                  to={rutaJornada(p)}
                  className="block p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors focus-visible:outline-2 focus-visible:outline-brand-400"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-2 mb-1">
                    <span className="text-xs text-gray-500">{p.campeonato} · {p.jornada}</span>
                    <span className="text-xs text-gray-500">{formatearFecha(p.fecha)}</span>
                  </div>
                  {/* Un equipo por línea con sus goles a la derecha: los nombres se leen completos
                      también en celular y los marcadores quedan en la misma columna. */}
                  <div className="space-y-1">
                    <FilaEquipo nombre={p.equipoLocal} logoUrl={p.logoLocal} goles={p.golesLocal}
                      gana={p.golesLocal > p.golesVisitante} empate={p.golesLocal === p.golesVisitante} />
                    <FilaEquipo nombre={p.equipoVisitante} logoUrl={p.logoVisitante} goles={p.golesVisitante}
                      gana={p.golesVisitante > p.golesLocal} empate={p.golesLocal === p.golesVisitante} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
      </>)}
    </div>
  )
}
