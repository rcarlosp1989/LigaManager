import { MapPin } from 'lucide-react'
import FilaEquipo from './FilaEquipo'
import { formatearFecha } from '../utils/fechas'
import { perdio } from '../utils/marcador'

// Un partido: un equipo por línea con sus goles a la derecha (nombres completos también en
// celular) y debajo fecha, estadio y jornada. idEquipoPropio resalta al equipo del dirigente.
export default function FilaPartido({ p, idEquipoPropio }) {
  const local = p.local ?? p.equipoLocal
  const visitante = p.visitante ?? p.equipoVisitante
  const conMarcador = p.jugado && !p.desierto
  const gl = conMarcador ? (p.golesLocal ?? 0) : null
  const gv = conMarcador ? (p.golesVisitante ?? 0) : null
  return (
    <li className="rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2.5" data-marcador={conMarcador ? `${gl}-${gv}` : p.desierto ? 'desierto' : 'vs'}>
      <div className="space-y-1">
        <FilaEquipo nombre={local} logoUrl={p.logoLocal} goles={gl} atenuado={perdio(gl, gv)}
          propio={idEquipoPropio != null && p.idEquipoLocal === idEquipoPropio} />
        <FilaEquipo nombre={visitante} logoUrl={p.logoVisitante} goles={gv} atenuado={perdio(gv, gl)}
          propio={idEquipoPropio != null && p.idEquipoVisitante === idEquipoPropio} />
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
        <span>{formatearFecha(p.fecha)}</span>
        {p.estadio && <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden="true" />{p.estadio}</span>}
        {p.numeroJornada != null && <span>Jornada {p.numeroJornada}</span>}
        {p.desierto && <span className="font-semibold text-amber-300">Desierto</span>}
        {!p.jugado && <span className="text-gray-400">Por jugar</span>}
      </p>
    </li>
  )
}
