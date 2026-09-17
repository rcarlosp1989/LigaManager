import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api         from '../../services/api'
import PageHeader  from '../../components/PageHeader'
import Modal       from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import EmptyState  from '../../components/EmptyState'

function CampeonatoForm({ onSubmit, loading, error }) {
  const [form, setForm] = useState({
    nombre: '', anio: new Date().getFullYear(),
    fechaInicio: '', fechaFin: '', idTipoPartido: '', idModalidad: ''
  })

  const { data: tipos = [] } = useQuery({
    queryKey: ['tipos-partido'],
    queryFn:  () => api.get('/catalogos/tipos-partido').then(r => r.data),
  })

  const { data: modalidades = [] } = useQuery({
    queryKey: ['modalidades'],
    queryFn:  () => api.get('/catalogos/modalidades').then(r => r.data),
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
          Nombre
        </label>
        <input className="input-field" value={form.nombre} required
          onChange={e => set('nombre', e.target.value)}
          placeholder="Copa Ecuador 2025" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
            Año
          </label>
          <input type="number" className="input-field" value={form.anio} required
            onChange={e => set('anio', parseInt(e.target.value))}
            min="2000" max="2100" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
            Tipo
          </label>
          <select className="input-field" value={form.idTipoPartido} required
            onChange={e => set('idTipoPartido', parseInt(e.target.value))}>
            <option value="">Seleccionar...</option>
            {tipos.map(t => (
              <option key={t.idTipoPartido} value={t.idTipoPartido}>{t.nombre}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
          Modalidad
        </label>
        <select className="input-field" value={form.idModalidad} required
          onChange={e => set('idModalidad', parseInt(e.target.value))}>
          <option value="">Seleccionar...</option>
          {modalidades.map(m => (
            <option key={m.idModalidad} value={m.idModalidad}>{m.nombre}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
            Inicio
          </label>
          <input type="date" className="input-field" value={form.fechaInicio} required
            onChange={e => set('fechaInicio', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
            Fin
          </label>
          <input type="date" className="input-field" value={form.fechaFin} required
            onChange={e => set('fechaFin', e.target.value)} />
        </div>
      </div>
      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400
                        rounded-lg px-4 py-3 text-sm">{error}</div>
      )}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

export default function Campeonatos() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const [modal, setModal]       = useState(null)
  const [formError, setFormError] = useState('')

  const { data: campeonatos = [], isLoading } = useQuery({
    queryKey: ['campeonatos'],
    queryFn:  () => api.get('/campeonatos').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/campeonatos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campeonatos'] })
      setModal(null); setFormError('')
    },
    onError: (err) => setFormError(err.response?.data?.error || 'Error al guardar.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/campeonatos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campeonatos'] }),
    onError: (err) => alert(err.response?.data?.error || 'No se puede eliminar.'),
  })

  return (
    <div className="p-8">
      <PageHeader
        title="CAMPEONATOS"
        subtitle={`${campeonatos.length} registrados`}
        action={
          <button onClick={() => setModal('create')} className="btn-primary">
            + Nuevo Campeonato
          </button>
        }
      />

      {isLoading ? (
        <div className="text-gray-500 text-center py-16">Cargando...</div>
      ) : campeonatos.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="Sin campeonatos"
          description="Crea tu primer campeonato para comenzar a gestionar torneos."
          action={
            <button onClick={() => setModal('create')} className="btn-primary">
              Crear Campeonato
            </button>
          }
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Nombre','Tipo','Año','Equipos','Estado',''].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 uppercase
                                         tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campeonatos.map(c => (
                <tr key={c.idCampeonato} className="table-row">
                  <td className="px-5 py-4">
                    <button
                      onClick={() => navigate(`/campeonatos/${c.idCampeonato}`)}
                      className="text-white font-medium hover:text-brand-400 transition-colors text-left"
                    >
                      {c.nombre}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-gray-400 text-sm">{c.tipoPartido}</td>
                  <td className="px-5 py-4 text-gray-400 text-sm">{c.anio}</td>
                  <td className="px-5 py-4 text-gray-400 text-sm">{c.totalEquipos}</td>
                  <td className="px-5 py-4"><StatusBadge estado={c.estado} /></td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => {
                        if (confirm('¿Eliminar este campeonato?'))
                          deleteMutation.mutate(c.idCampeonato)
                      }}
                      className="text-gray-600 hover:text-red-400 transition-colors text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modal === 'create'}
             onClose={() => { setModal(null); setFormError('') }}
             title="NUEVO CAMPEONATO">
        <CampeonatoForm
          onSubmit={createMutation.mutate}
          loading={createMutation.isPending}
          error={formError}
        />
      </Modal>
    </div>
  )
}
