import { useState, useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import EstadoError from '../../components/EstadoError'
import PageHeader from '../../components/PageHeader'
import EmptyState from '../../components/EmptyState'
import TabPosiciones from './TabPosiciones'
import TabNomina from './TabNomina'
import TabGoleadores from './TabGoleadores'
import TabTarjetas from './TabTarjetas'
import TabSuspensiones from './TabSuspensiones'

const TABS = [
  { key: 'posiciones', label: '📊 Posiciones' },
  { key: 'nomina', label: '📋 Nómina' },
  { key: 'goleadores', label: '⚽ Goleadores' },
  { key: 'tarjetas', label: '🟨 Tarjetas' },
  { key: 'suspensiones', label: '🚫 Suspensiones' },
]

export default function Reportes() {
  const fid = useId()
  const [idCampeonato, setIdCampeonato] = useState('')
  const [tab, setTab] = useState('posiciones')

  const { data: campeonatos = [], isError, refetch, isFetching } = useQuery({
    queryKey: ['campeonatos'],
    queryFn: () => api.get('/campeonatos').then(r => r.data),
  })

  const campeonato = campeonatos.find(c => c.idCampeonato === Number(idCampeonato))

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader title="REPORTES" subtitle="Posiciones, nómina y estadísticas por campeonato, con exportación a Excel y PDF" />

      {isError ? (
        <EstadoError mensaje="No se pudieron cargar los campeonatos." onReintentar={refetch} reintentando={isFetching} />
      ) : (<>
      <div className="max-w-xl mb-6">
        <label htmlFor={`${fid}-c1`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Campeonato</label>
        <select id={`${fid}-c1`} className="input-field" value={idCampeonato} onChange={e => setIdCampeonato(e.target.value)}>
          <option value="">Selecciona un campeonato...</option>
          {campeonatos.map(c => <option key={c.idCampeonato} value={c.idCampeonato}>{c.nombre} ({c.anio})</option>)}
        </select>
      </div>

      {!idCampeonato ? (
        <EmptyState icon="📁" title="Elige un campeonato" description="Selecciona un campeonato para ver sus reportes." />
      ) : (
        <>
          <div className="flex gap-1 mb-4 border-b border-gray-800 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 ${
                  tab === t.key ? 'border-brand-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'posiciones' && <TabPosiciones idCampeonato={idCampeonato} campeonato={campeonato} />}
          {tab === 'nomina' && <TabNomina idCampeonato={idCampeonato} campeonato={campeonato} />}
          {tab === 'goleadores' && <TabGoleadores idCampeonato={idCampeonato} />}
          {tab === 'tarjetas' && <TabTarjetas idCampeonato={idCampeonato} />}
          {tab === 'suspensiones' && <TabSuspensiones idCampeonato={idCampeonato} />}
        </>
      )}
      </>)}
    </div>
  )
}
