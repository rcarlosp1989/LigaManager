import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapPin, X } from 'lucide-react'
import api from '../services/api'
import LogoEquipo from './LogoEquipo'
import { Arco, Balon, Tarjeta } from './IconoEvento'

// Marcadores en vivo (enlace público y dirigente): los partidos de hoy y los que estén en vivo.
// - Marcador, goles con minuto y jugador, y rojas (también por doble amarilla).
// - El minuto sale del reloj del vocal; la pantalla lo sigue contando entre consultas.
// - Consulta cada 30 s mientras hay un partido en vivo (cada 2 min si solo hay partidos por
//   jugar hoy) y solo con la pantalla visible.
// - Avisa en pantalla cuando llega el medio tiempo, cuando termina un partido y cuando hay gol.
// Sin partidos hoy, no muestra nada.

function minutoDelReloj(reloj, segundos) {
  if (!reloj) return null
  const d = reloj.duracionMin
  if (reloj.fase === 'descanso') return 'Medio tiempo'
  if (reloj.fase === 'final') return 'Final'
  if (reloj.fase !== '1T' && reloj.fase !== '2T') return null
  const base = reloj.fase === '2T' ? d : 0
  const m = Math.floor(segundos / 60) + 1
  return m > d ? `${base + d}+${m - d}'` : `${base + m}'`
}

const textoMarcador = (p) => `${p.local} ${p.golesLocal ?? 0} - ${p.golesVisitante ?? 0} ${p.visitante}`

export default function PanelEnVivo({ url, idEquipoPropio }) {
  const q = useQuery({
    queryKey: ['en-vivo', url],
    queryFn: () => api.get(url).then(r => r.data),
    refetchInterval: (query) => {
      const ps = query.state.data?.partidos ?? []
      if (ps.some(p => p.estado === 'EnVivo')) return 30000
      if (ps.some(p => p.estado === 'PorJugar')) return 120000
      return false
    },
    refetchIntervalInBackground: false,
    retry: 1,
  })
  const partidos = q.data?.partidos ?? []
  const avisos = useAvisos(partidos)
  const corriendo = partidos.some(p => p.reloj?.corriendo)
  const ahora = useAhora(corriendo)

  if (partidos.length === 0) return null
  const hayEnVivo = partidos.some(p => p.estado === 'EnVivo')
  const transcurrido = Math.max(0, (ahora - q.dataUpdatedAt) / 1000)

  return (
    <section aria-labelledby="en-vivo-titulo" className="mb-5">
      <h2 id="en-vivo-titulo" className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-gray-400">
        {hayEnVivo && <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>}
        {hayEnVivo ? 'En vivo' : 'Hoy'}
      </h2>

      <div role="status" aria-live="polite" className="space-y-2 empty:hidden">
        {avisos.lista.map(a => (
          <p key={a.id} className={`mb-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${a.estilo}`}>
            <span className="flex-1">{a.texto}</span>
            <button type="button" onClick={() => avisos.quitar(a.id)} aria-label="Cerrar aviso" className="-m-1 p-1 opacity-70 hover:opacity-100">
              <X size={16} aria-hidden="true" />
            </button>
          </p>
        ))}
      </div>

      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {partidos.map(p => (
          <TarjetaEnVivo key={p.idPartido} p={p} idEquipoPropio={idEquipoPropio}
            segundos={p.reloj ? p.reloj.segundos + (p.reloj.corriendo ? transcurrido : 0) : 0} />
        ))}
      </ul>
    </section>
  )
}

function TarjetaEnVivo({ p, idEquipoPropio, segundos }) {
  const enVivo = p.estado === 'EnVivo'
  const minuto = minutoDelReloj(p.reloj, segundos)
  const descanso = p.reloj?.fase === 'descanso' && enVivo
  const propio = (id) => idEquipoPropio != null && id === idEquipoPropio
  const local = p.eventos.filter(e => e.lado === 'local')
  const visita = p.eventos.filter(e => e.lado === 'visitante')

  return (
    <li className={`rounded-lg border px-3 py-3 ${enVivo ? 'border-red-500/40 bg-red-950/20' : 'border-gray-800 bg-gray-900/60'}`}>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <Estado p={p} minuto={minuto} descanso={descanso} />
        {p.estadio && <span className="inline-flex min-w-0 items-center gap-1 truncate text-gray-500"><MapPin size={12} aria-hidden="true" />{p.estadio}</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className={`flex min-w-0 flex-1 items-center justify-end gap-2 text-right text-sm ${propio(p.idEquipoLocal) ? 'font-semibold text-white' : 'text-gray-200'}`}>
          <span className="min-w-0 truncate">{p.local}</span>
          <LogoEquipo nombre={p.local} logoUrl={p.logoLocal} tamano={28} />
        </span>
        <span className={`shrink-0 rounded-md px-2.5 py-1 font-display text-2xl leading-none tabular-nums ${enVivo ? 'bg-red-600/20 text-white' : 'bg-gray-800 text-white'}`}
          aria-label={p.golesLocal == null ? 'Sin empezar' : `${p.golesLocal} a ${p.golesVisitante}`}>
          {p.desierto ? 'Desierto' : p.golesLocal == null ? 'vs' : `${p.golesLocal} - ${p.golesVisitante}`}
        </span>
        <span className={`flex min-w-0 flex-1 items-center gap-2 text-sm ${propio(p.idEquipoVisitante) ? 'font-semibold text-white' : 'text-gray-200'}`}>
          <LogoEquipo nombre={p.visitante} logoUrl={p.logoVisitante} tamano={28} />
          <span className="min-w-0 truncate">{p.visitante}</span>
        </span>
      </div>
      {(local.length > 0 || visita.length > 0) && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 border-t border-gray-800/80 pt-2 text-xs text-gray-300">
          <ul className="space-y-0.5 text-right">{local.map((e, i) => <Evento key={i} e={e} derecha />)}</ul>
          <ul className="space-y-0.5">{visita.map((e, i) => <Evento key={i} e={e} />)}</ul>
        </div>
      )}
    </li>
  )
}

