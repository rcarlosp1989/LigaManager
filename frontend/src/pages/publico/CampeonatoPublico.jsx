import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Ban, CalendarDays, ChartColumn, GitFork, Link2Off, RectangleVertical } from 'lucide-react'
import api from '../../services/api'
import EstadoError from '../../components/EstadoError'
import EmptyState from '../../components/EmptyState'
import NotaResponsabilidad from '../../components/NotaResponsabilidad'
import PanelEnVivo from '../../components/PanelEnVivo'
import { Balon } from '../../components/IconoEvento'
import { formatearRango } from '../../utils/fechas'
import TabPosiciones from '../reportes/TabPosiciones'
import TabGoleadores from '../reportes/TabGoleadores'
import TabTarjetas from '../reportes/TabTarjetas'
import TabSuspensiones from '../reportes/TabSuspensiones'
import MarcaLiga from '../../components/MarcaLiga'
import BotonFlyer from '../../components/BotonFlyer'
import { useTitulo } from '../../utils/titulo'
import CuadroLlaves from '../../components/CuadroLlaves'
import { TiraJornadas, TituloJornada, PartidosPorDia, TarjetaMarcador } from '../../components/JornadasMovil'
import { jornadaActual as jornadaEnCurso } from '../../utils/jornadas'
import { useEsCelular } from '../../utils/pantalla'

const TABS = [
  { key: 'resultados', label: 'Resultados', Icono: CalendarDays },
  { key: 'posiciones', label: 'Posiciones', Icono: ChartColumn },
  { key: 'llaves', label: 'Llaves', Icono: GitFork, llaves: true },
  { key: 'goleadores', label: 'Goleadores', Icono: Balon, estadistica: true },
  { key: 'tarjetas', label: 'Tarjetas', Icono: RectangleVertical, completo: true, estadistica: true },
  { key: 'suspensiones', label: 'Suspensiones', Icono: Ban, completo: true, estadistica: true },
]

// Barra inferior del celular: como una app. «Estadísticas» reúne goleadores, tarjetas y suspensiones.
const BARRA = [
  { key: 'resultados', label: 'Partidos', Icono: CalendarDays },
  { key: 'posiciones', label: 'Posiciones', Icono: ChartColumn },
  { key: 'llaves', label: 'Llaves', Icono: GitFork },
  { key: 'estadisticas', label: 'Estadísticas', Icono: Balon },
]

const ESTADOS = { Planificado: 'Planificado', EnCurso: 'En curso', Finalizado: 'Finalizado' }

