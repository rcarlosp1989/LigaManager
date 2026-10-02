import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import PageHeader from '../../components/PageHeader'
import EmptyState from '../../components/EmptyState'
import TabGoleadores from './TabGoleadores'
import TabTarjetas from './TabTarjetas'
import TabSuspensiones from './TabSuspensiones'

const TABS = [
  { key: 'goleadores', label: '⚽ Goleadores' },
  { key: 'tarjetas', label: '🟨 Tarjetas' },
  { key: 'suspensiones', label: '🚫 Suspensiones' },
]

export default function Estadisticas() {
  const [idCampeonato, setIdCampeonato] = useState('')
  const [tab, setTab] = useState('goleadores')

  const { data: campeonatos = [] } = useQuery({
    queryKey: ['campeonatos'],
    queryFn: () => api.get('/campeonatos').then(r => r.data),
  })

  return (
    <div className="p-8">
      <PageHeader title="ESTADÍSTICAS" subtitle="Goleadores, tarjetas y suspensiones por campeonato" />

      <div className="max-w-xl mb-6">
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Campeonato</label>
        <select className="input-field" value={idCampeonato} onChange={e => setIdCampeonato(e.target.value)}>
          <option value="">Selecciona un campeonato...</option>
          {campeonatos.map(c => <option key={c.idCampeonato} value={c.idCampeonato}>{c.nombre} ({c.anio})</option>)}
        </select>
      </div>

      {!idCampeonato ? (
        <EmptyState icon="📈" title="Elige un campeonato" description="Selecciona un campeonato para ver sus estadísticas." />
      ) : (
        <>
          <div className="flex gap-1 mb-4 border-b border-gray-800 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  tab === t.key ? 'border-brand-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'goleadores' && <TabGoleadores idCampeonato={idCampeonato} />}
          {tab === 'tarjetas' && <TabTarjetas idCampeonato={idCampeonato} />}
          {tab === 'suspensiones' && <TabSuspensiones idCampeonato={idCampeonato} />}
        </>
      )}
    </div>
  )
}
