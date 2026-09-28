import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import UbicacionSelector from '../components/UbicacionSelector'

export default function Estadios() {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nombre: '', idPais: '', idProvincia: '', idCanton: '' })
  const [error, setError] = useState('')
  const { data: estadios = [] } = useQuery({ queryKey: ['estadios'], queryFn: () => api.get('/estadios').then(r => r.data) })
  const mutation = useMutation({
    mutationFn: data => api.post('/estadios', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['estadios'] }); setModal(false); setForm({ nombre: '', idPais: '', idProvincia: '', idCanton: '' }); setError('') },
    onError: err => setError(err.response?.data?.error || 'Error al registrar estadio.'),
  })
  return <div className="p-8">
    <PageHeader title="ESTADIOS" subtitle={`${estadios.length} disponibles`} action={<button className="btn-primary" onClick={() => setModal(true)}>+ Nuevo estadio</button>} />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {estadios.map(e => <div className="card" key={e.idEstadio}><h3 className="text-white font-semibold">{e.nombre}</h3><p className="text-gray-400 text-sm mt-1">{[e.canton, e.provincia, e.pais].filter(Boolean).join(', ')}</p></div>)}
    </div>
    <Modal isOpen={modal} onClose={() => { setModal(false); setError('') }} title="NUEVO ESTADIO">
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); mutation.mutate({ nombre: form.nombre, idPais: parseInt(form.idPais), idCanton: form.idCanton ? parseInt(form.idCanton) : null }) }}>
        <input className="input-field" placeholder="Nombre del estadio" required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
        <UbicacionSelector value={{ idPais: form.idPais, idProvincia: form.idProvincia, idCanton: form.idCanton }} onChange={u => setForm({ ...form, ...u })} />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : 'Guardar estadio'}</button>
      </form>
    </Modal>
  </div>
}