// Enlace público del campeonato (/publico/{código}): se ve sin cuenta. Solo resultados, tablas y
// estadísticas; los jugadores con nombre corto y sin fotos. Nada de nóminas ni documentos.
// Con el enlace para aficionados (el del flyer) no hay pestañas de tarjetas ni suspensiones.
export default function CampeonatoPublico() {
  const { token } = useParams()
  const [params, setParams] = useSearchParams()
  const base = `/publico/${encodeURIComponent(token)}`

  const q = useQuery({ queryKey: ['publico', token], queryFn: () => api.get(base).then(r => r.data), retry: false })
  const camp = q.data
  useTitulo(camp?.nombre)
  // Pestaña «Llaves» solo cuando la organización ya armó alguna ronda de la fase eliminatoria.
  const qLlaves = useQuery({ queryKey: ['publico-llaves', token], queryFn: () => api.get(`${base}/eliminatoria`).then(r => r.data), enabled: !!camp, retry: false })
  const conLlaves = qLlaves.data?.rondas?.some(r => r.creada) ?? false
  const tabs = TABS.filter(t => (!t.completo || (camp && !camp.aficionados)) && (!t.llaves || conLlaves))
  const tab = tabs.some(t => t.key === params.get('tab')) ? params.get('tab') : 'resultados'
  const setTab = (clave) => setParams(clave === 'resultados' ? {} : { tab: clave }, { replace: true })
  // Enlace del flyer: el de aficionados (si se abrió con él, es esta misma página).
  const enlaceFlyer = camp?.aficionados ? `${window.location.origin}${base}`
    : camp?.enlaceAficionados ? `${window.location.origin}/publico/${camp.enlaceAficionados}` : null
  const noExiste = q.isError && q.error?.response?.status === 404
  const esCelular = useEsCelular()
  const estadisticas = tabs.filter(t => t.estadistica)
  const barra = BARRA.filter(b => b.key !== 'llaves' || conLlaves)
  const enBarra = (b) => b.key === 'estadisticas' ? estadisticas.some(t => t.key === tab) : b.key === tab
  const elegirBarra = (b) => setTab(b.key === 'estadisticas' ? (estadisticas.some(t => t.key === tab) ? tab : 'goleadores') : b.key)

  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-4 py-3 sm:px-6">
        <MarcaLiga tamano="sm" />
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 sm:px-6 sm:pb-16">
        {q.isLoading ? (
          <p className="py-10 text-center text-gray-400">Cargando el campeonato...</p>
        ) : noExiste ? (
          <EmptyState icon={Link2Off} title="Enlace no disponible"
            description="Este enlace no existe o la organización lo desactivó. Solicite el enlace actualizado a la organización del campeonato." />
        ) : q.isError ? (
          <EstadoError mensaje="No se pudo cargar el campeonato." onReintentar={q.refetch} reintentando={q.isFetching} />
        ) : (
          <>
            <section className="mb-5">
              <h1 className="font-display text-3xl leading-tight tracking-wide sm:text-4xl">{camp.nombre.toUpperCase()}</h1>
              <p className="text-sm text-gray-400">
                {camp.modalidad} · {formatearRango(camp.fechaInicio, camp.fechaFin)} · {ESTADOS[camp.estado] ?? camp.estado}
                {camp.organizacion && <> · Organiza: {camp.organizacion}</>}
              </p>
            </section>

            {esCelular && estadisticas.some(t => t.key === tab) && estadisticas.length > 1 && (
              <div role="group" aria-label="Estadísticas" className="mb-4 flex gap-2 overflow-x-auto">
                {estadisticas.map(t => (
                  <button key={t.key} type="button" onClick={() => setTab(t.key)} aria-pressed={tab === t.key}
                    className={`h-9 shrink-0 rounded-full px-4 text-sm ${tab === t.key ? 'bg-gray-100 font-semibold text-gray-950' : 'border border-gray-700 text-gray-300'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            <div className={`mb-4 gap-1 overflow-x-auto border-b border-gray-800 ${esCelular ? 'hidden' : 'flex'}`}>
              {tabs.map(t => (
                <button key={t.key} type="button" onClick={() => setTab(t.key)} aria-current={tab === t.key ? 'true' : undefined}
                  className={`-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    tab === t.key ? 'border-brand-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}>
                  <t.Icono size={15} aria-hidden="true" />{t.label}
                </button>
              ))}
            </div>

            {tab === 'resultados' && <><PanelEnVivo url={`${base}/en-vivo`} /><Resultados base={base} campeonato={camp.nombre} enlace={enlaceFlyer} /></>}
            {tab === 'posiciones' && (
              <TabPosiciones idCampeonato={token} campeonato={camp} base={base}
                logos={new Map(camp.equipos.filter(e => e.logoUrl).map(e => [e.idEquipo, e.logoUrl]))} />
            )}
            {tab === 'llaves' && <CuadroLlaves datos={qLlaves.data} />}
            {tab === 'goleadores' && <TabGoleadores idCampeonato={token} base={base} simple />}
            {tab === 'tarjetas' && <TabTarjetas idCampeonato={token} base={base} />}
            {tab === 'suspensiones' && <TabSuspensiones idCampeonato={token} base={base} soloLectura />}

            {tab === 'resultados' && <NotaResponsabilidad texto="Información publicada por la organización del campeonato." />}
            <p className="mt-4 text-xs text-gray-600">
              <Link to="/privacidad" className="hover:text-gray-400">Aviso de privacidad</Link>{' · '}
              <Link to="/terminos" className="hover:text-gray-400">Términos de uso</Link>
            </p>
          </>
        )}
      </main>

      {esCelular && camp && (
        <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-800 bg-gray-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <ul className="grid" style={{ gridTemplateColumns: `repeat(${barra.length}, minmax(0, 1fr))` }}>
            {barra.map(b => (
              <li key={b.key}>
                <button type="button" onClick={() => elegirBarra(b)} aria-current={enBarra(b) ? 'page' : undefined}
                  className={`flex min-h-[60px] w-full flex-col items-center justify-center gap-1 text-[11px] ${enBarra(b) ? 'font-semibold text-brand-400' : 'text-gray-400'}`}>
                  <b.Icono size={22} aria-hidden="true" />{b.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}

function Resultados({ base, campeonato, enlace }) {
  const q = useQuery({ queryKey: ['publico-jornadas', base], queryFn: () => api.get(`${base}/jornadas`).then(r => r.data) })
  if (q.isLoading) return <p className="py-10 text-center text-sm text-gray-500">Cargando resultados...</p>
  if (q.isError) return <EstadoError mensaje="No se pudieron cargar los resultados." onReintentar={q.refetch} reintentando={q.isFetching} />
  const jornadas = q.data.filter(j => j.partidos.length > 0)
  if (jornadas.length === 0) return <EmptyState icon={CalendarDays} title="Sin partidos todavía" description="La organización aún no publicó el calendario." />
  return <JornadasTarjetas jornadas={jornadas} campeonato={campeonato} enlace={enlace} />
}

// Tira de jornadas arriba y la jornada elegida en tarjetas de marcador, por día
// (una columna en el celular; dos o tres en PC).
function JornadasTarjetas({ jornadas, campeonato, enlace }) {
  const resumen = jornadas.map(j => ({
    idJornada: j.idJornada, numero: j.numero, instancia: j.instancia, total: j.partidos.length,
    jugados: j.partidos.filter(p => p.jugado).length,
    fecha: j.partidos.map(p => p.fecha).sort()[0],
  }))
  const [elegida, setElegida] = useState(() => jornadaEnCurso(resumen))
  const j = jornadas.find(x => x.idJornada === elegida) ?? jornadas[0]
  const r = resumen.find(x => x.idJornada === j.idJornada)
  return (
    <div>
      <TiraJornadas jornadas={resumen} idActual={j.idJornada} onElegir={setElegida} />
      <TituloJornada numero={j.numero} instancia={j.instancia} grupo={j.grupo} jugados={r.jugados} total={r.total}>
        {j.partidos.some(p => !p.jugado) && (
          <BotonFlyer campeonato={campeonato} jornada={j} enlace={enlace}
            partidos={j.partidos.map(p => ({ fecha: p.fecha, local: p.local, visitante: p.visitante, logoLocal: p.logoLocal, logoVisitante: p.logoVisitante, estadio: p.estadio }))} />
        )}
      </TituloJornada>
      <PartidosPorDia partidos={j.partidos} render={p => <TarjetaMarcador key={p.idPartido} p={p} />} />
    </div>
  )
}
