import { useId, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Ban, CalendarDays, ChartColumn, ChevronDown, ClipboardList, House, LogOut, RectangleVertical } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import EstadoError from '../../components/EstadoError'
import EmptyState from '../../components/EmptyState'
import LogoEquipo from '../../components/LogoEquipo'
import FilaPartido from '../../components/FilaPartido'
import { Balon } from '../../components/IconoEvento'
import { formatearRango } from '../../utils/fechas'
import TabPosiciones from '../reportes/TabPosiciones'
import TabNomina from '../reportes/TabNomina'
import TabGoleadores from '../reportes/TabGoleadores'
import TabTarjetas from '../reportes/TabTarjetas'
import TabSuspensiones from '../reportes/TabSuspensiones'

const TABS = [
  { key: 'resumen', label: 'Mi equipo', Icono: House },
  { key: 'jornadas', label: 'Jornadas', Icono: CalendarDays },
  { key: 'posiciones', label: 'Posiciones', Icono: ChartColumn },
  { key: 'nomina', label: 'Nómina', Icono: ClipboardList },
  { key: 'goleadores', label: 'Goleadores', Icono: Balon },
  { key: 'tarjetas', label: 'Tarjetas', Icono: RectangleVertical },
  { key: 'suspensiones', label: 'Suspensiones', Icono: Ban },
]

const ESTADOS = { Planificado: 'Planificado', EnCurso: 'En curso', Finalizado: 'Finalizado' }

