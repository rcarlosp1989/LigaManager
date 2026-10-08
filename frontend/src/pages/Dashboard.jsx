import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import EstadoError from '../components/EstadoError'

function StatCard({ label, value, icon, color = 'blue' }) {
  const colors = {
    blue:   'from-brand-900/50 to-brand-800/20 border-brand-700/50',
    green:  'from-green-900/50 to-green-800/20 border-green-700/50',
    yellow: 'from-yellow-900/50 to-yellow-800/20 border-yellow-700/50',
    purple: 'from-purple-900/50 to-purple-800/20 border-purple-700/50',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="font-display text-4xl text-white">{value ?? '–'}</p>
      <p className="text-gray-400 text-sm mt-1">{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()

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
        <StatCard label="Campeonatos"  value={dash?.totalCampeonatos}   icon="🏆" color="blue"   />
        <StatCard label="En Curso"     value={dash?.campeonatosEnCurso} icon="⚽" color="green"  />
        <StatCard label="Equipos"      value={dash?.totalEquipos}       icon="🛡️" color="yellow" />
        <StatCard label="Jugadores"    value={dash?.totalJugadores}     icon="👤" color="purple" />
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
                <div
                  key={p.idPartido}
                  onClick={() => navigate(`/campeonatos/${p.idCampeonato}`)}
                  className="p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{p.campeonato} · {p.jornada}</span>
                    <span className="text-xs text-gray-500">{p.fecha}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium text-sm">{p.equipoLocal}</span>
                    <span className="text-gray-600 text-xs px-2">vs</span>
                    <span className="text-white font-medium text-sm">{p.equipoVisitante}</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">🏟️ {p.estadio}</p>
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
                <div
                  key={p.idPartido}
                  onClick={() => navigate(`/campeonatos/${p.idCampeonato}`)}
                  className="p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{p.campeonato} · {p.jornada}</span>
                    <span className="text-xs text-gray-500">{p.fecha}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium text-sm">{p.equipoLocal}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-display text-lg">{p.golesLocal}</span>
                      <span className="text-gray-600 text-xs">-</span>
                      <span className="text-white font-display text-lg">{p.golesVisitante}</span>
                    </div>
                    <span className="text-white font-medium text-sm">{p.equipoVisitante}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      </>)}
    </div>
  )
}
