import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api        from '../../services/api'
import PageHeader from '../../components/PageHeader'
import Modal      from '../../components/Modal'
import EmptyState from '../../components/EmptyState'

function EquipoForm({ onSubmit, loading, error }) {
  const [form, setForm] = useState({ nombre: '', idPais: '' })
  const { data: paises = [] } = useQuery({
    queryKey: ['paises'],
    queryFn:  () => api.get('/catalogos/paises').then(r => r.data),
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
          Nombre del equipo
        </label>
        <input className="input-field" value={form.nombre} required
          onChange={e => set('nombre', e.target.value)}
          placeholder="Deportivo Quito FC" />
      </div>
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
          País
        </label>
        <select className="input-field" value={form.idPais} required
          onChange={e => set('idPais', parseInt(e.target.value))}>
          <option value="">Seleccionar país...</option>
          {paises.map(p => (
            <option key={p.idPais} value={p.idPais}>{p.nombre}</option>
          ))}
        </select>
      </div>
      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400
                        rounded-lg px-4 py-3 text-sm">{error}</div>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Guardando...' : 'Guardar Equipo'}
      </button>
    </form>
  )
}

export default function Equipos() {
  const queryClient = useQueryClient()
  const [modal, setModal]         = useState(false)
  const [formError, setFormError] = useState('')

  const { data: equipos = [], isLoading } = useQuery({
    queryKey: ['equipos'],
    queryFn:  () => api.get('/equipos').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/equipos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
      setModal(false); setFormError('')
    },
    onError: (err) => setFormError(err.response?.data?.error || 'Error al guardar.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/equipos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipos'] }),
    onError: (err) => alert(err.response?.data?.error || 'No se puede eliminar.'),
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="EQUIPOS"
        subtitle={`${equipos.length} registrados`}
        action={
          <button onClick={() => setModal(true)} className="btn-primary">
            + Nuevo Equipo
          </button>
        }
      />

      {isLoading ? (
        <div className="text-gray-500 text-center py-16">Cargando...</div>
      ) : equipos.length === 0 ? (
        <EmptyState icon="🛡️" title="Sin equipos"
          description="Registra el primer equipo para comenzar."
          action={
            <button onClick={() => setModal(true)} className="btn-primary">
              Crear Equipo
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipos.map(e => (
            <div key={e.idEquipo} className="card flex items-start justify-between group">
              <div>
                <h3 className="text-white font-semibold">{e.nombre}</h3>
                <p className="text-gray-400 text-sm mt-1">🌍 {e.pais}</p>
                <p className="text-gray-500 text-xs mt-2">
                  {e.totalJugadores} jugador{e.totalJugadores !== 1 ? 'es' : ''} activo{e.totalJugadores !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar ${e.nombre}?`)) deleteMutation.mutate(e.idEquipo)
                }}
                className="text-gray-500 hover:text-red-400 transition-colors text-sm -mr-2 -mt-2 px-2 py-1"
                aria-label={`Eliminar ${e.nombre}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => { setModal(false); setFormError('') }}
             title="NUEVO EQUIPO">
        <EquipoForm onSubmit={createMutation.mutate}
          loading={createMutation.isPending} error={formError} />
      </Modal>
    </div>
  )
}