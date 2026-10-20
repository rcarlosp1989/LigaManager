import { useState, useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import EstadoError from '../../components/EstadoError'
import EmptyState from '../../components/EmptyState'
import BotonExportar from '../../components/BotonExportar'
import TablaPosiciones from '../../components/TablaPosiciones'
import { Trophy } from 'lucide-react'
import { useLogosEquipos } from '../../utils/logos'

// logos: Map idEquipo → logo. Si no llega (organizador), se piden los del organizador.
function TablaGrupo({ grupo, logos: logosDados = null }) {
  const logosOrganizador = useLogosEquipos(!logosDados)
  const logos = logosDados ?? logosOrganizador
  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden mb-6">
      {grupo.grupo && (
        <div className="px-4 py-3 bg-gray-800/30">
          <span className="text-white font-medium">Grupo {grupo.grupo}</span>
        </div>
      )}
      <TablaPosiciones posiciones={grupo.posiciones} logos={logos} conForma />
    </div>
  )
}

const COLUMNAS_EXPORT = [
  { titulo: 'Grupo', ancho: 12 }, { titulo: '#', ancho: 6 }, { titulo: 'Equipo', ancho: 24 },
  { titulo: 'PJ', ancho: 6 }, { titulo: 'PG', ancho: 6 }, { titulo: 'PE', ancho: 6 }, { titulo: 'PP', ancho: 6 },
  { titulo: 'GF', ancho: 6 }, { titulo: 'GC', ancho: 6 }, { titulo: 'DG', ancho: 6 }, { titulo: 'PTS', ancho: 6 },
  { titulo: 'Clasificado', ancho: 12 }, { titulo: 'Forma (reciente → antiguo)', ancho: 20 },
]

// base: dónde leer los datos (organizador: /campeonatos/{id}; dirigente: /dirigente/campeonatos/{id}).
export default function TabPosiciones({ idCampeonato, campeonato, base = `/campeonatos/${idCampeonato}`, logos = null }) {
  const fid = useId()
  const [idGrupo, setIdGrupo] = useState('')

  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos', idCampeonato, base],
    queryFn: () => api.get(`${base}/grupos`).then(r => r.data),
    enabled: !!idCampeonato,
  })

  const { data: tabla, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['estadisticas-posiciones', idCampeonato, idGrupo, base],
    queryFn: () => api.get(`${base}/estadisticas/posiciones`, {
      params: idGrupo ? { idGrupo } : {},
    }).then(r => r.data),
    enabled: !!idCampeonato,
  })

  const gruposConDatos = tabla?.grupos?.filter(g => g.posiciones.length > 0) ?? []
  const filasExport = gruposConDatos.flatMap(g => g.posiciones.map(p => ([
    g.grupo ?? '—', p.posicion, p.equipo, p.pj, p.pg, p.pe, p.pp, p.gf, p.gc, p.dg, p.pts,
    p.clasificado ? 'Sí' : 'No', (p.forma ?? []).join(', '),
  ])))

  if (isLoading) return <p className="text-gray-500 text-sm text-center py-10">Cargando posiciones...</p>
  if (isError) return <EstadoError mensaje="No se pudo cargar la tabla de posiciones." onReintentar={refetch} reintentando={isFetching} />

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        {grupos.length > 0 ? (
          <div>
            <label htmlFor={`${fid}-c1`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Grupo</label>
            <select id={`${fid}-c1`} className="input-field w-48" value={idGrupo} onChange={e => setIdGrupo(e.target.value)}>
              <option value="">Todos los grupos</option>
              {grupos.map(g => <option key={g.idGrupo} value={g.idGrupo}>Grupo {g.nombre}</option>)}
            </select>
          </div>
        ) : <div />}
        <BotonExportar
          titulo={`Tabla de posiciones — ${campeonato?.nombre ?? ''}`}
          subtitulo={new Date().toLocaleDateString('es-EC')}
          columnas={COLUMNAS_EXPORT}
          filas={filasExport}
          archivoBase={`posiciones_${(campeonato?.nombre ?? 'campeonato').replace(/\s+/g, '_')}`}
        />
      </div>

      {gruposConDatos.length === 0 ? (
        <EmptyState icon={Trophy} title="Aún no hay partidos jugados" description="La tabla aparecerá cuando se registren resultados en este campeonato." />
      ) : (
        <>
          {gruposConDatos.map(g => (
            <TablaGrupo key={g.idGrupo ?? 'sin-grupo'} grupo={g} logos={logos} />
          ))}

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-2">
            <span className="flex items-center gap-1.5"><span className="inline-flex h-4 w-4 items-center justify-center rounded bg-brand-500/15 text-[9px] font-semibold text-brand-300 ring-1 ring-inset ring-brand-500/40">1</span> Clasificado</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-green-500 inline-flex items-center justify-center text-[8px] text-green-950 font-bold">V</span> Victoria</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-yellow-500 inline-flex items-center justify-center text-[8px] text-yellow-950 font-bold">E</span> Empate</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-red-500 inline-flex items-center justify-center text-[8px] text-red-950 font-bold">D</span> Derrota</span>
          </div>
        </>
      )}
    </div>
  )
}
