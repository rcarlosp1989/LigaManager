import { useEffect, useRef } from 'react'
import { Check, MapPin } from 'lucide-react'
import LogoEquipo from './LogoEquipo'
import { diaCorto, diaDe, horaDe } from '../utils/fechas'

// Vista de jornadas para el celular (opción A, «marcador»): una tira de jornadas que se desliza
// y una tarjeta por partido con los dos equipos frente a frente y el marcador al medio.
// La usan la página pública, el dirigente y el organizador; en computadora no se usa.

// Tira de jornadas. jornadas: [{ idJornada, numero, fecha, jugados, total }].
export function TiraJornadas({ jornadas, idActual, onElegir }) {
  const elegida = useRef(null)
  // La jornada elegida siempre a la vista (al abrir y al cambiar).
  useEffect(() => { elegida.current?.scrollIntoView({ block: 'nearest', inline: 'center' }) }, [idActual])
  return (
    <nav aria-label="Jornadas" className="sticky top-0 z-10 -mx-4 mb-3 border-b border-gray-800 bg-gray-950/95 px-4 py-2 backdrop-blur">
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {jornadas.map(j => {
          const actual = String(j.idJornada) === String(idActual)
          const completa = j.total > 0 && j.jugados === j.total
          return (
            <li key={j.idJornada} className="shrink-0">
              <button type="button" ref={actual ? elegida : null} onClick={() => onElegir(j.idJornada)}
                aria-current={actual ? 'true' : undefined}
                className={`flex h-[52px] min-w-16 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 ${
                  actual ? 'bg-brand-400 text-gray-950' : 'border border-gray-800 bg-gray-900 text-gray-400'}`}>
                <span className={`text-xs ${actual ? 'font-bold' : 'font-medium'}`}><span className="sr-only">Jornada </span>J{j.numero}</span>
                <span className={`text-[10px] ${actual ? 'font-semibold' : ''}`}>
                  {completa ? <><Check size={12} aria-hidden="true" /><span className="sr-only">, jugada</span></> : (j.fecha ? diaCorto(j.fecha) : <span aria-hidden="true">—</span>)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// Encabezado de la jornada elegida: «JORNADA 4» y «Fase regular · 2 de 3 jugados».
export function TituloJornada({ numero, instancia, grupo, jugados, total, children }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-2xl tracking-wide text-white">JORNADA {numero}</h2>
        <p className="text-xs text-gray-400">
          {instancia}{grupo ? ` · ${/^grupo\b/i.test(grupo) ? grupo : `Grupo ${grupo}`}` : ''}
          {total > 0 && ` · ${jugados === total ? (total === 1 ? '1 partido jugado' : `${total} partidos jugados`) : `${jugados} de ${total} jugados`}`}
        </p>
      </div>
      {children}
    </div>
  )
}

// Partidos agrupados por día, con el título del día encima. render(partido) dibuja cada uno.
export function PartidosPorDia({ partidos, render }) {
  const grupos = []
  for (const p of partidos) {
    const d = diaDe(p.fecha)
    const ultimo = grupos[grupos.length - 1]
    if (ultimo?.clave === d.clave) ultimo.partidos.push(p)
    else grupos.push({ ...d, partidos: [p] })
  }
  return (
    <div className="space-y-4">
      {grupos.map(g => (
        <section key={g.clave || 'sin-fecha'} aria-label={g.titulo}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{g.titulo}</h3>
          <ul className="space-y-3">{g.partidos.map(render)}</ul>
        </section>
      ))}
    </div>
  )
}

function Equipo({ nombre, logoUrl, propio, atenuado }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <LogoEquipo nombre={nombre} logoUrl={logoUrl} tamano={44} />
      <span className={`text-[13px] font-semibold leading-tight break-words ${propio ? 'text-brand-300' : atenuado ? 'text-gray-400' : 'text-white'}`}>
        {nombre}
      </span>
    </div>
  )
}

// Estado del partido como etiqueta: FINAL, EN VIVO, DESIERTO o la hora («10:00»).
function Estado({ jugado, desierto, enVivo }) {
  if (enVivo) return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-red-950 px-2 py-0.5 text-[11px] font-bold tracking-wider text-red-200">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" aria-hidden="true" />EN VIVO
    </span>
  )
  if (desierto) return <span className="rounded-md bg-amber-950 px-2 py-0.5 text-[11px] font-bold tracking-wider text-amber-200">DESIERTO</span>
  if (jugado) return <span className="rounded-md bg-gray-800 px-2 py-0.5 text-[11px] font-bold tracking-wider text-gray-200">FINAL</span>
  return <span className="rounded-md bg-gray-800/60 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-gray-300">POR JUGAR</span>
}

// Marcador de un partido (sin la tarjeta): estado y cancha arriba; equipos y goles debajo.
// p: { local, visitante, logoLocal, logoVisitante, golesLocal, golesVisitante, jugado, desierto,
//      fecha, estadio }. propio: id del equipo a resaltar. extra: texto bajo el estado (p. ej. «por reglamento»).
export function MarcadorPartido({ p, idEquipoPropio, enVivo = false, extra }) {
  const local = p.local ?? p.equipoLocal
  const visitante = p.visitante ?? p.equipoVisitante
  const conMarcador = (p.jugado && !p.desierto) || enVivo
  const gl = conMarcador ? (p.golesLocal ?? 0) : null
  const gv = conMarcador ? (p.golesVisitante ?? 0) : null
  const hora = horaDe(p.fecha)
  return (
    <div className="space-y-2.5" data-marcador={p.jugado && !p.desierto ? `${gl}-${gv}` : p.desierto ? 'desierto' : 'vs'}>
      <div className="flex items-center justify-between gap-2">
        <Estado jugado={p.jugado} desierto={p.desierto} enVivo={enVivo} />
        <span className="flex min-w-0 items-center gap-1 truncate text-xs text-gray-400">
          {p.estadio ? <><MapPin size={12} aria-hidden="true" className="shrink-0" /><span className="truncate">{p.estadio}</span></> : (hora && p.jugado ? hora : '')}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <Equipo nombre={local} logoUrl={p.logoLocal} propio={idEquipoPropio != null && p.idEquipoLocal === idEquipoPropio}
          atenuado={gl != null && p.jugado && gl < gv} />
        {conMarcador ? (
          <p className={`flex items-center gap-2.5 font-display text-4xl tabular-nums ${enVivo ? 'text-brand-300' : 'text-white'}`}>
            <span className={p.jugado && gl < gv ? 'text-gray-400' : ''}>{gl}</span>
            <span className="text-2xl text-gray-600" aria-hidden="true">–</span><span className="sr-only"> a </span>
            <span className={p.jugado && gv < gl ? 'text-gray-400' : ''}>{gv}</span>
          </p>
        ) : (
          <div className="text-center">
            <p className="font-display text-xl text-white">{hora || 'VS'}</p>
            {p.desierto && <p className="text-[11px] text-amber-300">Sin marcador</p>}
          </div>
        )}
        <Equipo nombre={visitante} logoUrl={p.logoVisitante} propio={idEquipoPropio != null && p.idEquipoVisitante === idEquipoPropio}
          atenuado={gv != null && p.jugado && gv < gl} />
      </div>
      {extra && <p className="text-center text-xs text-amber-300">{extra}</p>}
    </div>
  )
}

// Tarjeta completa (pública y dirigente). children: algo más bajo el marcador.
export function TarjetaMarcador({ p, idEquipoPropio, enVivo, children }) {
  const propio = idEquipoPropio != null && (p.idEquipoLocal === idEquipoPropio || p.idEquipoVisitante === idEquipoPropio)
  return (
    <li className={`rounded-2xl border px-4 py-3.5 ${enVivo ? 'border-brand-400 bg-brand-900/40' : propio ? 'border-brand-800 bg-gray-900' : 'border-gray-800 bg-gray-900'}`}>
      <MarcadorPartido p={p} idEquipoPropio={idEquipoPropio} enVivo={enVivo} />
      {children}
    </li>
  )
}
