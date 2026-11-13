import { useId, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Ban, CalendarDays, ChartColumn, ClipboardList, GitFork, House, LogOut, RectangleVertical, Wallet } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import EstadoError from '../../components/EstadoError'
import EmptyState from '../../components/EmptyState'
import LogoEquipo from '../../components/LogoEquipo'
import FilaPartido from '../../components/FilaPartido'
import { TiraJornadas, TituloJornada, PartidosPorDia, TarjetaMarcador } from '../../components/JornadasMovil'
import { jornadaActual } from '../../utils/jornadas'
import PanelEnVivo from '../../components/PanelEnVivo'
import { Balon } from '../../components/IconoEvento'
import { formatearRango } from '../../utils/fechas'
import TabPosiciones from '../reportes/TabPosiciones'
import TabNomina from '../reportes/TabNomina'
import TabGoleadores from '../reportes/TabGoleadores'
import TabTarjetas from '../reportes/TabTarjetas'
import TabSuspensiones from '../reportes/TabSuspensiones'
import MarcaLiga from '../../components/MarcaLiga'
import BotonFlyer from '../../components/BotonFlyer'
import CuadroLlaves from '../../components/CuadroLlaves'
import CuentaEquipo from '../../components/CuentaEquipo'

const TABS = [
  { key: 'resumen', label: 'Mi equipo', Icono: House },
  { key: 'jornadas', label: 'Jornadas', Icono: CalendarDays },
  { key: 'posiciones', label: 'Posiciones', Icono: ChartColumn },
  { key: 'llaves', label: 'Llaves', Icono: GitFork, llaves: true },
  { key: 'nomina', label: 'Nómina', Icono: ClipboardList },
  { key: 'goleadores', label: 'Goleadores', Icono: Balon },
  { key: 'tarjetas', label: 'Tarjetas', Icono: RectangleVertical },
  { key: 'suspensiones', label: 'Suspensiones', Icono: Ban },
  { key: 'pagos', label: 'Pagos', Icono: Wallet },
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
  const pedido = params.get('tab')
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
  // Pestaña «Llaves» solo cuando la organización ya armó alguna ronda de la fase eliminatoria.
  const qLlaves = useQuery({
    queryKey: ['dirigente-llaves', idCampeonato],
    queryFn: () => api.get(`${base}/eliminatoria`).then(r => r.data),
    enabled: !!camp, retry: false,
  })
  const conLlaves = qLlaves.data?.rondas?.some(r => r.creada) ?? false
  const tabs = TABS.filter(t => !t.llaves || conLlaves)
  const tab = tabs.some(t => t.key === pedido) ? pedido : 'resumen'

  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <header className="flex items-center gap-3 border-b border-gray-800 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <MarcaLiga tamano="sm" />
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
          <EstadoError mensaje="No se pudieron cargar sus campeonatos." onReintentar={qInicio.refetch} reintentando={qInicio.isFetching} />
        ) : campeonatos.length === 0 ? (
          <EmptyState icon={House} title="Sin campeonatos"
            description="Todavía no tiene acceso a ningún campeonato, o el organizador lo retiró. Solicítele una nueva invitación." />
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
                  {tabs.map(t => (
                    <button key={t.key} type="button" onClick={() => setTab(t.key)} aria-current={tab === t.key ? 'true' : undefined}
                      className={`-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                        tab === t.key ? 'border-brand-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                      }`}>
                      <t.Icono size={15} aria-hidden="true" />{t.label}
                    </button>
                  ))}
                </div>

                {(tab === 'resumen' || tab === 'jornadas') && <PanelEnVivo url={`${base}/en-vivo`} idEquipoPropio={camp.idEquipoPropio} />}
                {tab === 'resumen' && <Resumen camp={camp} />}
                {tab === 'jornadas' && <Jornadas base={base} idEquipoPropio={camp.idEquipoPropio} camp={camp} />}
                {tab === 'posiciones' && (
                  <TabPosiciones idCampeonato={idCampeonato} campeonato={camp} base={base}
                    logos={new Map(camp.equipos.filter(e => e.logoUrl).map(e => [e.idEquipo, e.logoUrl]))} />
                )}
                {tab === 'nomina' && (
                  <TabNomina idCampeonato={idCampeonato} campeonato={camp} base={base} idEquipoPropio={camp.idEquipoPropio}
                    rutaEquipo={(id) => `${base}/equipos/${id}`} />
                )}
                {tab === 'llaves' && <CuadroLlaves datos={qLlaves.data} />}
                {tab === 'goleadores' && <TabGoleadores idCampeonato={idCampeonato} base={base} simple />}
                {tab === 'tarjetas' && <TabTarjetas idCampeonato={idCampeonato} base={base} />}
                {tab === 'pagos' && <PagosEquipo base={base} />}
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

function Jornadas({ base, idEquipoPropio, camp }) {
  const q = useQuery({ queryKey: ['dirigente-jornadas', base], queryFn: () => api.get(`${base}/jornadas`).then(r => r.data) })
  if (q.isLoading) return <p className="py-10 text-center text-sm text-gray-500">Cargando jornadas...</p>
  if (q.isError) return <EstadoError mensaje="No se pudieron cargar las jornadas." onReintentar={q.refetch} reintentando={q.isFetching} />
  if (q.data.length === 0) return <EmptyState icon={CalendarDays} title="Sin jornadas" description="El organizador todavía no armó el calendario." />
  return <JornadasTarjetas base={base} jornadas={q.data} idEquipoPropio={idEquipoPropio} camp={camp} />
}

// Tira de jornadas y la jornada elegida en tarjetas de marcador (su equipo resaltado).
function JornadasTarjetas({ base, jornadas, idEquipoPropio, camp }) {
  const resumen = jornadas.map(j => ({ idJornada: j.idJornada, numero: j.numero, instancia: j.instancia, fecha: j.fecha, jugados: j.jugados ?? 0, total: j.totalPartidos }))
  const [elegida, setElegida] = useState(() => jornadaActual(resumen))
  const j = jornadas.find(x => x.idJornada === elegida) ?? jornadas[0]
  return (
    <div>
      <TiraJornadas jornadas={resumen} idActual={j.idJornada} onElegir={setElegida} />
      <TituloJornada numero={j.numero} instancia={j.instancia} grupo={j.grupo} jugados={j.jugados ?? 0} total={j.totalPartidos} />
      {j.equipoLibre && <p className="mb-3 text-xs text-amber-300">Libre en esta jornada: {j.equipoLibre}</p>}
      <DetalleJornada key={j.idJornada} base={base} idJornada={j.idJornada} idEquipoPropio={idEquipoPropio} camp={camp} />
    </div>
  )
}

function DetalleJornada({ base, idJornada, idEquipoPropio, camp }) {
  const q = useQuery({
    queryKey: ['dirigente-jornada', base, idJornada],
    queryFn: () => api.get(`${base}/jornadas/${idJornada}`).then(r => r.data),
  })
  if (q.isLoading) return <p className="py-4 text-sm text-gray-500">Cargando partidos...</p>
  if (q.isError) return <div><EstadoError compacto mensaje="No se pudieron cargar los partidos." onReintentar={q.refetch} reintentando={q.isFetching} /></div>
  if (q.data.partidos.length === 0) return <p className="py-4 text-sm text-gray-500">Sin partidos en esta jornada.</p>
  return (
    <div className="space-y-3">
      <PartidosPorDia partidos={q.data.partidos} render={p => <TarjetaMarcador key={p.idPartido} p={p} idEquipoPropio={idEquipoPropio} />} />
      {q.data.partidos.some(p => !p.jugado) && (
        <div className="flex justify-end pt-1">
          <BotonFlyer campeonato={camp.nombre} jornada={q.data}
            enlace={camp.enlaceAficionados ? `${window.location.origin}/publico/${camp.enlaceAficionados}` : null}
            partidos={q.data.partidos.map(p => ({ fecha: p.fecha, local: p.equipoLocal, visitante: p.equipoVisitante, logoLocal: p.logoLocal, logoVisitante: p.logoVisitante, estadio: p.estadio }))} />
        </div>
      )}
    </div>
  )
}

// Pagos: solo la cuenta del equipo del dirigente (los abonos los registra la organización).
function PagosEquipo({ base }) {
  const q = useQuery({ queryKey: ['dirigente-pagos', base], queryFn: () => api.get(`${base}/pagos`).then(r => r.data) })
  if (q.isLoading) return <p className="text-sm text-gray-500">Cargando...</p>
  if (q.isError) return <EstadoError compacto mensaje="No se pudieron cargar los pagos." onReintentar={q.refetch} reintentando={q.isFetching} />
  return (
    <div className="space-y-3">
      <CuentaEquipo cuenta={q.data} />
      <p className="text-sm text-gray-500">Para pagar, comuníquese con la organización del campeonato. Los abonos los registra el organizador.</p>
    </div>
  )
}
