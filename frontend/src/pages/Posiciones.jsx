import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'

const COLOR_FORMA = {
  V: 'bg-green-500 text-green-950',
  E: 'bg-yellow-500 text-yellow-950',
  D: 'bg-red-500 text-red-950',
}

function CirculosForma({ forma }) {
  if (!forma || forma.length === 0) return <span className="text-gray-600 text-xs">—</span>
  return (
    <div className="flex items-center gap-1 justify-center">
      {forma.map((r, i) => (
        <span key={i} title={r === 'V' ? 'Victoria' : r === 'E' ? 'Empate' : 'Derrota'}
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${COLOR_FORMA[r]}`}>
          {r}
        </span>
      ))}
    </div>
  )
}

function TablaGrupo({ grupo }) {
  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden mb-6">
      {grupo.grupo && (
        <div className="px-4 py-3 bg-gray-800/30">
          <span className="text-white font-medium">Grupo {grupo.grupo}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-gray-800">
              {['#', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'PTS', 'Forma'].map(h => (
                <th key={h} className="text-xs text-gray-500 uppercase tracking-wider px-3 py-2 text-center first:text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grupo.posiciones.map(p => (
              <tr key={p.idEquipo}
                className={`border-b border-gray-800/50 transition-colors ${
                  p.clasificado ? 'bg-green-900/10 hover:bg-green-900/20' : 'hover:bg-gray-800/30'
                }`}>
                <td className="px-3 py-2 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">{p.posicion}</span>
                    {p.clasificado && <span className="text-green-400 text-xs">✓</span>}
                  </div>
                </td>
                <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{p.equipo}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.pj}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.pg}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.pe}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.pp}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.gf}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.gc}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.dg}</td>
                <td className="px-3 py-2 text-white font-semibold text-center">{p.pts}</td>
                <td className="px-3 py-2"><CirculosForma forma={p.forma} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Posiciones() {
  const [idCampeonato, setIdCampeonato] = useState('')
  const [idGrupo, setIdGrupo] = useState('')

  const { data: campeonatos = [] } = useQuery({
    queryKey: ['campeonatos'],
    queryFn: () => api.get('/campeonatos').then(r => r.data),
  })

  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos', idCampeonato],
    queryFn: () => api.get(`/campeonatos/${idCampeonato}/grupos`).then(r => r.data),
    enabled: !!idCampeonato,
  })

  const { data: tabla, isLoading, isError } = useQuery({
    queryKey: ['estadisticas-posiciones', idCampeonato, idGrupo],
    queryFn: () => api.get(`/campeonatos/${idCampeonato}/estadisticas/posiciones`, {
      params: idGrupo ? { idGrupo } : {},
    }).then(r => r.data),
    enabled: !!idCampeonato,
  })

  const handleCampeonato = (v) => { setIdCampeonato(v); setIdGrupo('') }

  return (
    <div className="p-8">
      <PageHeader title="TABLA DE POSICIONES" subtitle="Posiciones por campeonato, con la forma de los últimos 5 partidos" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-w-xl">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Campeonato</label>
          <select className="input-field" value={idCampeonato} onChange={e => handleCampeonato(e.target.value)}>
            <option value="">Selecciona un campeonato...</option>
            {campeonatos.map(c => <option key={c.idCampeonato} value={c.idCampeonato}>{c.nombre} ({c.anio})</option>)}
          </select>
        </div>
        {grupos.length > 0 && (
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Grupo</label>
            <select className="input-field" value={idGrupo} onChange={e => setIdGrupo(e.target.value)}>
              <option value="">Todos los grupos</option>
              {grupos.map(g => <option key={g.idGrupo} value={g.idGrupo}>Grupo {g.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      {!idCampeonato && (
        <EmptyState icon="📊" title="Elige un campeonato" description="Selecciona un campeonato para ver su tabla de posiciones." />
      )}

      {idCampeonato && isLoading && (
        <p className="text-gray-500 text-sm text-center py-10">Cargando posiciones...</p>
      )}

      {idCampeonato && isError && (
        <p className="text-red-400 text-sm text-center py-10">No se pudo cargar la tabla de posiciones.</p>
      )}

      {idCampeonato && !isLoading && !isError && (!tabla?.grupos?.length || tabla.grupos.every(g => g.posiciones.length === 0)) && (
        <EmptyState icon="⚽" title="Aún no hay partidos jugados" description="La tabla aparecerá cuando se registren resultados en este campeonato." />
      )}

      {idCampeonato && !isLoading && !isError && tabla?.grupos?.some(g => g.posiciones.length > 0) && (
        <>
          {tabla.grupos.filter(g => g.posiciones.length > 0).map(g => (
            <TablaGrupo key={g.idGrupo ?? 'sin-grupo'} grupo={g} />
          ))}

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-2">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-900/40 border border-green-700 inline-block" /> Clasificado</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-green-500 inline-flex items-center justify-center text-[8px] text-green-950 font-bold">V</span> Victoria</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-yellow-500 inline-flex items-center justify-center text-[8px] text-yellow-950 font-bold">E</span> Empate</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-red-500 inline-flex items-center justify-center text-[8px] text-red-950 font-bold">D</span> Derrota</span>
          </div>
        </>
      )}
    </div>
  )
}
