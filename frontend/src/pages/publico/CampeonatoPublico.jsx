import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Ban, CalendarDays, ChartColumn, ChevronDown, Link2Off, RectangleVertical } from 'lucide-react'
import api from '../../services/api'
import EstadoError from '../../components/EstadoError'
import EmptyState from '../../components/EmptyState'
import FilaPartido from '../../components/FilaPartido'
import NotaResponsabilidad from '../../components/NotaResponsabilidad'
import PanelEnVivo from '../../components/PanelEnVivo'
import { Balon } from '../../components/IconoEvento'
import { formatearRango } from '../../utils/fechas'
import TabPosiciones from '../reportes/TabPosiciones'
import TabGoleadores from '../reportes/TabGoleadores'
import TabTarjetas from '../reportes/TabTarjetas'
import TabSuspensiones from '../reportes/TabSuspensiones'

const TABS = [
  { key: 'resultados', label: 'Resultados', Icono: CalendarDays },
  { key: 'posiciones', label: 'Posiciones', Icono: ChartColumn },
  { key: 'goleadores', label: 'Goleadores', Icono: Balon },
  { key: 'tarjetas', label: 'Tarjetas', Icono: RectangleVertical },
  { key: 'suspensiones', label: 'Suspensiones', Icono: Ban },
]

const ESTADOS = { Planificado: 'Planificado', EnCurso: 'En curso', Finalizado: 'Finalizado' }

// Enlace público del campeonato (/publico/{código}): se ve sin cuenta. Solo resultados, tablas y
// estadísticas; los jugadores con nombre corto y sin fotos. Nada de nóminas ni documentos.
export default function CampeonatoPublico() {
  const { token } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : 'resultados'
  const setTab = (clave) => setParams(clave === 'resultados' ? {} : { tab: clave }, { replace: true })
  const base = `/publico/${encodeURIComponent(token)}`

  const q = useQuery({ queryKey: ['publico', token], queryFn: () => api.get(base).then(r => r.data), retry: false })
  const camp = q.data
  const noExiste = q.isError && q.error?.response?.status === 404

  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-4 py-3 sm:px-6">
        <p className="font-display text-2xl tracking-wide">LIGA<span className="text-brand-400">MANAGER</span></p>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-5 sm:px-6">
        {q.isLoading ? (
          <p className="py-10 text-center text-gray-400">Cargando el campeonato...</p>
        ) : noExiste ? (
          <EmptyState icon={Link2Off} title="Enlace no disponible"
            description="Este enlace no existe o la organización lo desactivó. Pide el enlace actualizado a la organización del campeonato." />
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

            {tab === 'resultados' && <><PanelEnVivo url={`${base}/en-vivo`} /><Resultados base={base} /></>}
            {tab === 'posiciones' && (
              <TabPosiciones idCampeonato={token} campeonato={camp} base={base}
                logos={new Map(camp.equipos.filter(e => e.logoUrl).map(e => [e.idEquipo, e.logoUrl]))} />
            )}
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
    </div>
  )
}

// Jornadas plegables. Al abrir, se despliega la jornada en curso (la primera con partidos por
// jugar; si ya se jugaron todos, la última). Se pueden abrir varias a la vez.
function jornadaActual(jornadas) {
  return (jornadas.find(j => j.partidos.some(p => !p.jugado)) ?? jornadas[jornadas.length - 1])?.idJornada
}

function Resultados({ base }) {
  const q = useQuery({ queryKey: ['publico-jornadas', base], queryFn: () => api.get(`${base}/jornadas`).then(r => r.data) })
  const [abiertas, setAbiertas] = useState(null)   // null = todavía la jornada en curso
  if (q.isLoading) return <p className="py-10 text-center text-sm text-gray-500">Cargando resultados...</p>
  if (q.isError) return <EstadoError mensaje="No se pudieron cargar los resultados." onReintentar={q.refetch} reintentando={q.isFetching} />
  const jornadas = q.data.filter(j => j.partidos.length > 0)
  if (jornadas.length === 0) return <EmptyState icon={CalendarDays} title="Sin partidos todavía" description="La organización aún no publicó el calendario." />
  const abiertasAhora = abiertas ?? new Set([jornadaActual(jornadas)])
  const alternar = (id) => {
    const nuevas = new Set(abiertasAhora)
    if (nuevas.has(id)) nuevas.delete(id); else nuevas.add(id)
    setAbiertas(nuevas)
  }
  return (
    <ul className="space-y-2">
      {jornadas.map(j => {
        const abierta = abiertasAhora.has(j.idJornada)
        const jugados = j.partidos.filter(p => p.jugado).length
        const total = j.partidos.length
        return (
          <li key={j.idJornada} className="rounded-lg border border-gray-800">
            <button type="button" onClick={() => alternar(j.idJornada)} aria-expanded={abierta}
              className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <span className="min-w-0 flex-1">
                <span className="font-medium text-white">Jornada {j.numero}</span>
                <span className="ml-2 text-xs text-gray-500">
                  {j.instancia}{j.grupo ? ` · Grupo ${j.grupo}` : ''} · {jugados === total ? (total === 1 ? '1 partido jugado' : `${total} partidos jugados`) : `${jugados} de ${total} jugados`}
                </span>
              </span>
              <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-gray-500 transition-transform ${abierta ? 'rotate-180' : ''}`} />
            </button>
            {abierta && (
              <ul className="space-y-2 px-3 pb-3">
                {j.partidos.map(p => <FilaPartido key={p.idPartido} p={{ ...p, numeroJornada: null }} />)}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}
