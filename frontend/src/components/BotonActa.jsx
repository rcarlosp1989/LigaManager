import { useState } from 'react'
import { FileDown } from 'lucide-react'
import api from '../services/api'
import { useAviso, mensajeDeError } from '../feedback/contextos'
import { generarActa } from '../utils/acta'

// «Acta PDF» de un partido (organizador): el acta de juego en blanco, con los jugadores
// habilitados de los dos equipos el día del partido y los suspendidos tachados, para
// registrarlo a mano si hace falta.
// campeonato: { idCampeonato, nombre, logoUrl }; jornada: { numero, instancia }; partido: el de la jornada.
export default function BotonActa({ campeonato, jornada, partido }) {
  const aviso = useAviso()
  const [generando, setGenerando] = useState(false)

  const descargar = async () => {
    setGenerando(true)
    try {
      const dia = String(partido.fecha ?? '').slice(0, 10)
      const consulta = /^\d{4}-\d{2}-\d{2}$/.test(dia) ? `?fecha=${dia}` : ''
      const [local, visitante, sanciones] = await Promise.all([
        api.get(`/equipos/${partido.idEquipoLocal}${consulta}`).then(r => r.data),
        api.get(`/equipos/${partido.idEquipoVisitante}${consulta}`).then(r => r.data),
        api.get(`/campeonatos/${campeonato.idCampeonato}/estadisticas/suspensiones`).then(r => r.data).catch(() => null),
      ])
      const suspendidos = new Set((sanciones?.sanciones ?? []).filter(s => s.estado === 'Suspendido').map(s => s.idJugador))
      const equipo = (nombre, e) => ({
        nombre,
        jugadores: (e?.jugadores ?? []).map(j => ({ dorsal: j.dorsal, nombre: j.nombre, apellido: j.apellido, suspendido: suspendidos.has(j.idJugador) })),
      })
      const doc = await generarActa({
        campeonato: campeonato.nombre,
        logoLiga: campeonato.logoUrl,
        numeroFecha: jornada?.numero ? `Fecha ${jornada.numero}` : '',
        instancia: jornada?.instancia,
        grupo: partido.grupo,
        fecha: partido.fecha,
        estadio: partido.estadio,
        arbitro: partido.arbitro,
        local: equipo(partido.equipoLocal, local),
        visitante: equipo(partido.equipoVisitante, visitante),
      })
      const limpio = (t) => String(t ?? '').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '').slice(0, 30)
      doc.save(`acta_${jornada?.numero ? `fecha${jornada.numero}_` : ''}${limpio(partido.equipoLocal)}_vs_${limpio(partido.equipoVisitante)}.pdf`)
    } catch (err) {
      aviso.error(mensajeDeError(err, 'No se pudo crear el acta. Inténtelo de nuevo.'))
    } finally {
      setGenerando(false)
    }
  }

  return (
    <button type="button" onClick={descargar} disabled={generando || !campeonato}
      className="text-xs min-h-9 pointer-coarse:min-h-11 px-3 rounded border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-colors inline-flex items-center gap-1.5 disabled:opacity-50">
      <FileDown size={13} aria-hidden="true" />{generando ? 'Creando acta...' : 'Acta PDF'}
    </button>
  )
}
