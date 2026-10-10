import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import Estadios from '../Estadios'
import Arbitros from '../Arbitros'
import { MapPin, Scale } from 'lucide-react'

const TABS = [
  { key: 'estadios', label: 'Estadios', Icono: MapPin },
  { key: 'oficiales', label: 'Oficiales', Icono: Scale },
]

export default function Mantenimiento() {
  const [tab, setTab] = useState('estadios')

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader title="MANTENIMIENTO" subtitle="Estadios y oficiales" />

      <div className="flex gap-1 mb-4 border-b border-gray-800 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 inline-flex items-center gap-2 ${
              tab === t.key ? 'border-brand-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>
            <t.Icono size={15} aria-hidden="true" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'estadios' && <Estadios />}
      {tab === 'oficiales' && <Arbitros />}
    </div>
  )
}
