import { Trophy } from 'lucide-react'
import LogoEquipo from './LogoEquipo'
import { formatearFecha } from '../utils/fechas'

// Cuadro de la fase eliminatoria (GET …/eliminatoria). Lo usan el organizador, el enlace público
// y el dirigente. Una columna por ronda creada (en el celular, una debajo de otra); cada llave con
// ida, vuelta y global (o el resultado del partido único), el ganador resaltado y el detalle del
// desempate. accionesLlave / accionesRonda: lo que agrega el organizador (penales, eliminar…).
export default function CuadroLlaves({ datos, accionesLlave, accionesRonda, mostrarPendientes = false }) {
  const rondas = (datos?.rondas ?? []).filter(r => r.creada || (mostrarPendientes && r.puedeCrearse))
  if (rondas.length === 0) return null

  return (
    <div className="space-y-4">
      {datos.campeon && (
        <div className="card flex items-center gap-4 border-brand-400/50">
          <Trophy size={34} className="text-brand-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-gray-500">Campeón</p>
            <p className="flex items-center gap-2 text-lg font-bold text-white">
              <LogoEquipo nombre={datos.campeon.nombre} logoUrl={datos.campeon.logoUrl} tamano={28} />
              <span className="truncate">{datos.campeon.nombre}</span>
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:overflow-x-auto lg:pb-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400" tabIndex={0} role="region" aria-label="Cuadro de llaves (deslice para ver todas las rondas)">
        {rondas.map(r => (
          <section key={r.tipo} aria-label={r.nombre} className="lg:w-80 lg:shrink-0 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-display text-lg text-white uppercase tracking-wide">{r.nombre}</h3>
              <span className="text-xs text-gray-500">{r.idaYVuelta ? 'Ida y vuelta' : 'Partido único'}</span>
            </div>
            {r.llaves.map(l => <TarjetaLlave key={l.idLlave} llave={l} ronda={r} acciones={accionesLlave?.(l, r)} />)}
            {accionesRonda?.(r)}
          </section>
        ))}
      </div>
    </div>
  )
}

function TarjetaLlave({ llave: l, ronda: r, acciones }) {
  const ida = l.partidos.find(p => p.pierna === 'IDA')
  const vuelta = l.partidos.find(p => p.pierna === 'VUELTA')
  const unico = l.partidos.find(p => p.pierna === 'UNICO')
  const columnas = r.idaYVuelta ? ['I', 'V', 'G'] : ['']
  const fila = (eq, lado) => {
    const gana = l.idGanador === eq.idEquipo
    const pierde = l.idGanador != null && !gana
    const valores = r.idaYVuelta
      ? [ida?.jugado ? ida[`goles${lado}`] : '', vuelta?.jugado ? vuelta[`goles${lado}`] : '', l[`global${lado}`] ?? '']
      : [unico?.jugado ? unico[`goles${lado}`] : '']
    return (
      <div className="grid items-center gap-1" style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${columnas.length}, 2rem)` }}>
        <span className="flex items-center gap-2 min-w-0">
          <LogoEquipo nombre={eq.nombre} logoUrl={eq.logoUrl} tamano={22} />
          <span className={`truncate text-sm ${gana ? 'font-bold text-brand-300' : pierde ? 'text-gray-500' : 'font-semibold text-white'}`}>{eq.nombre}</span>
        </span>
        {valores.map((v, i) => (
          <span key={i} className={`text-center text-sm tabular-nums ${i === valores.length - 1 ? (gana ? 'font-bold text-brand-300' : 'font-bold text-white') : 'text-gray-400'}`}>{v}</span>
        ))}
      </div>
    )
  }
  const proximo = l.partidos.find(p => !p.jugado)
  return (
    <article className="rounded-xl border border-gray-800 bg-gray-900/60 p-3 space-y-1.5" aria-label={`Llave ${l.orden}: ${l.equipoA.nombre} contra ${l.equipoB.nombre}`}>
      <div className="grid gap-1 text-[10px] uppercase tracking-wider text-gray-500" style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${columnas.length}, 2rem)` }}>
        <span>{r.tipo === 'FINAL' ? 'Final' : r.tipo === 'TERCER_PUESTO' ? 'Tercer puesto' : `Llave ${l.orden}`}</span>
        {columnas.map(c => <span key={c} className="text-center">{c}</span>)}
      </div>
      {fila(l.equipoA, 'A')}
      {fila(l.equipoB, 'B')}
      {l.detalle && (
        <p className={`text-xs ${l.estado === 'FALTAN_PENALES' ? 'text-amber-300' : 'text-gray-400'}`}>{l.detalle}</p>
      )}
      {!l.detalle && proximo && (
        <p className="text-xs text-gray-500">
          {r.idaYVuelta ? (proximo.pierna === 'IDA' ? 'Ida' : 'Vuelta') : 'Partido'}: {formatearFecha(proximo.fecha)}
        </p>
      )}
      {acciones}
    </article>
  )
}
