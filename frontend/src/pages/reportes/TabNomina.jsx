import { useState, useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import EstadoError from '../../components/EstadoError'
import EmptyState from '../../components/EmptyState'
import BotonExportar from '../../components/BotonExportar'
import TablaDesplazable from '../../components/TablaDesplazable'
import { ClipboardList, User } from 'lucide-react'
import { textoDocumento } from '../../utils/documento'
import FotoJugador from '../../components/FotoJugador'

const COLUMNAS_EXPORT = [
  { titulo: 'N.º', ancho: 6 }, { titulo: 'Dorsal', ancho: 8 }, { titulo: 'Apellido', ancho: 20 }, { titulo: 'Nombre', ancho: 20 },
  { titulo: 'Documento', ancho: 22 }, { titulo: 'Posición', ancho: 20 }, { titulo: 'Edad', ancho: 8 },
  { titulo: 'En el equipo desde', ancho: 16 },
]

// base: dónde leer el campeonato; rutaEquipo: dónde leer la nómina de un equipo.
// idEquipoPropio (dirigente): muestra solo la nómina de ese equipo, sin selector y sin la
// columna de documento (el servidor no se lo envía).
// El dirigente usa sus rutas: el servidor solo le envía los documentos de su propio equipo
// (idEquipoPropio), así que tampoco aparecen en el PDF ni en el Excel de otros equipos.
export default function TabNomina({
  idCampeonato, campeonato,
  base = `/campeonatos/${idCampeonato}`,
  rutaEquipo = (id) => `/equipos/${id}`,
  idEquipoPropio = null,
}) {
  const fid = useId()
  const [idEquipo, setIdEquipo] = useState(idEquipoPropio ? String(idEquipoPropio) : '')

  const { data: equipos = [], isError: errorEquipos, refetch: recargarEquipos, isFetching: cargandoEquipos } = useQuery({
    queryKey: ['campeonato-equipos-select', idCampeonato, base],
    queryFn: () => api.get(base).then(r => r.data.equipos ?? []),
    enabled: !!idCampeonato,
  })

  const { data: equipoDetalle, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['equipo-nomina', idEquipo, base],
    queryFn: () => api.get(rutaEquipo(idEquipo)).then(r => r.data),
    enabled: !!idEquipo,
  })

  const equipoNombre = equipos.find(e => e.idEquipo === Number(idEquipo))?.nombre
  const jugadores = [...(equipoDetalle?.jugadores ?? [])].sort((a, b) => {
    if (a.dorsal == null && b.dorsal == null) return 0
    if (a.dorsal == null) return 1
    if (b.dorsal == null) return -1
    return a.dorsal - b.dorsal
  })

  const conDocumento = !idEquipoPropio
  const columnasExport = conDocumento ? COLUMNAS_EXPORT : COLUMNAS_EXPORT.filter(c => c.titulo !== 'Documento')
  // N.º: orden en la lista (1, 2, 3…), para contar los jugadores; no es el dorsal.
  const filasExport = jugadores.map((j, i) => ([
    i + 1, j.dorsal ?? '', j.apellido, j.nombre,
    ...(conDocumento ? [textoDocumento(j.tipoIdentificacion, j.cedula)] : []),
    j.posicion ?? 'Sin posición', j.edad, j.fechaDesde,
  ]))

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        {idEquipoPropio ? (
          // Dirigente: solo la nómina de su equipo, sin selector.
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">Equipo</p>
            <p className="text-white font-medium">{equipoNombre ?? 'Su equipo'}</p>
          </div>
        ) : (
        <div>
          <label htmlFor={`${fid}-c1`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Equipo</label>
          <select id={`${fid}-c1`} className="input-field w-64" value={idEquipo} onChange={e => setIdEquipo(e.target.value)}>
            <option value="">Seleccione un equipo...</option>
            {equipos.map(e => <option key={e.idEquipo} value={e.idEquipo}>{e.nombre}</option>)}
          </select>
          {errorEquipos && (
            <div className="mt-2">
              <EstadoError compacto mensaje="No se pudo cargar la lista de equipos." onReintentar={recargarEquipos} reintentando={cargandoEquipos} />
            </div>
          )}
        </div>
        )}
        {idEquipo && (
          <BotonExportar
            titulo={`Nómina de jugadores — ${equipoNombre ?? ''}`}
            subtitulo={`${campeonato?.nombre ?? ''} · ${jugadores.length} ${jugadores.length === 1 ? 'jugador' : 'jugadores'} · ${new Date().toLocaleDateString('es-EC')}`}
            columnas={columnasExport}
            filas={filasExport}
            archivoBase={`nomina_${(equipoNombre ?? 'equipo').replace(/\s+/g, '_')}`}
            logoUrl={equipoDetalle?.logoUrl}
            fotos={jugadores.map(j => j.fotoUrl ?? null)}
            iniciales={jugadores.map(j => `${j.nombre?.[0] ?? ''}${j.apellido?.[0] ?? ''}`.toUpperCase())}
          />
        )}
      </div>

      {!idEquipo && (
        <EmptyState icon={ClipboardList} title="Elija un equipo" description="Seleccione un equipo inscrito en este campeonato para ver su nómina." />
      )}

      {idEquipo && isLoading && (
        <p className="text-gray-500 text-sm text-center py-10">Cargando nómina...</p>
      )}

      {idEquipo && isError && (
        <EstadoError mensaje="No se pudo cargar la nómina de este equipo." onReintentar={refetch} reintentando={isFetching} />
      )}

      {idEquipo && !isLoading && !isError && jugadores.length === 0 && (
        <EmptyState icon={User} title="Sin jugadores" description="Este equipo todavía no tiene jugadores registrados." />
      )}

      {idEquipo && !isLoading && !isError && jugadores.length > 0 && (
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <TablaDesplazable>
            {/* N.º cuenta los jugadores (1, 2, 3…) y va fijo a la izquierda, en gris; el dorsal va en
                su propia columna, en el círculo de color, para no confundirlos. */}
            <table className={`tabla w-full text-sm ${conDocumento ? 'min-w-[720px]' : 'min-w-[600px]'}`}>
              <thead>
                <tr className="border-b border-gray-800">
                  <th scope="col" className="fija w-12 min-w-12 px-3 py-2 text-left text-xs uppercase tracking-wider" title="Número de orden en la nómina">N.º</th>
                  <th scope="col" className="fija fija-2 fija-borde px-3 py-2 text-left text-xs uppercase tracking-wider" style={{ '--ancho-fija-1': '3rem' }}>Jugador</th>
                  <th scope="col" className="px-3 py-2 text-center text-xs uppercase tracking-wider">Dorsal</th>
                  {[...(conDocumento ? ['Documento'] : []), 'Posición', 'Edad', 'En el equipo desde'].map(h => (
                    <th key={h} scope="col" className="px-3 py-2 text-center text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jugadores.map((j, i) => (
                  <tr key={j.idJugador} className="border-b border-gray-800/50">
                    <td className="fija w-12 min-w-12 px-3 py-2 text-left text-sm tabular-nums text-gray-500">{i + 1}</td>
                    <th scope="row" className="fija fija-2 fija-borde px-3 py-2 text-left font-medium text-white" style={{ '--ancho-fija-1': '3rem' }}>
                      <span className="flex items-center gap-2" title={`${j.apellido}, ${j.nombre}`}><FotoJugador nombre={`${j.apellido}, ${j.nombre}`} fotoUrl={j.fotoUrl} tamano={36} /><span className="min-w-0 max-w-[8rem] truncate sm:max-w-[16rem]">{j.apellido}, {j.nombre}</span></span>
                    </th>
                    <td className="px-3 py-2 text-center">
                      {j.dorsal != null
                        ? <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-bold tabular-nums text-brand-300 ring-1 ring-inset ring-brand-500/40 bg-brand-500/10" aria-label={`Dorsal ${j.dorsal}`}>{j.dorsal}</span>
                        : <span className="text-gray-600" aria-label="Sin dorsal">—</span>}
                    </td>
                    {conDocumento && (
                    <td className="px-3 py-2 text-gray-400 text-center">
                      {j.tipoIdentificacion === 'Pendiente'
                        ? <span className="rounded px-1.5 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/40 bg-amber-400/10">Pendiente</span>
                        : textoDocumento(j.tipoIdentificacion, j.cedula)}
                    </td>
                    )}
                    <td className="px-3 py-2 text-gray-400 text-center">{j.posicion ?? 'Sin posición'}</td>
                    <td className="px-3 py-2 text-gray-400 text-center">{j.edad}</td>
                    <td className="px-3 py-2 text-gray-500 text-center text-xs">{j.fechaDesde}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablaDesplazable>
          <p className="border-t border-gray-800 px-3 py-2 text-sm text-gray-400">
            Total: <span className="font-semibold text-white">{jugadores.length}</span> {jugadores.length === 1 ? 'jugador' : 'jugadores'}
          </p>
        </div>
      )}
    </div>
  )
}
