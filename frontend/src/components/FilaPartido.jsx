import { MapPin } from 'lucide-react'
import LogoEquipo from './LogoEquipo'
import { formatearFecha } from '../utils/fechas'

// Un partido en una línea: local, marcador (o «vs»), visitante, y debajo fecha y estadio.
// idEquipoPropio resalta al equipo del dirigente.
export default function FilaPartido({ p, idEquipoPropio }) {
  const local = p.local ?? p.equipoLocal
  const visitante = p.visitante ?? p.equipoVisitante
  const propioLocal = idEquipoPropio != null && p.idEquipoLocal === idEquipoPropio
  const propioVisita = idEquipoPropio != null && p.idEquipoVisitante === idEquipoPropio
  const jugado = p.jugado
  return (
    <li className="rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className={`flex min-w-0 flex-1 items-center justify-end gap-2 text-right text-sm ${propioLocal ? 'font-semibold text-white' : 'text-gray-200'}`}>
          <span className="min-w-0 truncate">{local}</span>
          <LogoEquipo nombre={local} logoUrl={p.logoLocal} tamano={24} />
        </span>
        <span className="shrink-0 rounded bg-gray-800 px-2 py-0.5 font-mono text-sm tabular-nums text-white">
          {jugado ? (p.desierto ? 'Desierto' : `${p.golesLocal ?? 0} - ${p.golesVisitante ?? 0}`) : 'vs'}
        </span>
        <span className={`flex min-w-0 flex-1 items-center gap-2 text-sm ${propioVisita ? 'font-semibold text-white' : 'text-gray-200'}`}>
          <LogoEquipo nombre={visitante} logoUrl={p.logoVisitante} tamano={24} />
          <span className="min-w-0 truncate">{visitante}</span>
        </span>
      </div>
      <p className="mt-1 flex flex-wrap justify-center gap-x-3 text-xs text-gray-500">
        <span>{formatearFecha(p.fecha)}</span>
        {p.estadio && <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden="true" />{p.estadio}</span>}
        {p.numeroJornada != null && <span>Jornada {p.numeroJornada}</span>}
      </p>
    </li>
  )
}