// Vista del dirigente: el campeonato en solo lectura, sin el menú de administración.
// Los datos llegan por /api/dirigente; el servidor rechaza cualquier cambio y solo envía
// los documentos de identidad de los jugadores de su equipo.
export default function InicioDirigente() {
  const fid = useId()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { idCampeonato: idUrl } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : 'resumen'
  const setTab = (clave) => setParams(clave === 'resumen' ? {} : { tab: clave }, { replace: true })

  const qInicio = useQuery({ queryKey: ['dirigente-inicio'], queryFn: () => api.get('/dirigente/inicio').then(r => r.data) })
  const campeonatos = qInicio.data?.campeonatos ?? []
  const idCampeonato = campeonatos.some(c => String(c.idCampeonato) === idUrl) ? idUrl
    : campeonatos[0] ? String(campeonatos[0].idCampeonato) : null
  const base = idCampeonato ? `/dirigente/campeonatos/${idCampeonato}` : null

  const qCamp = useQuery({
    queryKey: ['dirigente-campeonato', idCampeonato],
    queryFn: () => api.get(base).then(r => r.data),
    enabled: !!idCampeonato,
  })
  const camp = qCamp.data

  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <header className="flex items-center gap-3 border-b border-gray-800 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl tracking-wide">LIGA<span className="text-brand-400">MANAGER</span></p>
          <p className="truncate text-sm text-gray-400">Dirigente · {user?.nombre}</p>
        </div>
        <button type="button" onClick={logout} className="flex h-11 items-center gap-2 rounded-lg border border-gray-700 px-3 text-sm text-gray-200 hover:border-gray-500">
          <LogOut size={16} aria-hidden="true" /> Salir
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-5 sm:px-6">
        {qInicio.isLoading ? (
          <p className="py-10 text-center text-gray-400">Cargando...</p>
        ) : qInicio.isError ? (
          <EstadoError mensaje="No se pudieron cargar tus campeonatos." onReintentar={qInicio.refetch} reintentando={qInicio.isFetching} />
        ) : campeonatos.length === 0 ? (
          <EmptyState icon={House} title="Sin campeonatos"
            description="Todavía no tienes acceso a ningún campeonato, o el organizador lo quitó. Pídele una invitación nueva." />
        ) : (
          <>
            {campeonatos.length > 1 && (
              <div className="mb-5 max-w-md">
                <label htmlFor={`${fid}-camp`} className="mb-1.5 block text-xs uppercase tracking-wider text-gray-400">Campeonato</label>
                <select id={`${fid}-camp`} className="input-field" value={idCampeonato ?? ''}
                  onChange={e => navigate(`/dirigente/${e.target.value}`)}>
                  {campeonatos.map(c => <option key={c.idCampeonato} value={c.idCampeonato}>{c.nombre} ({c.anio}) · {c.equipo}</option>)}
                </select>
              </div>
            )}

            {qCamp.isLoading ? (
              <p className="py-10 text-center text-gray-400">Cargando el campeonato...</p>
            ) : qCamp.isError ? (
              <EstadoError mensaje="No se pudo cargar el campeonato." onReintentar={qCamp.refetch} reintentando={qCamp.isFetching} />
            ) : camp && (
              <>
                <section className="mb-5 flex items-center gap-4">
                  <LogoEquipo nombre={camp.equipoPropio} logoUrl={camp.logoEquipoPropio} tamano={56} />
                  <div className="min-w-0">
                    <h1 className="font-display text-3xl leading-tight tracking-wide sm:text-4xl">{camp.nombre.toUpperCase()}</h1>
                    <p className="text-sm text-gray-400">
                      {camp.equipoPropio} · {camp.modalidad} · {formatearRango(camp.fechaInicio, camp.fechaFin)} · {ESTADOS[camp.estado] ?? camp.estado}
                    </p>
                  </div>
                </section>

                <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-800">
                  {TABS.map(t => (
                    <button key={t.key} type="button" onClick={() => setTab(t.key)} aria-current={tab === t.key ? 'true' : undefined}
                      className={`-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                        tab === t.key ? 'border-brand-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                      }`}>
                      <t.Icono size={15} aria-hidden="true" />{t.label}
                    </button>
                  ))}
                </div>

                {tab === 'resumen' && <Resumen camp={camp} />}
                {tab === 'jornadas' && <Jornadas base={base} idEquipoPropio={camp.idEquipoPropio} />}
                {tab === 'posiciones' && (
                  <TabPosiciones idCampeonato={idCampeonato} campeonato={camp} base={base}
                    logos={new Map(camp.equipos.filter(e => e.logoUrl).map(e => [e.idEquipo, e.logoUrl]))} />
                )}
                {tab === 'nomina' && (
                  <TabNomina idCampeonato={idCampeonato} campeonato={camp} base={base} idEquipoPropio={camp.idEquipoPropio}
                    rutaEquipo={(id) => `${base}/equipos/${id}`} />
                )}
                {tab === 'goleadores' && <TabGoleadores idCampeonato={idCampeonato} base={base} simple />}
                {tab === 'tarjetas' && <TabTarjetas idCampeonato={idCampeonato} base={base} />}
                {tab === 'suspensiones' && <TabSuspensiones idCampeonato={idCampeonato} base={base} soloLectura />}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function Resumen({ camp }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <section aria-labelledby="proximos-titulo" className="card">
        <h2 id="proximos-titulo" className="mb-3 text-xs uppercase tracking-wider text-gray-500">Próximos partidos de {camp.equipoPropio}</h2>
        {camp.proximos.length === 0
          ? <p className="text-sm text-gray-500">No hay partidos programados.</p>
          : <ul className="space-y-2">{camp.proximos.map(p => <FilaPartido key={p.idPartido} p={p} idEquipoPropio={camp.idEquipoPropio} />)}</ul>}
      </section>
      <section aria-labelledby="ultimos-titulo" className="card">
        <h2 id="ultimos-titulo" className="mb-3 text-xs uppercase tracking-wider text-gray-500">Últimos resultados</h2>
        {camp.ultimos.length === 0
          ? <p className="text-sm text-gray-500">Todavía no ha jugado.</p>
          : <ul className="space-y-2">{camp.ultimos.map(p => <FilaPartido key={p.idPartido} p={p} idEquipoPropio={camp.idEquipoPropio} />)}</ul>}
      </section>
    </div>
  )
}

function Jornadas({ base, idEquipoPropio }) {
  const [abierta, setAbierta] = useState(null)
  const q = useQuery({ queryKey: ['dirigente-jornadas', base], queryFn: () => api.get(`${base}/jornadas`).then(r => r.data) })

  if (q.isLoading) return <p className="py-10 text-center text-sm text-gray-500">Cargando jornadas...</p>
  if (q.isError) return <EstadoError mensaje="No se pudieron cargar las jornadas." onReintentar={q.refetch} reintentando={q.isFetching} />
  if (q.data.length === 0) return <EmptyState icon={CalendarDays} title="Sin jornadas" description="El organizador todavía no armó el calendario." />

  return (
    <ul className="space-y-2">
      {q.data.map(j => {
        const abiertaEsta = abierta === j.idJornada
        return (
          <li key={j.idJornada} className="rounded-lg border border-gray-800">
            <button type="button" onClick={() => setAbierta(abiertaEsta ? null : j.idJornada)} aria-expanded={abiertaEsta}
              className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <span className="flex-1">
                <span className="font-medium text-white">Jornada {j.numero}</span>
                <span className="ml-2 text-xs text-gray-500">
                  {j.instancia}{j.grupo ? ` · ${j.grupo}` : ''} · {j.totalPartidos} {j.totalPartidos === 1 ? 'partido' : 'partidos'}
                  {j.equipoLibre ? ` · Libre: ${j.equipoLibre}` : ''}
                </span>
              </span>
              <ChevronDown size={18} aria-hidden="true" className={`text-gray-500 transition-transform ${abiertaEsta ? 'rotate-180' : ''}`} />
            </button>
            {abiertaEsta && <DetalleJornada base={base} idJornada={j.idJornada} idEquipoPropio={idEquipoPropio} />}
          </li>
        )
      })}
    </ul>
  )
}

function DetalleJornada({ base, idJornada, idEquipoPropio }) {
  const q = useQuery({
    queryKey: ['dirigente-jornada', base, idJornada],
    queryFn: () => api.get(`${base}/jornadas/${idJornada}`).then(r => r.data),
  })
  if (q.isLoading) return <p className="px-4 pb-3 text-sm text-gray-500">Cargando partidos...</p>
  if (q.isError) return <div className="px-4 pb-3"><EstadoError compacto mensaje="No se pudieron cargar los partidos." onReintentar={q.refetch} reintentando={q.isFetching} /></div>
  if (q.data.partidos.length === 0) return <p className="px-4 pb-3 text-sm text-gray-500">Sin partidos en esta jornada.</p>
  return (
    <ul className="space-y-2 px-3 pb-3">
      {q.data.partidos.map(p => <FilaPartido key={p.idPartido} p={p} idEquipoPropio={idEquipoPropio} />)}
    </ul>
  )
}
