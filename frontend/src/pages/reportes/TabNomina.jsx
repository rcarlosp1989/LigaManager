import { useState, useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import EstadoError from '../../components/EstadoError'
import EmptyState from '../../components/EmptyState'
import BotonExportar from '../../components/BotonExportar'

const COLUMNAS_EXPORT = [
  { titulo: 'Dorsal', ancho: 8 }, { titulo: 'Apellido', ancho: 20 }, { titulo: 'Nombre', ancho: 20 },
  { titulo: 'Cédula', ancho: 14 }, { titulo: 'Posición', ancho: 20 }, { titulo: 'Edad', ancho: 8 },
  { titulo: 'En el equipo desde', ancho: 16 },
]

export default function TabNomina({ idCampeonato, campeonato }) {
  const fid = useId()
  const [idEquipo, setIdEquipo] = useState('')

  const { data: equipos = [], isError: errorEquipos, refetch: recargarEquipos, isFetching: cargandoEquipos } = useQuery({
    queryKey: ['campeonato-equipos-select', idCampeonato],
    queryFn: () => api.get(`/campeonatos/${idCampeonato}`).then(r => r.data.equipos ?? []),
    enabled: !!idCampeonato,
  })

  const { data: equipoDetalle, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['equipo-nomina', idEquipo],
    queryFn: () => api.get(`/equipos/${idEquipo}`).then(r => r.data),
    enabled: !!idEquipo,
  })

  const equipoNombre = equipos.find(e => e.idEquipo === Number(idEquipo))?.nombre
  const jugadores = [...(equipoDetalle?.jugadores ?? [])].sort((a, b) => {
    if (a.dorsal == null && b.dorsal == null) return 0
    if (a.dorsal == null) return 1
    if (b.dorsal == null) return -1
    return a.dorsal - b.dorsal
  })

  const filasExport = jugadores.map(j => ([
    j.dorsal ?? '', j.apellido, j.nombre, j.cedula, j.posicion ?? 'Sin posición', j.edad, j.fechaDesde,
  ]))

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <label htmlFor={`${fid}-c1`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Equipo</label>
          <select id={`${fid}-c1`} className="input-field w-64" value={idEquipo} onChange={e => setIdEquipo(e.target.value)}>
            <option value="">Selecciona un equipo...</option>
            {equipos.map(e => <option key={e.idEquipo} value={e.idEquipo}>{e.nombre}</option>)}
          </select>
          {errorEquipos && (
            <div className="mt-2">
              <EstadoError compacto mensaje="No se pudo cargar la lista de equipos." onReintentar={recargarEquipos} reintentando={cargandoEquipos} />
            </div>
          )}
        </div>
        {idEquipo && (
          <BotonExportar
            titulo={`Nómina de jugadores — ${equipoNombre ?? ''}`}
            subtitulo={`${campeonato?.nombre ?? ''} · ${new Date().toLocaleDateString('es-EC')}`}
            columnas={COLUMNAS_EXPORT}
            filas={filasExport}
            archivoBase={`nomina_${(equipoNombre ?? 'equipo').replace(/\s+/g, '_')}`}
          />
        )}
      </div>

      {!idEquipo && (
        <EmptyState icon="📋" title="Elige un equipo" description="Selecciona un equipo inscrito en este campeonato para ver su nómina." />
      )}

      {idEquipo && isLoading && (
        <p className="text-gray-500 text-sm text-center py-10">Cargando nómina...</p>
      )}

      {idEquipo && isError && (
        <EstadoError mensaje="No se pudo cargar la nómina de este equipo." onReintentar={refetch} reintentando={isFetching} />
      )}

      {idEquipo && !isLoading && !isError && jugadores.length === 0 && (
        <EmptyState icon="👤" title="Sin jugadores" description="Este equipo todavía no tiene jugadores registrados." />
      )}

      {idEquipo && !isLoading && !isError && jugadores.length > 0 && (
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-800">
                  {['#', 'Jugador', 'Cédula', 'Posición', 'Edad', 'En el equipo desde'].map(h => (
                    <th key={h} className="text-xs text-gray-500 uppercase tracking-wider px-3 py-2 text-center first:text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jugadores.map(j => (
                  <tr key={j.idJugador} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 py-2 text-gray-400 text-xs text-left">{j.dorsal ?? '—'}</td>
                    <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{j.apellido}, {j.nombre}</td>
                    <td className="px-3 py-2 text-gray-400 text-center">{j.cedula}</td>
                    <td className="px-3 py-2 text-gray-400 text-center">{j.posicion ?? 'Sin posición'}</td>
                    <td className="px-3 py-2 text-gray-400 text-center">{j.edad}</td>
                    <td className="px-3 py-2 text-gray-500 text-center text-xs">{j.fechaDesde}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