function Estado({ p, minuto, descanso }) {
  if (p.estado === 'EnVivo') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-semibold uppercase tracking-wider ${descanso ? 'bg-amber-400/15 text-amber-300' : 'bg-red-600/20 text-red-300'}`}>
        {!descanso && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" aria-hidden="true" />}
        {descanso ? 'Medio tiempo' : minuto ? <>En vivo · <span className="tabular-nums">{minuto}</span></> : 'En vivo'}
      </span>
    )
  }
  if (p.estado === 'Final') return <span className="rounded bg-gray-800 px-1.5 py-0.5 font-semibold uppercase tracking-wider text-gray-300">Final</span>
  return <span className="text-gray-400">Hoy · {p.fecha.slice(11, 16)}</span>
}

function Evento({ e, derecha }) {
  const icono = e.tipo === 'ROJA' ? <Tarjeta color="roja" /> : e.tipo === 'GOL_EN_CONTRA' ? <Arco /> : <Balon />
  const detalle = e.tipo === 'GOL_EN_CONTRA' ? ' (en contra)' : e.dobleAmarilla ? ' (doble amarilla)' : ''
  const etiqueta = e.tipo === 'ROJA' ? 'Roja' : 'Gol'
  return (
    <li className={`flex items-center gap-1.5 ${derecha ? 'justify-end' : ''}`} aria-label={`${etiqueta}, minuto ${e.minuto}: ${e.jugador}${detalle}`}>
      {derecha ? <><span className="min-w-0 truncate">{e.jugador}{detalle && <span className="text-gray-500">{detalle}</span>}</span><span className="tabular-nums text-gray-500">{e.minuto}'</span>{icono}</>
        : <>{icono}<span className="tabular-nums text-gray-500">{e.minuto}'</span><span className="min-w-0 truncate">{e.jugador}{detalle && <span className="text-gray-500">{detalle}</span>}</span></>}
    </li>
  )
}

// Reloj de la pantalla: avanza cada segundo solo si hay un partido con el reloj corriendo.
function useAhora(activo) {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    if (!activo) return
    setAhora(Date.now())
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [activo])
  return ahora
}

// Compara cada consulta con la anterior y avisa: medio tiempo, final y goles. La primera
// consulta no avisa (solo muestra el estado). Cada aviso se va solo al minuto.
function useAvisos(partidos) {
  const previo = useRef(null)
  const [lista, setLista] = useState([])
  const quitar = (id) => setLista(l => l.filter(a => a.id !== id))

  useEffect(() => {
    const antes = previo.current
    previo.current = new Map(partidos.map(p => [p.idPartido, p]))
    if (!antes) return
    const nuevos = []
    for (const p of partidos) {
      const a = antes.get(p.idPartido)
      if (!a) continue
      const golesAntes = (a.golesLocal ?? 0) + (a.golesVisitante ?? 0)
      const golesAhora = (p.golesLocal ?? 0) + (p.golesVisitante ?? 0)
      if (golesAhora > golesAntes) {
        const gol = [...p.eventos].reverse().find(e => e.tipo === 'GOL' || e.tipo === 'GOL_EN_CONTRA')
        nuevos.push({ texto: `¡Gol${gol ? ` de ${gol.jugador}` : ''}! ${textoMarcador(p)}`, estilo: 'border-brand-500/40 bg-brand-500/10 text-brand-100' })
      }
      if (p.reloj?.fase === 'descanso' && a.reloj?.fase !== 'descanso' && p.estado === 'EnVivo')
        nuevos.push({ texto: `Medio tiempo: ${textoMarcador(p)}`, estilo: 'border-amber-400/40 bg-amber-400/10 text-amber-100' })
      if (p.estado === 'Final' && a.estado !== 'Final')
        nuevos.push({ texto: `Terminó: ${textoMarcador(p)}`, estilo: 'border-gray-600 bg-gray-800 text-gray-100' })
    }
    if (nuevos.length === 0) return
    const conId = nuevos.map(n => ({ ...n, id: `${Date.now()}-${Math.random()}` }))
    setLista(l => [...l, ...conId].slice(-4))
    setTimeout(() => setLista(l => l.filter(a => !conId.some(c => c.id === a.id))), 60000)
  }, [partidos])

  return { lista, quitar }
}
